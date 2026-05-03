"""
# 🏥 Famplus AI Inference Engine (v4.0 — Advanced Health Support Prototype)
# ------------------------------------------------------------------------------
# Author: Sayak Mandal
# Version: 4.0 (Vitals-Aware + SciSpacy NER + Gemma3 Reasoning)
#
# This microservice acts as the 'Cerebellum' of the Famplus ecosystem. It exposes
# high-performance FastAPI endpoints for real-time symptom analysis and wellness
# scoring.
#
# ## 🏗️ Architectural Layers:
# 1. **NLP Gateway**: Uses SciSpacy (en_core_sci_sm) for Biomedical Named Entity 
#    Recognition (NER) to extract clinical symptoms from natural language.
# 2. **Context Engine**: Injects real-time dashboard vitals (HR, BP, Age) to 
#    provide objective evidence for the ML model.
# 3. **Inference Core**: Histogram-based Gradient Boosting (XGBoost/HGB) classifier 
#    that maps symptoms+vitals to specialist recommendations.
# 4. **Clinical Reasoning**: Local Gemma3 LLM integration for deep contextual advice.
# 5. **Safety Guardrails**: Implements "General Physician First" logic and emergency 
#    hallmark overrides to ensure user safety.
#
# ## 🔒 Safety Philosophy:
# - Conservative Thresholding: High-severity conditions require extreme confidence.
# - Emergency Bypasses: Definitive markers (e.g. crushing chest pain) bypass all gates.
# - Specialist-Only: The engine recommends doctors, NOT definitive diagnoses.
# ------------------------------------------------------------------------------
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
import joblib
import os
import re
from fastapi.middleware.cors import CORSMiddleware
import httpx
import time

# ==============================================================================
# SECTION 1: GLOBAL CONFIGURATION & ASSET REGISTRY
# ==============================================================================

# ── SciSpacy Medical NLP ───────────────────────────────────────────────────────
# SciSpacy provides a biomedical NLP pipeline (Named Entity Recognition) that
# understands clinical text far better than keyword matching alone.
# The en_core_sci_sm model (~15MB in RAM) recognizes medical entities like
# "chest pain", "shortness of breath", "nausea" directly from natural language.
# ==============================================================================
import spacy
from thefuzz import fuzz

try:
    nlp_med = spacy.load("en_core_sci_sm")
    print("✅ SciSpacy medical NLP model loaded (en_core_sci_sm)")
except OSError:
    nlp_med = None
    print(
        "⚠️  SciSpacy model 'en_core_sci_sm' not found. "
        "Falling back to alias-only matching. Install with:\n"
        "   pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/"
        "releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz"
    )

app = FastAPI(title="Famplus AI Engine", version="4.0")

# ── CORS ───────────────────────────────────────────────────────────────────────
# Internal communication only. Restrict in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Loading ──────────────────────────────────────────────────────────────
MODEL_PATH    = 'model.joblib'
METADATA_PATH = 'metadata.joblib'

model           = None
metadata        = None
vitals_scaler   = None   # StandardScaler for vitals normalization (loaded from metadata)
vitals_columns  = ['Age', 'HeartRate', 'SystolicBP', 'DiastolicBP']  # default
model_type      = 'naive_bayes'  # will be overridden if metadata says 'gradient_boosting' or 'xgboost'

if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
    try:
        model    = joblib.load(MODEL_PATH)
        metadata = joblib.load(METADATA_PATH)
        # Load v2 (XGBoost) specific metadata if present
        vitals_scaler  = metadata.get('vitals_scaler', None)
        vitals_columns = metadata.get('vitals_columns', ['Age', 'HeartRate', 'SystolicBP', 'DiastolicBP'])
        model_type     = metadata.get('model_type', 'naive_bayes')
        print(f"✅ ML Model loaded successfully (type={model_type})")
        if vitals_scaler is not None:
            print(f"   ✅ Vitals scaler loaded (columns={vitals_columns})")
        else:
            print(f"   ⚠️  No vitals scaler — running in symptom-only mode")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
else:
    print("⚠️  ML Model not found. Please run generate_synthetic_data.py then train_model.py first.")

# ── Ollama LLM Configuration ──────────────────────────────────────────────────
# Ollama provides a local LLM (gemma3:4b) for superior clinical reasoning.
# The existing Gradient Boosting model serves as an automatic fallback when
# Ollama is unavailable.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_TIMEOUT = 60  # Maximum seconds to wait for LLM response
OLLAMA_CHECK_INTERVAL = 60  # Seconds between availability checks

_ollama_available: Optional[bool] = None
_ollama_last_check: float = 0


# ══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION — Conservative Prediction Thresholds
# ══════════════════════════════════════════════════════════════════════════════

# Diseases considered "scary" that must NOT be shown unless confidence is
# above SCARY_CONFIDENCE_THRESHOLD AND the user has at least one required marker.
SCARY_DISEASES: Dict[str, List[str]] = {
    'Paralysis (brain hemorrhage)': ['weakness_of_one_body_side', 'altered_sensorium', 'slurred_speech', 'loss_of_balance'],
    'Heart attack':                 ['chest_pain', 'breathlessness', 'palpitations', 'fast_heart_rate',
                                     'crushing_chest_pain', 'left_arm_pain', 'jaw_pain', 'cold_sweat',
                                     'chest_tightness', 'sudden_chest_pain'],
    'AIDS':                         ['high_fever', 'fatigue', 'weight_loss', 'extra_marital_contacts'],
    'Tuberculosis':                 ['blood_in_sputum', 'chest_pain', 'cough', 'rusty_sputum'],
    'Dengue':                       ['high_fever', 'pain_behind_the_eyes', 'red_spots_over_body'],
    'Malaria':                      ['high_fever', 'shivering', 'chills', 'sweating'],
    'Hepatitis B':                  ['receiving_blood_transfusion', 'receiving_unsterile_injections', 'yellowing_of_eyes'],
    'Hepatitis C':                  ['receiving_blood_transfusion', 'receiving_unsterile_injections'],
    'Hepatitis D':                  ['receiving_blood_transfusion', 'receiving_unsterile_injections'],
    'Coma':                         ['altered_sensorium', 'coma'],
}

# ══════════════════════════════════════════════════════════════════════════════
#  EMERGENCY HALLMARK OVERRIDES
#  When a user presents definitive clinical markers for a life-threatening
#  condition, the safety gate is BYPASSED entirely. This prevents the scenario
#  where true emergencies (e.g., crushing chest pain + left arm pain) get
#  downgraded to "Typhoid 9%" because the model's confidence is low.
#
#  Each override requires:
#    - definitive_markers: Symptoms that are highly specific to this emergency
#    - supporting_markers: Symptoms that are common in this emergency
#    - min_definitive:     Minimum # of definitive markers required
#    - min_total:          Minimum # of total markers (definitive + supporting)
#    - override_confidence: The confidence % to force when the override fires
# ══════════════════════════════════════════════════════════════════════════════
EMERGENCY_OVERRIDES: Dict[str, dict] = {
    # ── Cardiac Emergency ─────────────────────────────────────────────────
    'Heart attack': {
        'definitive_markers': [
            'crushing_chest_pain', 'left_arm_pain', 'jaw_pain',
            'cold_sweat', 'sudden_chest_pain', 'chest_tightness',
        ],
        'supporting_markers': [
            'chest_pain', 'breathlessness', 'palpitations',
            'fast_heart_rate', 'sweating', 'nausea', 'vomiting',
        ],
        'min_definitive': 1,   # Need at least 1 hallmark cardiac symptom
        'min_total':      2,   # Plus at least 1 more supporting symptom
        'override_confidence': 85,
    },

    # ── Stroke / Brain Hemorrhage ─────────────────────────────────────────
    'Paralysis (brain hemorrhage)': {
        'definitive_markers': [
            'weakness_of_one_body_side', 'slurred_speech',
            'altered_sensorium',
        ],
        'supporting_markers': [
            'loss_of_balance', 'headache', 'vomiting',
            'blurred_and_distorted_vision', 'dizziness',
        ],
        'min_definitive': 1,
        'min_total':      2,
        'override_confidence': 85,
    },

    # ── Dengue Hemorrhagic ────────────────────────────────────────────────
    'Dengue': {
        'definitive_markers': [
            'pain_behind_the_eyes', 'red_spots_over_body',
        ],
        'supporting_markers': [
            'high_fever', 'joint_pain', 'muscle_pain',
            'nausea', 'vomiting', 'fatigue', 'skin_rash',
        ],
        'min_definitive': 1,
        'min_total':      3,   # Dengue needs more evidence (fever + eye pain + skin)
        'override_confidence': 80,
    },

    # ── Malaria ───────────────────────────────────────────────────────────
    'Malaria': {
        'definitive_markers': [
            'shivering', 'chills',
        ],
        'supporting_markers': [
            'high_fever', 'sweating', 'headache', 'nausea',
            'vomiting', 'muscle_pain', 'fatigue',
        ],
        'min_definitive': 1,
        'min_total':      3,   # High fever + chills + sweating = classic triad
        'override_confidence': 78,
    },

    # ── Tuberculosis ─────────────────────────────────────────────────────
    'Tuberculosis': {
        'definitive_markers': [
            'blood_in_sputum', 'rusty_sputum',
        ],
        'supporting_markers': [
            'cough', 'chest_pain', 'high_fever', 'fatigue',
            'weight_loss', 'breathlessness', 'phlegm',
        ],
        'min_definitive': 1,
        'min_total':      3,
        'override_confidence': 80,
    },

    # ── Pneumonia ─────────────────────────────────────────────────────────
    'Pneumonia': {
        'definitive_markers': [
            'rusty_sputum', 'blood_in_sputum',
        ],
        'supporting_markers': [
            'high_fever', 'breathlessness', 'cough', 'chest_pain',
            'phlegm', 'chills', 'fatigue', 'sweating',
        ],
        'min_definitive': 0,   # Pneumonia doesn't have unique-only markers
        'min_total':      4,   # Needs a strong cluster: fever + breathless + cough + chest pain
        'override_confidence': 75,
    },

    # ── Hepatitis B ───────────────────────────────────────────────────────
    'Hepatitis B': {
        'definitive_markers': [
            'receiving_blood_transfusion', 'receiving_unsterile_injections',
        ],
        'supporting_markers': [
            'yellowing_of_eyes', 'yellowish_skin', 'dark_urine',
            'fatigue', 'loss_of_appetite', 'nausea', 'abdominal_pain',
        ],
        'min_definitive': 1,
        'min_total':      2,
        'override_confidence': 78,
    },

    # ── Diabetic Emergency (Hypoglycemia) ─────────────────────────────────
    'Hypoglycemia': {
        'definitive_markers': [
            'irregular_sugar_level',
        ],
        'supporting_markers': [
            'sweating', 'dizziness', 'palpitations', 'fatigue',
            'anxiety', 'blurred_and_distorted_vision', 'shivering',
            'altered_sensorium', 'loss_of_balance',
        ],
        'min_definitive': 1,
        'min_total':      3,
        'override_confidence': 78,
    },

    # ── Severe Asthma Attack ──────────────────────────────────────────────
    'Bronchial Asthma': {
        'definitive_markers': [
            'breathlessness',
        ],
        'supporting_markers': [
            'cough', 'chest_pain', 'phlegm', 'fatigue',
            'high_fever', 'fast_heart_rate',
        ],
        'min_definitive': 1,
        'min_total':      3,   # Breathless + cough + chest tightness
        'override_confidence': 75,
    },
}


def check_emergency_override(valid_features: List[str]) -> Optional[dict]:
    """Checks if the user's symptoms match any Emergency Override pattern.

    This is the critical safety net that ensures true emergencies are never
    suppressed by the conservative safety gates. It runs BEFORE the scary
    disease confidence threshold check (Step 8).

    Args:
        valid_features: List of recognized symptom tokens from user input.

    Returns:
        A dict with 'disease', 'confidence', and 'matched_markers' if an
        override fires, or None if no emergency pattern is matched.
    """
    best_match: Optional[dict] = None
    best_total_markers = 0

    for disease, config in EMERGENCY_OVERRIDES.items():
        definitive = config['definitive_markers']
        supporting = config['supporting_markers']

        matched_definitive = [m for m in definitive if m in valid_features]
        matched_supporting = [m for m in supporting if m in valid_features]
        n_definitive = len(matched_definitive)
        n_total      = n_definitive + len(matched_supporting)

        # Must meet both thresholds to fire the override
        if n_definitive >= config['min_definitive'] and n_total >= config['min_total']:
            # Pick the override with the strongest evidence (most matched markers)
            if n_total > best_total_markers:
                best_total_markers = n_total
                best_match = {
                    'disease':          disease,
                    'confidence':       config['override_confidence'],
                    'matched_markers':  matched_definitive + matched_supporting,
                    'n_definitive':     n_definitive,
                    'n_total':          n_total,
                }

    if best_match:
        print(
            f"🚨 EMERGENCY OVERRIDE: {best_match['disease']} "
            f"(definitive={best_match['n_definitive']}, total={best_match['n_total']}, "
            f"markers={best_match['matched_markers']})"
        )

    return best_match


# Minimum model confidence required before showing a scary disease name.
# Below this, the scary disease is replaced with its fallback.
SCARY_CONFIDENCE_THRESHOLD = 0.72   # 72% — lowered from 82% after clinical data expansion

# Penalty multiplier applied to scary disease probabilities when markers are absent.
# 0.03 = drastically reduce its probability so a common disease wins instead.
SCARY_PENALTY_MULTIPLIER   = 0.03

# Boost multiplier applied to scary diseases when their markers ARE present.
# This helps counteract the diluted model signal from noisy training data.
MARKER_PRESENT_BOOST = 3.5

# Diseases that are common/benign and should be preferred in ambiguous cases.
# These get a mild boost to edge out scary false positives.
COMMON_DISEASES: list[str] = [
    'Common Cold', 'Common Flu', 'Allergy', 'Fever', 'Gastroenteritis',
    'Migraine', 'Acne', 'Urinary tract infection', 'Fungal infection',
    'Insomnia', 'Slight Headache', 'Stomach ache', 'Drug Reaction', 'GERD',
    '(vertigo) Paroymsal  Positional Vertigo', 'Hypoglycemia',
    'Cervical spondylosis', 'Arthritis', 'Osteoarthristis',
    'Hypothyroidism', 'Bronchial Asthma', 'Peptic ulcer diseae',
    'Dimorphic hemmorhoids(piles)', 'Psoriasis', 'Varicose veins',
]

# Boost multiplier for common diseases (gentle — just enough to prefer them
# over scary diseases when evidence is ambiguous)
COMMON_BOOST_MULTIPLIER = 1.25

# When the top-1 confidence falls below this threshold, the UI messaging
# switches from "You likely have X" to a softer "Possible X" framing.
LOW_CONFIDENCE_THRESHOLD = 0.55    # 55%

# ── Symptom Count Confidence Control ──────────────────────────────────────────
# When the user provides very few symptoms, the model can't be confident.
# These caps prevent misleading high-confidence diagnoses from vague inputs.
SINGLE_SYMPTOM_MAX_CONFIDENCE = 0.40   # 40% max with only 1 symptom recognized
FEW_SYMPTOMS_MAX_CONFIDENCE   = 0.60   # 60% max with only 2 symptoms recognized

# Extra boost for common diseases when sparse inputs are detected
SPARSE_INPUT_COMMON_BOOST = 1.8

# Symptoms that are extremely vague / shared across many conditions
# and should trigger extra conservative logic when they appear alone.
HIGHLY_AMBIGUOUS_SYMPTOMS: set = {
    'dizziness', 'headache', 'fatigue', 'nausea', 'vomiting',
    'stomach_pain', 'cough', 'itching', 'sweating', 'chills',
    'muscle_pain', 'joint_pain', 'back_pain', 'anxiety',
    'high_fever', 'mild_fever', 'lethargy', 'weakness_in_limbs',
    'loss_of_appetite', 'constipation', 'diarrhoea', 'acidity',
    'chest_pain', 'breathlessness', 'skin_rash', 'indigestion',
    'palpitations', 'weight_loss', 'weight_gain', 'insomnia',
}

# The fallback condition shown when confidence is too low to commit to a diagnosis
FALLBACK_CONDITION  = "Unspecific Symptoms"
FALLBACK_SPECIALIST = "General Physician"


# ══════════════════════════════════════════════════════════════════════════════
#  Pydantic Request / Response Models
# ══════════════════════════════════════════════════════════════════════════════

class VitalEntry(BaseModel):
    bloodPressure: str
    heartRate:     int
    steps:         int
    sleep:         str

class WellnessRequest(BaseModel):
    vitals_history: List[VitalEntry]

class WellnessResponse(BaseModel):
    score:          int
    status:         str
    recommendation: str
    anomalies:      List[str]

class VitalsContext(BaseModel):
    """Optional real-time vitals from the user's dashboard.

    These are pulled from the selected family member's profile and
    used as contextual evidence to improve diagnostic accuracy.
    All fields are optional — the system gracefully degrades to
    symptom-only mode if vitals are absent or stale.
    """
    heart_rate:       Optional[int]   = None   # bpm
    blood_pressure:   Optional[str]   = None   # "120/80" format
    sleep:            Optional[str]   = None   # "7h" or "7h 30m" format
    age:              Optional[int]   = None
    data_age_minutes: Optional[int]   = None   # how old the vitals data is

class SymptomRequest(BaseModel):
    symptoms:        str
    vitals_context:  Optional[VitalsContext] = None

class TopMatch(BaseModel):
    condition:  str
    confidence: int

class SymptomResponse(BaseModel):
    condition:    str
    confidence:   int
    advice:       str
    specialist:   str
    description:  Optional[str] = None
    precautions:  List[str]     = []
    urgency:      str           = "Normal"
    top_matches:  List[TopMatch] = []
    next_steps:   List[str]     = []
    vitals_analysis: List[str]  = []    # Explains how vitals influenced diagnosis
    disclaimer:   str           = (
        "DISCLAIMER: This is an AI-powered health guide, not a medical diagnosis. "
        "Please consult a qualified doctor for any health concerns."
    )


class OllamaTopMatch(BaseModel):
    """A single differential diagnosis from the LLM."""
    condition:  str
    confidence: int

class OllamaDiagnosis(BaseModel):
    """Structured schema for Ollama's clinical reasoning output."""
    condition:    str
    confidence:   int
    advice:       str
    specialist:   str
    description:  str
    precautions:  List[str]
    urgency:      str
    top_matches:  List[OllamaTopMatch]
    next_steps:   List[str]


# ══════════════════════════════════════════════════════════════════════════════
#  Utility Helpers
# ══════════════════════════════════════════════════════════════════════════════

def parse_bp(bp_str: str) -> tuple[int, int]:
    """Parses a blood pressure string into systolic and diastolic integers.

    Args:
        bp_str: A string in the format 'systolic/diastolic' (e.g., '120/80').

    Returns:
        A tuple of (systolic, diastolic). Defaults to (120, 80) on parse failure.
    """
    try:
        systolic, diastolic = map(int, bp_str.split('/'))
        return systolic, diastolic
    except Exception:
        return 120, 80

def parse_sleep(sleep_str: str) -> float:
    """Extracts numerical sleep hours from a string.

    Args:
        sleep_str: A string like '7.5h' or '7 hours'.

    Returns:
        The number of hours as a float. Defaults to 7.0 on parse failure.
    """
    try:
        return float(sleep_str.replace('h', '').strip())
    except Exception:
        return 7.0

# ══════════════════════════════════════════════════════════════════════════════
#  NLP Pre-Processing Layer
#  Enables natural-language input like "i feel dizzy and feverish"
# ══════════════════════════════════════════════════════════════════════════════

# Words that carry no medical meaning — stripped before symptom matching
STOPWORDS = {
    'i', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'a', 'an', 'the', 'and', 'or', 'but', 'so', 'yet', 'for', 'nor',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'cannot',
    'feel', 'feeling', 'felt', 'seem', 'seems', 'appear', 'appears',
    'experiencing', 'experience', 'suffer', 'suffering', 'having', 'had',
    'since', 'from', 'with', 'without', 'also', 'too', 'very', 'quite',
    'bit', 'little', 'slightly', 'really', 'extremely', 'badly', 'badly',
    'some', 'my', 'me', 'i\'m', 'im', 'its', 'it', 'in', 'on', 'at',
    'getting', 'got', 'been', 'lately', 'recently', 'today', 'yesterday',
    'now', 'currently', 'kind', 'of', 'sort', 'like', 'as', 'just', 'not',
    'no', 'yes', 'maybe', 'think', 'bit', 'any', 'all', 'both', 'each',
    'few', 'more', 'most', 'other', 'same', 'such', 'than', 'then',
    'these', 'they', 'this', 'those', 'through', 'to', 'up', 'about',
    'after', 'before', 'between', 'into', 'out', 'down', 'there',
    'when', 'where', 'how', 'what', 'little', 'much', 'well',
}

# Maps natural spoken/written words and phrases → known model symptom tokens.
# Keys are lowercase with spaces (matched against cleaned input tokens/bigrams/trigrams).
SYMPTOM_ALIASES: Dict[str, str] = {
    # ── Fever / Temperature ──────────────────────────────────────────────────
    'feverish':               'high_fever',
    'fever':                  'high_fever',
    'high fever':             'high_fever',
    'slight fever':           'mild_fever',
    'low fever':              'mild_fever',
    'mild fever':             'mild_fever',
    'temperature':            'high_fever',
    'hot':                    'high_fever',
    'burning up':             'high_fever',
    'running a fever':        'high_fever',
    'chills':                 'chills',
    'shivering':              'shivering',
    'sweating':               'sweating',
    'sweaty':                 'sweating',
    'night sweats':           'sweating',
    'cold hands':             'cold_hands_and_feets',
    'cold feet':              'cold_hands_and_feets',
    'cold hands and feet':    'cold_hands_and_feets',

    # ── Head / Neurological ──────────────────────────────────────────────────
    'headache':               'headache',
    'head ache':              'headache',
    'head pain':              'headache',
    'migraine':               'headache',
    'dizzy':                  'dizziness',
    'dizziness':              'dizziness',
    'lightheaded':            'dizziness',
    'light-headed':           'dizziness',
    'light headed':           'dizziness',
    'spinning':               'spinning_movements',
    'vertigo':                'spinning_movements',
    'room spinning':          'spinning_movements',
    'faint':                  'loss_of_balance',
    'fainting':               'loss_of_balance',
    'blurry vision':          'blurred_and_distorted_vision',
    'blurred vision':         'blurred_and_distorted_vision',
    'vision problems':        'blurred_and_distorted_vision',
    'visual disturbance':     'visual_disturbances',
    'cannot concentrate':     'lack_of_concentration',
    'can t concentrate':      'lack_of_concentration',
    'confused':               'altered_sensorium',
    'confusion':              'altered_sensorium',
    'disoriented':            'altered_sensorium',
    'slurred speech':         'slurred_speech',
    'speech problems':        'slurred_speech',
    'memory loss':            'lack_of_concentration',
    'forgetful':              'lack_of_concentration',
    'stiff neck':             'stiff_neck',
    'neck stiff':             'stiff_neck',
    'neck pain':              'neck_pain',

    # ── Fatigue / Energy ─────────────────────────────────────────────────────
    'tired':                  'fatigue',
    'tiredness':              'fatigue',
    'fatigue':                'fatigue',
    'exhausted':              'fatigue',
    'exhaustion':             'fatigue',
    'weak':                   'fatigue',
    'weakness':               'weakness_in_limbs',
    'no energy':              'fatigue',
    'lethargic':              'lethargy',
    'lethargy':               'lethargy',
    'sluggish':               'lethargy',
    'drowsy':                 'lethargy',
    'drowsiness':             'lethargy',

    # ── Respiratory ──────────────────────────────────────────────────────────
    'cough':                  'cough',
    'coughing':               'cough',
    'dry cough':              'cough',
    'wet cough':              'phlegm',
    'phlegm':                 'phlegm',
    'mucus':                  'phlegm',
    'breathless':             'breathlessness',
    'breathlessness':         'breathlessness',
    'short of breath':        'breathlessness',
    'shortness of breath':    'breathlessness',
    'difficulty breathing':   'breathlessness',
    'hard to breathe':        'breathlessness',
    'can t breathe':          'breathlessness',
    'chest tightness':        'chest_pain',
    'chest pain':             'chest_pain',
    'chest hurts':            'chest_pain',
    'chest ache':             'chest_pain',
    'heavy pain in my chest': 'crushing_chest_pain',
    'heavy pain in chest':    'crushing_chest_pain',
    'pain in my chest':       'chest_pain',
    'pain in chest':          'chest_pain',
    'heavy chest pain':       'crushing_chest_pain',
    'heart pain':             'chest_pain',
    'heavy pain':             'chest_pain',
    'crushing chest pain':    'crushing_chest_pain',
    'crushing pain':          'crushing_chest_pain',
    'crushing pain in chest': 'crushing_chest_pain',
    'tight chest':            'chest_tightness',
    'chest feels tight':      'chest_tightness',
    'chest pressure':         'chest_tightness',
    'pressure in chest':      'chest_tightness',
    'chest squeezing':        'chest_tightness',
    'squeezing chest':        'chest_tightness',
    'jaw pain':               'jaw_pain',
    'jaw ache':               'jaw_pain',
    'pain in jaw':            'jaw_pain',
    'left arm pain':          'left_arm_pain',
    'left arm ache':          'left_arm_pain',
    'pain in left arm':       'left_arm_pain',
    'arm pain':               'left_arm_pain',
    'arm weakness':           'arm_weakness',
    'arm feels weak':         'arm_weakness',
    'cold sweat':             'cold_sweat',
    'cold sweats':            'cold_sweat',
    'clammy':                 'cold_sweat',
    'clammy skin':            'cold_sweat',
    'sudden chest pain':      'sudden_chest_pain',
    'sudden pain in chest':   'sudden_chest_pain',
    # ── Stroke / Paralysis ───────────────────────────────────────────────
    'face drooping':          'facial_droop',
    'facial droop':           'facial_droop',
    'face droops':            'facial_droop',
    'drooping face':          'facial_droop',
    'face numb':              'facial_droop',
    'one side weak':          'weakness_of_one_body_side',
    'one side weakness':      'weakness_of_one_body_side',
    'sudden weakness':        'weakness_of_one_body_side',
    'body side weak':         'weakness_of_one_body_side',
    'sudden confusion':       'altered_sensorium',
    'cant speak properly':    'slurred_speech',
    'cannot speak':           'slurred_speech',
    'trouble speaking':       'slurred_speech',
    'words not coming out':   'slurred_speech',
    # ── Migraine ────────────────────────────────────────────────────────
    'severe headache':        'headache',
    'throbbing headache':     'headache',
    'pulsating headache':     'headache',
    'pounding headache':      'headache',
    'throbbing pain':         'headache',
    'light sensitivity':      'visual_disturbances',
    'photophobia':            'visual_disturbances',
    'sensitive to light':     'visual_disturbances',
    'sound sensitivity':      'visual_disturbances',
    'phonophobia':            'visual_disturbances',
    'visual aura':            'visual_disturbances',
    'aura':                   'visual_disturbances',
    # ── Flu / Body ache ──────────────────────────────────────────────────
    'body ache':              'muscle_pain',
    'body aches':             'muscle_pain',
    'all over ache':          'muscle_pain',
    'muscle aches':           'muscle_pain',
    # ── Respiratory ──────────────────────────────────────────────────────
    'wheezing':               'breathlessness',
    'wheeze':                 'breathlessness',
    'short of breath':        'breathlessness',
    'shortness of breath':    'breathlessness',
    'productive cough':       'cough',
    'wet cough with phlegm':  'phlegm',
    'rusty sputum':           'rusty_sputum',
    'blood stained sputum':   'blood_in_sputum',
    # ── Urinary ──────────────────────────────────────────────────────────
    'frequent urination':     'continuous_feel_of_urine',
    'urinating frequently':   'continuous_feel_of_urine',
    'cloudy urine':           'dark_urine',
    'pelvic pain':            'abdominal_pain',
    'painful urination':      'burning_micturition',
    'burning when peeing':    'burning_micturition',
    # ── Diabetes ─────────────────────────────────────────────────────────
    'excessive thirst':       'dehydration',
    'polydipsia':             'dehydration',
    'polyuria':               'polyuria',
    'urinating a lot':        'polyuria',
    'peeing a lot':           'polyuria',
    # ── Hypertension ─────────────────────────────────────────────────────
    'nosebleed':              'headache',
    'persistent headache':    'headache',
    'vision problems':        'blurred_and_distorted_vision',
    'vision blurring':        'blurred_and_distorted_vision',
    'vision blur':            'blurred_and_distorted_vision',
    # ── Dengue / Infections ───────────────────────────────────────────────
    'pain behind my eyes':    'pain_behind_the_eyes',
    'eye pain':               'pain_behind_the_eyes',
    'aching eyes':            'pain_behind_the_eyes',
    'severe joint pain':      'joint_pain',
    'runny nose':             'runny_nose',
    'stuffy nose':            'congestion',
    'blocked nose':           'congestion',
    'congestion':             'congestion',
    'sneezing':               'continuous_sneezing',
    'sinus':                  'sinus_pressure',
    'sinus pain':             'sinus_pressure',
    'sore throat':            'throat_irritation',
    'throat irritation':      'throat_irritation',
    'throat pain':            'throat_irritation',
    'scratchy throat':        'throat_irritation',
    'blood in sputum':        'blood_in_sputum',
    'coughing blood':         'blood_in_sputum',

    # ── Stomach / Digestive ──────────────────────────────────────────────────
    'nausea':                 'nausea',
    'nauseous':               'nausea',
    'queasy':                 'nausea',
    'vomiting':               'vomiting',
    'vomit':                  'vomiting',
    'throwing up':            'vomiting',
    'puking':                 'vomiting',
    'stomach ache':           'stomach_pain',
    'stomach pain':           'stomach_pain',
    'stomach hurts':          'stomach_pain',
    'belly pain':             'belly_pain',
    'abdominal pain':         'abdominal_pain',
    'abdominal cramps':       'cramps',
    'cramps':                 'cramps',
    'diarrhea':               'diarrhoea',
    'diarrhoea':              'diarrhoea',
    'loose stool':            'diarrhoea',
    'loose stools':           'diarrhoea',
    'watery stool':           'diarrhoea',
    'constipation':           'constipation',
    'constipated':            'constipation',
    'can t poop':             'constipation',
    'indigestion':            'indigestion',
    'heartburn':              'acidity',
    'acidity':                'acidity',
    'acid reflux':            'acidity',
    'bloating':               'passage_of_gases',
    'gas':                    'passage_of_gases',
    'flatulence':             'passage_of_gases',
    'burping':                'indigestion',
    'belching':               'indigestion',
    'loss of appetite':       'loss_of_appetite',
    'no appetite':            'loss_of_appetite',
    'not hungry':             'loss_of_appetite',
    'increased appetite':     'increased_appetite',
    'always hungry':          'increased_appetite',
    'excessive hunger':       'excessive_hunger',
    'dehydrated':             'dehydration',
    'dehydration':            'dehydration',
    'thirsty':                'dehydration',

    # ── Skin ────────────────────────────────────────────────────────────────
    'itching':                'itching',
    'itchy':                  'itching',
    'itch':                   'itching',
    'rash':                   'skin_rash',
    'skin rash':              'skin_rash',
    'red spots':              'red_spots_over_body',
    'spots':                  'red_spots_over_body',
    'hives':                  'skin_rash',
    'blisters':               'blister',
    'blister':                'blister',
    'pimples':                'pus_filled_pimples',
    'acne':                   'pus_filled_pimples',
    'blackheads':             'blackheads',
    'skin peeling':           'skin_peeling',
    'peeling skin':           'skin_peeling',
    'yellow skin':            'yellowish_skin',
    'jaundice':               'yellowish_skin',
    'yellow eyes':            'yellowing_of_eyes',
    'yellowing':              'yellowish_skin',
    'bruising':               'bruising',
    'bruises':                'bruising',
    'bruise':                 'bruising',

    # ── Pain / Joints / Muscles ──────────────────────────────────────────────
    'joint pain':             'joint_pain',
    'joints hurt':            'joint_pain',
    'achy joints':            'joint_pain',
    'muscle pain':            'muscle_pain',
    'muscle ache':            'muscle_pain',
    'body ache':              'muscle_pain',
    'body pain':              'muscle_pain',
    'aching':                 'muscle_pain',
    'back pain':              'back_pain',
    'back ache':              'back_pain',
    'backache':               'back_pain',
    'knee pain':              'knee_pain',
    'hip pain':               'hip_joint_pain',
    'muscle weakness':        'muscle_weakness',
    'weak muscles':           'muscle_weakness',
    'stiff':                  'movement_stiffness',
    'stiffness':              'movement_stiffness',
    'swollen joints':         'swelling_joints',
    'swelling':               'swelling_joints',
    'swollen legs':           'swollen_legs',
    'leg swelling':           'swollen_legs',
    'painful walking':        'painful_walking',
    'pain walking':           'painful_walking',
    'leg pain':               'painful_walking',

    # ── Cardiovascular ────────────────────────────────────────────────────────
    'heart racing':           'fast_heart_rate',
    'racing heart':           'fast_heart_rate',
    'palpitations':           'palpitations',
    'heart pounding':         'palpitations',
    'irregular heartbeat':    'palpitations',
    'fast heart rate':        'fast_heart_rate',
    'heart beats fast':       'fast_heart_rate',

    # ── Urinary ──────────────────────────────────────────────────────────────
    'burning urination':      'burning_micturition',
    'burning when urinating': 'burning_micturition',
    'painful urination':      'burning_micturition',
    'frequent urination':     'continuous_feel_of_urine',
    'urinating a lot':        'polyuria',
    'dark urine':             'dark_urine',
    'blood in urine':         'spotting_urination',
    'foul smelling urine':    'foul_smell_of_urine',

    # ── Eyes / ENT ──────────────────────────────────────────────────────────
    'red eyes':               'redness_of_eyes',
    'pink eye':               'redness_of_eyes',
    'watery eyes':            'watering_from_eyes',
    'tearing':                'watering_from_eyes',
    'eye pain':               'pain_behind_the_eyes',
    'pain behind eyes':       'pain_behind_the_eyes',
    'loss of smell':          'loss_of_smell',
    'can t smell':            'loss_of_smell',
    'puffy face':             'puffy_face_and_eyes',
    'puffiness':              'puffy_face_and_eyes',
    'sunken eyes':            'sunken_eyes',

    # ── Mental / Mood ────────────────────────────────────────────────────────
    'anxious':                'anxiety',
    'anxiety':                'anxiety',
    'worried':                'anxiety',
    'stress':                 'anxiety',
    'stressed':               'anxiety',
    'depressed':              'depression',
    'depression':             'depression',
    'sad':                    'depression',
    'mood swings':            'mood_swings',
    'irritable':              'irritability',
    'irritability':           'irritability',
    'restless':               'restlessness',
    'restlessness':           'restlessness',
    'can t sleep':            'insomnia',
    'cant sleep':             'insomnia',
    'not sleeping':           'insomnia',
    'unable to sleep':        'insomnia',
    'difficulty sleeping':    'insomnia',
    'insomnia':               'insomnia',
    'sleeping too much':      'lethargy',

    # ── Weight / Metabolism ──────────────────────────────────────────────────
    'weight loss':            'weight_loss',
    'losing weight':          'weight_loss',
    'weight gain':            'weight_gain',
    'gaining weight':         'weight_gain',
    'obese':                  'obesity',
    'obesity':                'obesity',
    'overweight':             'obesity',
    'swollen lymph nodes':    'swelled_lymph_nodes',
    'glands swollen':         'swelled_lymph_nodes',
    'enlarged lymph nodes':   'swelled_lymph_nodes',
    'malaise':                'malaise',
    'unwell':                 'malaise',
    'generally unwell':       'malaise',
    'not feeling well':       'malaise',

    # ── Misc ────────────────────────────────────────────────────────────────
    'bleeding':               'bloody_stool',
    'blood in stool':         'bloody_stool',
    'rectal bleeding':        'bloody_stool',
    'throat patches':         'patches_in_throat',
    'white patches':          'patches_in_throat',
    'mouth sores':            'ulcers_on_tongue',
    'tongue sores':           'ulcers_on_tongue',
    'leg cramps':             'cramps',
    'muscle cramps':          'cramps',
    'tingling':               'drying_and_tingling_lips',
    'numbness':               'weakness_in_limbs',
    'numb':                   'weakness_in_limbs',
    'fluid retention':        'fluid_overload',
    'swollen stomach':        'swelling_of_stomach',
    'bloated stomach':        'swelling_of_stomach',
    'poor balance':           'loss_of_balance',
    'unsteady':               'unsteadiness',
    'blood sugar':            'irregular_sugar_level',
    'high blood sugar':       'irregular_sugar_level',
    'diabetes symptoms':      'polyuria',
    'excessive thirst':       'dehydration',
    'history alcohol':        'history_of_alcohol_consumption',
    'alcohol':                'history_of_alcohol_consumption',
    'fragile nails':          'brittle_nails',
    'brittle nails':          'brittle_nails',

    # ── Natural Language Expansion (v2) ───────────────────────────────────
    # Additional conversational aliases for broader symptom recognition
    'giddy':                  'dizziness',
    'woozy':                  'dizziness',
    'shaky':                  'dizziness',
    'off balance':            'loss_of_balance',
    'out of balance':         'loss_of_balance',
    'unbalanced':             'loss_of_balance',
    'wobbly':                 'unsteadiness',
    'heavy head':             'headache',
    'head feels heavy':       'headache',
    'head heavy':             'headache',
    'brain fog':              'lack_of_concentration',
    'foggy':                  'lack_of_concentration',
    'can t focus':            'lack_of_concentration',
    'cannot focus':           'lack_of_concentration',
    'drained':                'fatigue',
    'run down':               'fatigue',
    'worn out':               'fatigue',
    'low energy':             'fatigue',
    'tummy ache':             'stomach_pain',
    'tummy pain':             'stomach_pain',
    'tummy hurts':            'stomach_pain',
    'belly hurts':            'belly_pain',
    'feeling sick':           'nausea',
    'feel sick':              'nausea',
    'throat hurts':           'throat_irritation',
    'throat sore':            'throat_irritation',
    'gastric':                'acidity',
    'gastric problem':        'acidity',
    'gas problem':            'passage_of_gases',
    'gas trouble':            'passage_of_gases',
    'pee burns':              'burning_micturition',
    'urine burns':            'burning_micturition',
    'burns when peeing':      'burning_micturition',
    'skin irritation':        'itching',
    'skin bumps':             'nodal_skin_eruptions',
    'bumps on skin':          'nodal_skin_eruptions',
    'spotty':                 'pus_filled_pimples',
    'pimple':                 'pus_filled_pimples',
    'spots on face':          'pus_filled_pimples',
    'eye strain':             'pain_behind_the_eyes',
    'eyes hurt':              'pain_behind_the_eyes',
    'sleepless':              'insomnia',
    'cannot sleep':           'insomnia',
    'sleep problems':         'insomnia',
    'trouble sleeping':       'insomnia',
    'no sleep':               'insomnia',
    'spasms':                 'cramps',
    'muscle spasms':          'cramps',
    'swollen ankles':         'swollen_legs',
    'ankle swelling':         'swollen_legs',
    'dry mouth':              'dehydration',
    'parched':                'dehydration',
    'shaking':                'shivering',
    'trembling':              'shivering',
    'burning eyes':           'redness_of_eyes',
    'eye redness':            'redness_of_eyes',
    'sniffling':              'runny_nose',
    'sinus headache':         'sinus_pressure',
    'blocked sinuses':        'sinus_pressure',
    'swollen face':           'puffy_face_and_eyes',
    'face swollen':           'puffy_face_and_eyes',
    'face puffiness':         'puffy_face_and_eyes',
    'irregular periods':      'abnormal_menstruation',
    'period problems':        'abnormal_menstruation',
    'chest discomfort':       'chest_pain',
    'chest burning':          'acidity',
    'stomach burning':        'acidity',
    'body weakness':          'weakness_in_limbs',
    'feel weak':              'weakness_in_limbs',
    'low sugar':              'irregular_sugar_level',
    'high sugar':             'irregular_sugar_level',
    'sugar low':              'irregular_sugar_level',
    'sugar high':             'irregular_sugar_level',
    'flaky skin':             'skin_peeling',
    'dry skin':               'skin_peeling',
    'nail problems':          'brittle_nails',
    'cracking nails':         'brittle_nails',
    'stomach cramps':         'cramps',
    'belly cramps':           'cramps',
    'food poisoning':         'vomiting',
    'motion sickness':        'nausea',
    'car sick':               'nausea',
    'rapid heartbeat':        'fast_heart_rate',
    'heart fluttering':       'palpitations',
    'heart flutter':          'palpitations',
    'skipped heartbeat':      'palpitations',
    'irregular heart':        'palpitations',
    'swollen glands':         'swelled_lymph_nodes',
    'lymph nodes':            'swelled_lymph_nodes',
}


# ==============================================================================
# SECTION 2: NLP PIPELINE & SYMPTOM NORMALIZATION
# ==============================================================================

def normalize_input(text: str, symptom_list: List[str]) -> List[int]:
    """
    Translates raw natural language input into a binary feature vector compatible 
    with the ML model.
    
    Processing Strategy:
    1. **SciSpacy NER**: Extracts biomedical entities from the text.
    2. **Alias Expansion**: Maps medical jargon/slang (e.g., 'crushing pain') 
       to canonical symptom names.
    3. **Fuzzy Scoring**: Uses Token Set Ratio to match extracted entities 
       against the training set's feature columns.
    
    Args:
        text: Raw symptom description from the user.
        symptom_list: The full list of symptoms the model was trained on.
        
    Returns:
        A list of binary integers (0 or 1) representing present symptoms.
    """
    # ── 0. Clean: lowercase, remove punctuation, collapse whitespace ──────────
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    found: list[str] = []

    # ══════════════════════════════════════════════════════════════════════════
    #  LAYER 1: SciSpacy Medical Named Entity Recognition
    # ══════════════════════════════════════════════════════════════════════════
    if nlp_med is not None:
        fuzzy_targets = _build_fuzzy_targets(known_symptoms)
        doc = nlp_med(cleaned)

        for ent in doc.ents:
            ent_text = ent.text.strip().lower()
            if len(ent_text) < 3:  # Skip very short entities (noise)
                continue

            # 1a. Check if the entity text is a direct alias key
            if ent_text in SYMPTOM_ALIASES:
                mapped = SYMPTOM_ALIASES[ent_text]
                if mapped not in found:
                    found.append(mapped)
                    print(f"  🧠 SciSpacy → alias match: '{ent_text}' → {mapped}")
                continue

            # 1b. Check if the entity text (underscored) is in known vocabulary
            ent_underscored = ent_text.replace(' ', '_').replace('-', '_')
            if known_symptoms and ent_underscored in known_symptoms:
                if ent_underscored not in found:
                    found.append(ent_underscored)
                    print(f"  🧠 SciSpacy → vocab match: '{ent_text}' → {ent_underscored}")
                continue

            # 1c. Fuzzy match the entity against our full vocabulary
            fuzzy_result = _fuzzy_match_entity(ent_text, fuzzy_targets)
            if fuzzy_result and fuzzy_result not in found:
                found.append(fuzzy_result)
                print(f"  🧠 SciSpacy → fuzzy match: '{ent_text}' → {fuzzy_result}")

        if found:
            print(f"  🧠 SciSpacy extracted {len(found)} symptoms from NER")

    # ══════════════════════════════════════════════════════════════════════════
    #  LAYER 2: SYMPTOM_ALIASES Phrase Matching (n-gram window)
    #  Runs regardless of SciSpacy results to catch aliases the NER missed.
    # ══════════════════════════════════════════════════════════════════════════
    tokens = cleaned.split()
    used_indices: set = set()

    for window in (5, 4, 3, 2):
        for i in range(len(tokens) - window + 1):
            if any(j in used_indices for j in range(i, i + window)):
                continue
            phrase = " ".join(tokens[i : i + window])
            if phrase in SYMPTOM_ALIASES:
                mapped = SYMPTOM_ALIASES[phrase]
                if mapped not in found:
                    found.append(mapped)
                for j in range(i, i + window):
                    used_indices.add(j)

    # ══════════════════════════════════════════════════════════════════════════
    #  LAYER 3: Single-Token Matching
    # ══════════════════════════════════════════════════════════════════════════
    for i, token in enumerate(tokens):
        if i in used_indices:
            continue
        if token in STOPWORDS:
            continue

        token_underscored = token.replace("-", "_")

        # 3a. Direct hit in known model vocabulary
        if known_symptoms and token_underscored in known_symptoms:
            if token_underscored not in found:
                found.append(token_underscored)
            used_indices.add(i)
            continue

        # 3b. Alias lookup (single word)
        if token in SYMPTOM_ALIASES:
            mapped = SYMPTOM_ALIASES[token]
            if mapped not in found:
                found.append(mapped)
            used_indices.add(i)
            continue

        # 3c. Underscore version alias lookup
        if token_underscored in SYMPTOM_ALIASES:
            mapped = SYMPTOM_ALIASES[token_underscored]
            if mapped not in found:
                found.append(mapped)
            used_indices.add(i)
            continue

    # ══════════════════════════════════════════════════════════════════════════
    #  LAYER 4: Fallback — comma/and splitting for typed lists
    # ══════════════════════════════════════════════════════════════════════════
    if not found:
        parts = re.split(r"[,;]|\band\b", cleaned)
        for p in parts:
            phrase = p.strip()
            if phrase in SYMPTOM_ALIASES:
                mapped = SYMPTOM_ALIASES[phrase]
                if mapped not in found:
                    found.append(mapped)
            else:
                token_u = phrase.replace(" ", "_")
                if known_symptoms and token_u in known_symptoms:
                    if token_u not in found:
                        found.append(token_u)

    return found


def apply_conservative_adjustments(
    probabilities:  np.ndarray,
    valid_features: List[str],
    le,
) -> np.ndarray:
    """Applies the 'General Physician First' probability adjustments.

    This function enforces safety rails:
    1. Commonality Boost: Biases the model toward non-severe, common conditions (Allergy, Cold).
    2. Severity Gate: Penalizes life-threatening conditions unless specific clinical markers 
       (hallmark symptoms) are present in the user's input.

    Args:
        probabilities: Raw probability array from the model.
        valid_features: List of symptoms recognized in the input.
        le: The LabelEncoder used to map indices to disease names.

    Returns:
        A renormalized probability array with safety adjustments applied.
    """
    adjusted = probabilities.copy()

    for i, disease in enumerate(le.classes_):

        # ── Boost common diseases ──────────────────────────────────────────────
        if disease in COMMON_DISEASES:
            adjusted[i] *= COMMON_BOOST_MULTIPLIER

        # ── Scary disease handling ─────────────────────────────────────────────
        if disease in SCARY_DISEASES:
            required_markers = SCARY_DISEASES[disease]
            matched_markers  = [m for m in required_markers if m in valid_features]
            n_matched        = len(matched_markers)

            if n_matched == 0:
                # No markers at all → drastically penalize (false positive suppression)
                adjusted[i] *= SCARY_PENALTY_MULTIPLIER
            elif n_matched >= 2:
                # Multiple hallmark markers present → strong boost to counteract
                # the diluted model signal from noisy training data
                adjusted[i] *= MARKER_PRESENT_BOOST
            elif n_matched == 1:
                # Single marker → moderate boost (could be relevant, stay cautious)
                adjusted[i] *= (MARKER_PRESENT_BOOST * 0.5)

    # Re-normalize so all probabilities still sum to 1.0
    total = np.sum(adjusted)
    if total > 0:
        adjusted = adjusted / total

    return adjusted


# ══════════════════════════════════════════════════════════════════════════════
#  Vitals-Aware Context Engine
# ══════════════════════════════════════════════════════════════════════════════

# Maximum data age (in minutes) before vitals are considered stale
VITALS_FRESHNESS_LIMIT = 180    # 3 hours

def apply_vitals_context(
    vitals: Optional[VitalsContext],
    adjusted_probs: np.ndarray,
    valid_features: list[str],
    all_symptoms: list[str],
    X_input: np.ndarray,
    le,
) -> tuple[np.ndarray, list[str], list[str], int]:
    """Analyzes dashboard vitals and adjusts diagnostic probabilities.

    This function acts as a clinical overlay — it uses real-time patient
    vitals (heart rate, blood pressure, sleep, age) to bias the model
    toward conditions supported by objective measurements, not just
    subjective symptom descriptions.

    Safety Design:
    - If vitals are None, stale (> 3h), or missing key fields → no-op.
    - Vitals BOOST relevant conditions but never suppress symptoms.
    - In emergencies, the user can skip vitals entirely.

    Args:
        vitals: Optional vitals context from the user's dashboard.
        adjusted_probs: The probability array after conservative adjustments.
        valid_features: List of symptoms recognized in the user's input.
        all_symptoms: The full symptom vocabulary.
        X_input: The binary feature vector for the model.
        le: The LabelEncoder mapping indices to disease names.

    Returns:
        Tuple of (modified_probs, updated_features, vitals_analysis, extra_evidence_count)
    """
    vitals_analysis: list[str] = []
    injected_symptoms: list[str] = []
    extra_evidence = 0

    # ── Guard: No vitals or stale data → pass through unchanged ───────────
    if vitals is None:
        return adjusted_probs, valid_features, vitals_analysis, 0

    if vitals.data_age_minutes is not None and vitals.data_age_minutes > VITALS_FRESHNESS_LIMIT:
        vitals_analysis.append(
            f"⏱ Vitals data is {vitals.data_age_minutes} min old (>{VITALS_FRESHNESS_LIMIT} min limit) — "
            f"using symptom-only analysis for accuracy."
        )
        print(f"DEBUG [VITALS]: Stale data ({vitals.data_age_minutes}m > {VITALS_FRESHNESS_LIMIT}m), skipping.")
        return adjusted_probs, valid_features, vitals_analysis, 0

    probs = adjusted_probs.copy()
    updated_features = valid_features.copy()

    # ── Heart Rate Analysis ───────────────────────────────────────────────
    if vitals.heart_rate is not None and vitals.heart_rate > 0:
        hr = vitals.heart_rate

        if hr > 100:
            # Tachycardia — boost cardiac and stress-related conditions
            vitals_analysis.append(
                f"❤️ Heart rate of {hr} bpm is elevated (tachycardia, normal range: 60–100 bpm). "
                f"This supports cardiovascular and stress-related conditions."
            )
            # Inject fast_heart_rate as a derived symptom
            if 'fast_heart_rate' in all_symptoms and 'fast_heart_rate' not in updated_features:
                injected_symptoms.append('fast_heart_rate')
                extra_evidence += 1

            # Boost cardiac diseases
            cardiac_boost = 2.5 if hr > 120 else 1.8
            for i, disease in enumerate(le.classes_):
                if disease in ('Heart attack', 'Hypertension', 'Hyperthyroidism'):
                    probs[i] *= cardiac_boost

        elif hr < 50:
            # Bradycardia — boost cardiac and metabolic conditions
            vitals_analysis.append(
                f"❤️ Heart rate of {hr} bpm is low (bradycardia, normal range: 60–100 bpm). "
                f"This may indicate cardiac or metabolic issues."
            )
            if 'fast_heart_rate' in all_symptoms and 'fast_heart_rate' not in updated_features:
                injected_symptoms.append('fast_heart_rate')
                extra_evidence += 1

            for i, disease in enumerate(le.classes_):
                if disease in ('Heart attack', 'Hypothyroidism', 'Hypoglycemia'):
                    probs[i] *= 2.0

        elif hr > 90:
            # Mildly elevated — gentle boost
            vitals_analysis.append(
                f"❤️ Heart rate of {hr} bpm is mildly elevated (normal resting: 60–80 bpm)."
            )
            for i, disease in enumerate(le.classes_):
                if disease in ('Hypertension', 'Hyperthyroidism'):
                    probs[i] *= 1.3

        else:
            vitals_analysis.append(f"❤️ Heart rate of {hr} bpm is within normal range.")

    # ── Blood Pressure Analysis ───────────────────────────────────────────
    if vitals.blood_pressure:
        try:
            sys_val, dia_val = parse_bp(vitals.blood_pressure)

            if sys_val > 140 or dia_val > 90:
                vitals_analysis.append(
                    f"🩸 Blood pressure {vitals.blood_pressure} mmHg is elevated "
                    f"(hypertensive range, normal: <120/80)."
                )
                for i, disease in enumerate(le.classes_):
                    if disease == 'Hypertension':
                        probs[i] *= 3.0
                    elif disease in ('Heart attack', 'Paralysis (brain hemorrhage)'):
                        probs[i] *= 1.5
                extra_evidence += 1

            elif sys_val < 90 or dia_val < 60:
                vitals_analysis.append(
                    f"🩸 Blood pressure {vitals.blood_pressure} mmHg is low "
                    f"(hypotensive range, normal: >90/60)."
                )
                for i, disease in enumerate(le.classes_):
                    if disease in ('Hypoglycemia', 'Hyperthyroidism'):
                        probs[i] *= 2.5
                extra_evidence += 1

            else:
                vitals_analysis.append(
                    f"🩸 Blood pressure {vitals.blood_pressure} mmHg is within normal range."
                )
        except Exception:
            pass  # Malformed BP string — silently skip

    # ── Sleep Analysis ────────────────────────────────────────────────────
    if vitals.sleep:
        sleep_hours = parse_sleep(vitals.sleep)
        if sleep_hours > 0:
            if sleep_hours < 4:
                vitals_analysis.append(
                    f"😴 Sleep of {vitals.sleep} is severely insufficient (<4h). "
                    f"This supports fatigue-related and neurological conditions."
                )
                for i, disease in enumerate(le.classes_):
                    if disease in ('Insomnia', 'Migraine', 'Slight Headache', 'Hypertension'):
                        probs[i] *= 2.0
                extra_evidence += 1

            elif sleep_hours < 6:
                vitals_analysis.append(
                    f"😴 Sleep of {vitals.sleep} is below recommended (6–8h)."
                )
                for i, disease in enumerate(le.classes_):
                    if disease in ('Insomnia', 'Migraine'):
                        probs[i] *= 1.5
                extra_evidence += 1

    # ── Age-Based Risk Modulation ─────────────────────────────────────────
    if vitals.age is not None and vitals.age > 0:
        # Cardiac symptoms in elderly (>50) should lower the gate for scary diseases
        cardiac_symptoms_present = any(
            s in updated_features
            for s in ('chest_pain', 'crushing_chest_pain', 'breathlessness',
                      'sweating', 'fast_heart_rate', 'left_arm_pain')
        )
        if vitals.age >= 50 and cardiac_symptoms_present:
            vitals_analysis.append(
                f"👤 Patient age {vitals.age} with cardiac symptoms — elevated risk profile."
            )
            for i, disease in enumerate(le.classes_):
                if disease in ('Heart attack', 'Hypertension', 'Paralysis (brain hemorrhage)'):
                    probs[i] *= 1.8
            extra_evidence += 1

        elif vitals.age >= 60:
            # General age-related risk boost for degenerative conditions
            for i, disease in enumerate(le.classes_):
                if disease in ('Osteoarthristis', 'Cervical spondylosis', 'Arthritis',
                               'Hypertension', 'Varicose veins'):
                    probs[i] *= 1.3

    # ── Inject derived symptoms into feature vector ───────────────────────
    for symptom in injected_symptoms:
        if symptom in all_symptoms:
            idx = all_symptoms.index(symptom)
            X_input[idx] = 1.0
            updated_features.append(symptom)

    # ── Renormalize probabilities ─────────────────────────────────────────
    total = np.sum(probs)
    if total > 0:
        probs = probs / total

    freshness_label = f"{vitals.data_age_minutes}m ago" if vitals.data_age_minutes else "live"
    print(f"DEBUG [VITALS]: Applied context (freshness={freshness_label}, "
          f"injected={injected_symptoms}, extra_evidence={extra_evidence})")

    return probs, updated_features, vitals_analysis, extra_evidence


def get_fallback_response(reason: str) -> SymptomResponse:
    """Generates a safe default response when diagnosis is ambiguous.

    Args:
        reason: The explanation for falling back (e.g., "Symptoms not recognized").

    Returns:
        A SymptomResponse object recommending a General Physician.
    """
    return SymptomResponse(
        condition  = FALLBACK_CONDITION,
        confidence = 0,
        advice     = (
            f"{reason} "
            "A General Physician can evaluate your symptoms and refer you to "
            "the right specialist if needed."
        ),
        specialist = FALLBACK_SPECIALIST,
        next_steps = [
            "Describe your symptoms in more detail (e.g. 'itching, skin rash, fever')",
            "See a General Physician for an initial assessment",
            "Monitor symptoms and note any changes",
        ]
    )


# ══════════════════════════════════════════════════════════════════════════════
#  Ollama LLM Clinical Reasoning Engine
# ══════════════════════════════════════════════════════════════════════════════

MEDICAL_SYSTEM_PROMPT = """You are a clinical decision support assistant for the Famplus health application.
Your role is to analyze patient-reported symptoms and provide preliminary health guidance.

CRITICAL SAFETY RULES:
1. You are NOT a doctor. Always recommend consulting a qualified physician.
2. For ANY life-threatening symptoms, set urgency to "Emergency" and confidence to 85+.
3. Be conservative — when uncertain, recommend a General Physician.
4. NEVER dismiss chest pain, breathing difficulties, or neurological symptoms.
5. Consider the patient's vitals (if provided) when making your assessment.

EMERGENCY RED FLAGS (ALWAYS flag as "Emergency" urgency):
- Heavy/crushing chest pain → Cardiac Emergency → Cardiologist
- Chest pain + arm pain/jaw pain/cold sweat → Heart Attack → Cardiologist
- One-sided weakness + slurred speech → Stroke → Neurologist
- High fever + red spots + pain behind eyes → Dengue → Infectious Disease Specialist
- Coughing blood + persistent cough → TB/Pneumonia → Pulmonologist
- Severe breathing difficulty → Respiratory Emergency → Pulmonologist

COMMON SYMPTOM PATTERNS:
- Headache + blocked/runny nose + sneezing → Common Cold → General Physician
- Headache + blocked nose + facial pain → Sinusitis → ENT Specialist
- Fever + body ache + fatigue → Common Flu → General Physician
- Stomach pain + nausea + diarrhea → Gastroenteritis → Gastroenterologist
- Itching + skin rash → Allergy or Fungal Infection → Dermatologist/Allergist
- Joint pain + stiffness → Arthritis → Rheumatologist
- Burning urination + frequent urination → UTI → Urologist
- Heartburn + acidity + chest burning → GERD → Gastroenterologist

SPECIALIST NAMES (use ONLY these exact specialist names in the "specialist" field):
- Cardiologist (for heart/cardiac issues)
- Neurologist (for brain/neurological issues)
- Pulmonologist (for lung/breathing issues)
- Gastroenterologist (for stomach/digestive issues)
- Dermatologist (for skin issues)
- Rheumatologist (for joint/bone issues)
- Endocrinologist (for thyroid/hormone/diabetes issues)
- Infectious Disease Specialist (for infections/fever)
- ENT Specialist (for ear/nose/throat issues)
- Urologist (for urinary issues)
- Hepatologist (for liver issues)
- Allergist (for allergy issues)
- Sleep Specialist (for sleep issues)
- Vascular Surgeon (for vascular issues)
- General Physician (for general/unclear issues)

CONFIDENCE GUIDELINES:
- 80-100%: Strong symptom-disease match with multiple correlated symptoms
- 50-79%: Moderate match, symptoms are suggestive but not definitive
- 20-49%: Weak match, limited symptoms provided
- Below 20%: Very uncertain, default to General Physician

URGENCY LEVELS:
- "Emergency": Life-threatening, seek immediate care
- "High": Significant concern, see doctor within 24 hours
- "Normal": Monitor and schedule routine appointment

Provide 3 differential diagnoses in top_matches (most likely first).
Always include 3-4 practical precautions and next steps.
Respond ONLY with valid JSON matching the required schema."""


def is_ollama_available() -> bool:
    """Checks if Ollama is running and the configured model is pulled.

    Results are cached for OLLAMA_CHECK_INTERVAL seconds to avoid
    hammering the Ollama API on every request.
    """
    global _ollama_available, _ollama_last_check

    now = time.time()
    if _ollama_available is not None and (now - _ollama_last_check) < OLLAMA_CHECK_INTERVAL:
        return _ollama_available

    try:
        with httpx.Client(timeout=5) as client:
            resp = client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                available = any(OLLAMA_MODEL in name for name in model_names)
                _ollama_available = available
                _ollama_last_check = now
                if available:
                    print(f"✅ Ollama available with model '{OLLAMA_MODEL}'")
                else:
                    print(f"⚠️  Ollama running but '{OLLAMA_MODEL}' not found. Have: {model_names}")
                return available
    except Exception as e:
        print(f"⚠️  Ollama not reachable: {e}")

    _ollama_available = False
    _ollama_last_check = now
    return False


def predict_with_ollama(
    symptoms_text: str,
    vitals: Optional[VitalsContext] = None,
) -> Optional[SymptomResponse]:
    """Calls the local Ollama LLM for clinical reasoning on symptoms.

    Constructs a detailed prompt with symptom text and vitals context,
    then forces structured JSON output via Ollama's format parameter.

    Args:
        symptoms_text: Raw user input (e.g., "heavy chest pain and dizziness").
        vitals: Optional dashboard vitals for clinical context.

    Returns:
        A SymptomResponse if the LLM succeeds, or None to trigger ML fallback.
    """
    try:
        # ── Build user prompt with vitals context ─────────────────────────
        user_msg = f"Patient reports: \"{symptoms_text}\""

        if vitals:
            parts = []
            if vitals.age and vitals.age > 0:
                parts.append(f"Age: {vitals.age} years")
            if vitals.heart_rate and vitals.heart_rate > 0:
                parts.append(f"Heart Rate: {vitals.heart_rate} bpm")
            if vitals.blood_pressure:
                parts.append(f"Blood Pressure: {vitals.blood_pressure} mmHg")
            if vitals.sleep:
                parts.append(f"Sleep: {vitals.sleep}")
            if parts:
                user_msg += "\n\nPatient Vitals:\n" + "\n".join(f"- {p}" for p in parts)

        user_msg += (
            "\n\nAnalyze these symptoms carefully. Consider the most clinically "
            "likely condition, provide your confidence level, the recommended "
            "specialist, practical precautions, and next steps for the patient."
        )

        print(f"🤖 Ollama request: model={OLLAMA_MODEL}, symptoms='{symptoms_text}'")

        # ── Call Ollama with structured JSON output ──────────────────────
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
            resp = client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": MEDICAL_SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    "format": OllamaDiagnosis.model_json_schema(),
                    "stream": False,
                    "options": {
                        "temperature": 0,
                        "num_predict": 1024,
                    },
                },
            )

        if resp.status_code != 200:
            print(f"⚠️  Ollama HTTP {resp.status_code}")
            return None

        content = resp.json().get("message", {}).get("content", "")
        if not content:
            print("⚠️  Ollama returned empty content")
            return None

        # ── Parse structured response ────────────────────────────────────
        diagnosis = OllamaDiagnosis.model_validate_json(content)
        confidence = max(0, min(100, diagnosis.confidence))

        # Normalize specialist name (LLM sometimes outputs category labels)
        SPECIALIST_NORMALIZE = {
            "heart/cardiac": "Cardiologist",
            "brain/neurological": "Neurologist",
            "lung/breathing": "Pulmonologist",
            "stomach/digestive": "Gastroenterologist",
            "skin": "Dermatologist",
            "joint/bone": "Rheumatologist",
            "thyroid/hormone": "Endocrinologist",
            "infections/fever": "Infectious Disease Specialist",
            "ear/nose/throat": "ENT Specialist",
            "urinary": "Urologist",
            "liver": "Hepatologist",
            "allergy": "Allergist",
            "sleep": "Sleep Specialist",
            "vascular": "Vascular Surgeon",
            "general/unclear": "General Physician",
        }
        specialist = SPECIALIST_NORMALIZE.get(diagnosis.specialist.lower(), diagnosis.specialist)

        # Build vitals analysis annotations
        vitals_analysis: List[str] = []
        if vitals:
            if vitals.heart_rate and vitals.heart_rate > 100:
                vitals_analysis.append(f"❤️ Heart rate {vitals.heart_rate} bpm is elevated (tachycardia).")
            elif vitals.heart_rate and vitals.heart_rate < 60:
                vitals_analysis.append(f"❤️ Heart rate {vitals.heart_rate} bpm is low (bradycardia).")
            if vitals.blood_pressure:
                s, d = parse_bp(vitals.blood_pressure)
                if s > 140 or d > 90:
                    vitals_analysis.append(f"🩸 BP {vitals.blood_pressure} mmHg is elevated.")
            if vitals.sleep:
                sh = parse_sleep(vitals.sleep)
                if sh < 5:
                    vitals_analysis.append(f"😴 Sleep of {vitals.sleep} is insufficient.")

        # Map to TopMatch objects
        top_matches = [
            TopMatch(condition=tm.condition, confidence=max(0, min(100, tm.confidence)))
            for tm in diagnosis.top_matches[:3]
        ]

        print(f"🤖 Ollama result: {diagnosis.condition} ({confidence}%) → {specialist}")

        return SymptomResponse(
            condition       = diagnosis.condition,
            confidence      = confidence,
            advice          = diagnosis.advice,
            specialist      = specialist,
            description     = diagnosis.description or "No description available.",
            precautions     = diagnosis.precautions[:4],
            urgency         = diagnosis.urgency if diagnosis.urgency in ("Normal", "High", "Emergency") else "Normal",
            top_matches     = top_matches,
            next_steps      = diagnosis.next_steps[:4],
            vitals_analysis = vitals_analysis,
        )

    except httpx.TimeoutException:
        print("⚠️  Ollama timed out — falling back to ML model")
        return None
    except Exception as e:
        print(f"⚠️  Ollama error: {e} — falling back to ML model")
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  Endpoints
# ══════════════════════════════════════════════════════════════════════════════


def build_feature_vector(
    valid_features: List[str],
    all_symptoms: List[str],
    vitals_context: Optional[VitalsContext] = None,
) -> np.ndarray:
    """Builds the combined symptom + vitals feature vector for the model.

    For XGBoost v2 models, the feature vector has:
      - N binary columns for symptoms (multi-hot encoded)
      - 4 scaled numerical columns for vitals (Age, HeartRate, SystolicBP, DiastolicBP)

    For legacy Naive Bayes models, only the symptom columns are used.

    Args:
        valid_features: List of recognized symptom tokens.
        all_symptoms: Full symptom vocabulary from model metadata.
        vitals_context: Optional vitals from the user's dashboard.

    Returns:
        A numpy feature vector ready for model.predict_proba().
    """
    n_symptoms = len(all_symptoms)

    if model_type in ('xgboost', 'gradient_boosting') and vitals_scaler is not None:
        # v2: Combined symptom + vitals vector
        n_vitals = len(vitals_columns)  # 4
        X = np.zeros(n_symptoms + n_vitals, dtype=np.float32)

        # Fill symptom columns (binary)
        for s in valid_features:
            if s in all_symptoms:
                idx = all_symptoms.index(s)
                X[idx] = 1.0

        # Fill vitals columns (raw values → will be scaled)
        raw_vitals = np.zeros((1, n_vitals), dtype=np.float32)

        # Defaults (population mean) — used when vitals are not provided
        defaults = [35, 75, 120, 78]  # Age, HR, SBP, DBP

        if vitals_context is not None:
            # Age
            raw_vitals[0, 0] = float(vitals_context.age) if vitals_context.age and vitals_context.age > 0 else defaults[0]
            # HeartRate
            raw_vitals[0, 1] = float(vitals_context.heart_rate) if vitals_context.heart_rate and vitals_context.heart_rate > 0 else defaults[1]
            # Blood Pressure → SystolicBP, DiastolicBP
            if vitals_context.blood_pressure:
                sbp, dbp = parse_bp(vitals_context.blood_pressure)
                raw_vitals[0, 2] = float(sbp)
                raw_vitals[0, 3] = float(dbp)
            else:
                raw_vitals[0, 2] = defaults[2]
                raw_vitals[0, 3] = defaults[3]
        else:
            raw_vitals[0, :] = defaults

        # Scale vitals using the same scaler from training
        scaled_vitals = vitals_scaler.transform(raw_vitals)
        X[n_symptoms:] = scaled_vitals[0]

        return X
    else:
        # Legacy: symptom-only vector for Naive Bayes
        X = np.zeros(n_symptoms, dtype=np.float32)
        for s in valid_features:
            if s in all_symptoms:
                idx = all_symptoms.index(s)
                X[idx] = 1.0
        return X


# ==============================================================================
# SECTION 3: INFERENCE ENDPOINTS (FASTAPI)
# ==============================================================================

@app.post("/predict_symptoms")
async def predict_symptoms(request: SymptomRequest):
    """
    Main inference entry point. Predicts potential health conditions based on 
    symptoms and real-time vitals context.
    
    Workflow:
    1. Validate asset presence (model, metadata).
    2. Vectorize symptoms via normalize_input.
    3. Inject and normalize vitals (Age, HR, BP).
    4. Run Classifier (HGB/XGBoost).
    5. Apply Safety Overrides (Emergency hallmarks).
    6. Parallel: Fetch deep reasoning from LLM (Gemma3).
    7. Formulate and return S-Tier JSON response.
    """
    data = request
    # ── Easter Egg Check ──────────────────────────────────────────────────────
    text_check = data.symptoms.lower().replace("'", "").strip()
    if any(phrase in text_check for phrase in ["i am dead", "im dead", "i feel dead", "already dead"]):
        return SymptomResponse(
            condition   = "Deceased",
            confidence  = 100.0,
            advice      = "Well, if you're dead, my AI capabilities are somewhat limited! I'd recommend a good ghost whisperer or exorcist. Or maybe just a nap?",
            specialist  = "Professional Exorcist",
            description = "The patient has ceased to be. They are an ex-patient. They have shuffled off this mortal coil.",
            precautions = ["Avoid salt circles", "Practice your booing", "Do not cross the streams", "Stay away from Ghostbusters"],
            urgency     = "Normal",
            top_matches = [TopMatch(condition="Deceased", confidence=100)],
            next_steps  = ["Haunt a spooky mansion", "Poltergeist activities", "Apply for the Afterlife Waiting Room"]
        )

    # ── Ollama LLM Primary Path ─────────────────────────────────────────────
    # The LLM provides far superior clinical reasoning compared to the
    # statistical ML model. Falls back automatically if Ollama is down.
    if is_ollama_available():
        ollama_result = predict_with_ollama(data.symptoms, data.vitals_context)
        if ollama_result is not None:
            return ollama_result
        print("⚠️  Ollama returned None, falling back to local ML model")

    # ── Fallback: Local ML Model ───────────────────────────────────────────
    # ── Step 1: Normalize & Extract Symptoms ──
    input_symptoms = normalize_input(data.symptoms, known_symptoms=metadata['all_symptoms'])
    print(f"DEBUG [NLP]: Input='{data.symptoms}' -> Matched={input_symptoms}")

    # Guard: model must be loaded
    if not model or not metadata:
        return SymptomResponse(
            condition  = "Service Initializing",
            confidence = 0,
            advice     = "The AI model is still loading. Please try again in a moment.",
            specialist = "General Physician",
        )

    le            = metadata['label_encoder']
    raw_query     = data.symptoms.strip().lower()

    # ── Step 1: Direct Disease-Name Lookup ────────────────────────────────────
    # If the user literally types a disease name, return full info immediately.
    for disease in le.classes_:
        if raw_query == disease.lower().strip():
            description = metadata['description_map'].get(disease, "No description available.")
            precautions = [p.capitalize() for p in metadata['precaution_map'].get(disease, [])]
            specialist  = metadata['specialist_map'].get(disease, FALLBACK_SPECIALIST)
            is_scary    = disease in SCARY_DISEASES
            return SymptomResponse(
                condition   = disease,
                confidence  = 100,
                advice      = f"You searched for {disease}. We recommend consulting a {specialist}{' urgently' if is_scary else ''}.",
                specialist  = specialist,
                description = description,
                precautions = precautions,
                top_matches = [TopMatch(condition=disease, confidence=100)],
                next_steps  = ["Seek medical attention immediately", "Do not delay getting help"] if is_scary else ["Book an appointment with a specialist", "Monitor symptoms closely"],
                urgency     = "High" if is_scary else "Normal"
            )

    # ── Step 2: Parse & Validate Input Symptoms ────────────────────────────────
    input_symptoms = normalize_input(data.symptoms, known_symptoms=metadata['all_symptoms'])
    # Only keep symptoms that exist in the trained vocabulary
    valid_features = [s for s in input_symptoms if s in metadata['all_symptoms']]

    if not valid_features:
        return get_fallback_response(
            "We could not recognize any specific medical symptoms in your input."
        )

    # ── Step 3: Severity Score (used for urgency determination) ───────────────
    severity_score = sum(metadata['severity_map'].get(s, 0) for s in valid_features)

    # ── Step 4: Build Feature Vector & Get Model Probabilities ────────────────
    # For XGBoost v2: vitals are embedded DIRECTLY into the feature vector,
    # so the model itself can learn age/BP/HR-disease correlations.
    X_input = build_feature_vector(
        valid_features  = valid_features,
        all_symptoms    = metadata['all_symptoms'],
        vitals_context  = data.vitals_context,
    )

    raw_probabilities = model.predict_proba([X_input])[0]

    vitals_in_model = (model_type in ('xgboost', 'gradient_boosting') and vitals_scaler is not None)
    if vitals_in_model and data.vitals_context:
        print(f"DEBUG [VITALS→MODEL]: Vitals embedded directly into XGBoost feature vector")

    # ── Step 5: Apply Conservative Adjustments ────────────────────────────────
    adjusted_probs = apply_conservative_adjustments(raw_probabilities, valid_features, le)

    # ── Step 5a: Vitals Context Integration (Rule-Based Layer) ────────────────
    # Even with vitals in the model, the rule-based layer adds safety analysis
    # and provides human-readable explanations for the vitals_analysis field.
    vitals_analysis: list[str] = []
    vitals_evidence = 0
    if data.vitals_context is not None:
        adjusted_probs, valid_features, vitals_analysis, vitals_evidence = apply_vitals_context(
            vitals   = data.vitals_context,
            adjusted_probs = adjusted_probs,
            valid_features = valid_features,
            all_symptoms   = metadata['all_symptoms'],
            X_input        = X_input,
            le             = le,
        )

    # ── Step 5b: Emergency Override Check ───────────────────────────────────────
    # CRITICAL: Before applying sparse-input penalties that could bury an
    # emergency, check if definitive clinical markers trigger an override.
    emergency_override = check_emergency_override(valid_features)

    # ── Step 5c: Sparse Input Adjustments ─────────────────────────────────────
    # When few symptoms are provided, boost common diseases and penalize
    # scary diseases more aggressively to avoid alarming false positives.
    # BUT: Skip the sparse penalty for scary diseases when an emergency override fired.
    # Vitals-derived evidence counts toward the symptom count.
    n_symptoms = len(valid_features) + vitals_evidence
    if n_symptoms <= 2:
        for i, disease in enumerate(le.classes_):
            if disease in COMMON_DISEASES:
                adjusted_probs[i] *= SPARSE_INPUT_COMMON_BOOST
            if disease in SCARY_DISEASES:
                # Don't penalize the overridden disease — it has definitive markers
                if emergency_override and disease == emergency_override['disease']:
                    continue
                adjusted_probs[i] *= (0.01 if n_symptoms == 1 else 0.05)
        total = np.sum(adjusted_probs)
        if total > 0:
            adjusted_probs = adjusted_probs / total

    # ── Step 6: Get Top 3 Predictions ─────────────────────────────────────────
    top_indices = np.argsort(adjusted_probs)[::-1][:3]
    top_matches = [
        TopMatch(
            condition  = le.inverse_transform([idx])[0],
            confidence = int(adjusted_probs[idx] * 100)
        )
        for idx in top_indices
    ]

    # ── Step 7: Evaluate Primary Prediction ───────────────────────────────────
    primary_disease    = top_matches[0].condition
    primary_confidence = adjusted_probs[top_indices[0]]  # float 0.0–1.0
    confidence_pct     = int(primary_confidence * 100)

    # ── Step 7b: Symptom Count Confidence Cap ─────────────────────────────────
    # Hard-cap confidence when only 1-2 symptoms are provided
    # BUT: Skip the cap if emergency override fired (definitive markers = real evidence)
    if not emergency_override:
        if n_symptoms == 1:
            primary_confidence = min(primary_confidence, SINGLE_SYMPTOM_MAX_CONFIDENCE)
            confidence_pct = min(confidence_pct, int(SINGLE_SYMPTOM_MAX_CONFIDENCE * 100))
        elif n_symptoms == 2:
            primary_confidence = min(primary_confidence, FEW_SYMPTOMS_MAX_CONFIDENCE)
            confidence_pct = min(confidence_pct, int(FEW_SYMPTOMS_MAX_CONFIDENCE * 100))

    # ── Step 7c: Emergency Override Activation ────────────────────────────────
    # If the override fired, force the emergency disease as the final result
    # regardless of what the model predicted. This is the nuclear option for
    # patient safety — definitive markers should NEVER be ignored.
    if emergency_override:
        override_disease    = emergency_override['disease']
        override_confidence = emergency_override['confidence']
        specialist = metadata['specialist_map'].get(override_disease, FALLBACK_SPECIALIST)

        # Format markers for readability
        formatted_markers = [marker.replace('_', ' ') for marker in emergency_override['matched_markers'][:3]]
        markers_str = " and ".join(formatted_markers) if len(formatted_markers) == 2 else ", ".join(formatted_markers)

        advice = (
            f"⚠️ URGENT: Your symptoms strongly indicate a potential medical emergency. "
            f"The presence of {markers_str} is a significant clinical indicator for {override_disease}. "
            f"Please proceed to an emergency department or consult a {specialist} immediately. "
            f"Do not delay in seeking professional medical evaluation."
        )

        description = metadata['description_map'].get(override_disease, "No description available.")
        precautions = [p.capitalize() for p in metadata['precaution_map'].get(override_disease, [])]

        # Force the override disease into top_matches at position 0
        override_top_matches = [TopMatch(condition=override_disease, confidence=override_confidence)]
        # Keep other predictions as secondary context
        for tm in top_matches:
            if tm.condition != override_disease and len(override_top_matches) < 3:
                override_top_matches.append(tm)

        return SymptomResponse(
            condition       = override_disease,
            confidence      = override_confidence,
            advice          = advice,
            specialist      = specialist,
            description     = description,
            precautions     = precautions,
            urgency         = "Emergency",
            top_matches     = override_top_matches,
            next_steps      = [
                "🚨 Seek emergency medical attention immediately",
                "Call emergency services or go to the nearest hospital",
                "Do not drive yourself — have someone take you",
                "Note symptom onset time for the treating physician",
            ],
            vitals_analysis = vitals_analysis,
        )

    # ── Step 8: Scary Disease Final Gate ──────────────────────────────────────
    # Even after adjustment, if confidence is still below the high threshold
    # for a scary disease, we fall back to the 2nd prediction or a safe default.
    # NOTE: If an emergency override fired, we never reach this point.
    is_scary = primary_disease in SCARY_DISEASES

    if is_scary and primary_confidence < SCARY_CONFIDENCE_THRESHOLD:
        # The scary disease still "won" after penalties, but we're not confident enough.
        # Try using the 2nd-best match if it's not also scary.
        if len(top_matches) > 1 and top_matches[1].condition not in SCARY_DISEASES:
            final_disease    = top_matches[1].condition
            final_confidence = top_matches[1].confidence
        else:
            # Fall back completely to a safe general assessment
            final_disease    = FALLBACK_CONDITION
            final_confidence = confidence_pct

        advice = (
            "Your symptoms could have several causes. "
            "We recommend seeing a General Physician for a proper assessment. "
            "They will refer you to the right specialist if needed."
        )
        specialist = FALLBACK_SPECIALIST

    else:
        final_disease    = primary_disease
        final_confidence = confidence_pct

        # Soft messaging for confident predictions
        if primary_confidence >= SCARY_CONFIDENCE_THRESHOLD and is_scary:
            # Very high confidence on scary disease — still frame it as "please see X doctor"
            specialist = metadata['specialist_map'].get(final_disease, FALLBACK_SPECIALIST)
            advice = (
                f"Your symptoms strongly suggest you should see a {specialist} urgently. "
                f"Please do not delay — book an appointment as soon as possible."
            )
        elif primary_confidence >= LOW_CONFIDENCE_THRESHOLD:
            # Confident, not scary — standard recommendation
            specialist = metadata['specialist_map'].get(final_disease, FALLBACK_SPECIALIST)
            advice     = (
                f"Your symptoms are consistent with {final_disease}. "
                f"We recommend consulting a {specialist} for a proper evaluation."
            )
        else:
            # Low confidence — be vague, recommend GP
            specialist = metadata['specialist_map'].get(final_disease, FALLBACK_SPECIALIST)
            advice     = (
                f"Your symptoms may indicate {final_disease} or something similar. "
                f"We suggest visiting a {specialist} or a General Physician to be sure."
            )

    # ── Sparse Input Advisory Override ────────────────────────────────────
    # When very few symptoms are provided, override advice with a more
    # cautious message regardless of the predicted disease.
    if n_symptoms <= 2 and not (is_scary and primary_confidence >= SCARY_CONFIDENCE_THRESHOLD):
        advice = (
            f"Based on limited symptoms, this could possibly indicate {final_disease}, "
            f"but many conditions share these symptoms. "
            f"Describing additional symptoms would improve diagnostic accuracy. "
            f"We recommend consulting a {specialist} or General Physician for evaluation."
        )

    # ── Step 9: Metadata Enrichment ───────────────────────────────────────────
    description = metadata['description_map'].get(final_disease, "No description available.")
    precautions = [p.capitalize() for p in metadata['precaution_map'].get(final_disease, [])]

    # ── Step 10: Urgency & Next Steps ─────────────────────────────────────────
    # High urgency when severity score exceeds threshold (sum of symptom weights) or confident scary disease
    is_scary_with_high_conf = (final_disease in SCARY_DISEASES) and (final_confidence >= SCARY_CONFIDENCE_THRESHOLD * 100)
    urgency = "High" if severity_score > 15 or is_scary_with_high_conf else "Normal"

    if urgency == "High":
        advice    += " ⚠️ Your symptoms appear clinically significant — please seek care promptly."
        next_steps = [
            "Seek medical attention soon",
            "Avoid strenuous activity",
            "Note symptom onset time and intensity",
        ]
    else:
        next_steps = [
            "Monitor your symptoms over the next 24 hours",
            "Stay hydrated and get adequate rest",
            f"Book an appointment with a {specialist}",
        ]

    return SymptomResponse(
        condition       = final_disease,
        confidence      = final_confidence,
        advice          = advice,
        specialist      = specialist,
        description     = description,
        precautions     = precautions,
        urgency         = urgency,
        top_matches     = top_matches,
        next_steps      = next_steps,
        vitals_analysis = vitals_analysis,
    )


@app.post("/predict_wellness")
async def predict_wellness(request: WellnessRequest):
    """
    Wellness Analytics Engine. Evaluates vitals trends and historical averages 
    to provide a holistic 'Guardian Score'.
    
    Logic:
    - Rule-based analysis of HR/BP ranges relative to user Age.
    - Sleep quality assessment.
    - Wellness index calculation (0-100).
    """
    data = request
    history = data.vitals_history
    if not history:
        return WellnessResponse(
            score=0, status="Unknown",
            recommendation="No vitals data provided.",
            anomalies=[]
        )

    # Build a DataFrame from the history list
    df = pd.DataFrame([h.dict() for h in history])
    df['sys'], df['dia'] = zip(*df['bloodPressure'].apply(parse_bp))

    # Focus on the last 5 readings for the trend
    recent = df.tail(5)
    r_sys  = recent['sys'].mean()
    r_dia  = recent['dia'].mean()
    r_hr   = recent['heartRate'].mean()

    risk      = 0
    anomalies = []

    # Blood pressure check (standard clinical thresholds)
    if r_sys > 140 or r_dia > 90:
        risk += 40
        anomalies.append("Elevated Blood Pressure")

    # Heart rate check (normal resting: 60–100 bpm)
    if r_hr > 100:
        risk += 40
        anomalies.append("Elevated Heart Rate")

    # Sleep quality check (using latest entry)
    sleep_hours = parse_sleep(df['sleep'].iloc[-1])
    if sleep_hours < 6:
        risk += 20
        anomalies.append("Insufficient Sleep")

    score = max(0, 100 - risk)

    if risk < 15:
        status         = "Healthy"
        recommendation = "Your vitals look great! Keep up the healthy lifestyle."
    elif risk < 60:
        status         = "Requires Monitoring"
        recommendation = "Some vitals are slightly elevated. Consider lifestyle adjustments and follow up with a doctor."
    else:
        status         = "Consult a Doctor"
        recommendation = "Your vitals indicate potential health concerns. Please consult a General Physician soon."

    return WellnessResponse(
        score          = int(score),
        status         = status,
        recommendation = recommendation,
        anomalies      = anomalies,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
