"""
Famplus AI Inference Engine
----------------------------
FastAPI server exposing two endpoints for health analysis:
  POST /predict_symptoms  — symptom-to-doctor recommendation (NLP + Model)
  POST /predict_wellness  — vitals history wellness scoring (Rule-based Trend Analysis)

Architectural Overview:
  The engine uses a decoupled architecture where the ML model (Bernoulli Naive Bayes) 
  is loaded as a serialized asset. It sits behind an NLP pre-processing layer that 
  maps natural language (free text) to a binary feature vector compatible with the 
  model's trained vocabulary.

Design Philosophy (IMPORTANT — "General Physician First"):
  - The model should recommend specialists, NOT provide a final clinical diagnosis.
  - Conservative Thresholding: Scary/Severe diseases require higher confidence levels.
  - Fallback logic ensures that ambiguous cases are always referred to a General Physician (GP).
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
import joblib
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Famplus AI Engine", version="2.0")

# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow all origins for the internal Famplus frontend
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

model    = None
metadata = None

if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
    try:
        model    = joblib.load(MODEL_PATH)
        metadata = joblib.load(METADATA_PATH)
        print("✅ ML Model and Metadata loaded successfully")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
else:
    print("⚠️  ML Model not found. Please run generate_synthetic_data.py then train_model.py first.")


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

# Minimum model confidence required before showing a scary disease name.
# Below this, the scary disease is replaced with its fallback.
SCARY_CONFIDENCE_THRESHOLD = 0.72   # 72% — lowered from 82% after clinical data expansion

# Penalty multiplier applied to scary disease probabilities when markers are absent.
# 0.03 = drastically reduce its probability so a common disease wins instead.
SCARY_PENALTY_MULTIPLIER   = 0.03

# Diseases that are common/benign and should be preferred in ambiguous cases.
# These get a mild boost to edge out scary false positives.
COMMON_DISEASES: list[str] = [
    'Common Cold', 'Common Flu', 'Allergy', 'Fever', 'Gastroenteritis',
    'Migraine', 'Acne', 'Urinary tract infection', 'Fungal infection',
    'Insomnia', 'Slight Headache', 'Stomach ache', 'Drug Reaction', 'GERD',
]

# Boost multiplier for common diseases (gentle — just enough to prefer them
# over scary diseases when evidence is ambiguous)
COMMON_BOOST_MULTIPLIER = 1.25

# When the top-1 confidence falls below this threshold, the UI messaging
# switches from "You likely have X" to a softer "Possible X" framing.
LOW_CONFIDENCE_THRESHOLD = 0.55    # 55%

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

class SymptomRequest(BaseModel):
    symptoms: str

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
    disclaimer:   str           = (
        "DISCLAIMER: This is an AI-powered health guide, not a medical diagnosis. "
        "Please consult a qualified doctor for any health concerns."
    )


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
    'leg pain':               'pain_behind_the_eyes',  # use general pain mapping

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
    'can t sleep':            'fatigue',
    'insomnia':               'fatigue',
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
    'fragile nails':          'fragile_nails',
    'brittle nails':          'fragile_nails',
}


def normalize_input(text: str, known_symptoms: Optional[List[str]] = None) -> List[str]:
    """Advanced NLP symptom extractor that understands natural language sentences.

    This function performs a tiered matching strategy:
    1. Sanitization: Lowercasing and removing punctuation.
    2. Phrase Matching: Checks for multi-word symptoms ('chest pain') via trigrams and bigrams.
    3. Token Matching: Checks individual words against the known vocabulary and aliases.
    4. Fallback: Splits by separators (commas, 'and') to catch manually typed lists.

    Args:
        text: The raw user input string (e.g., "I have a sharp chest pain and cough").
        known_symptoms: The list of valid symptom tokens from the trained model metadata.

    Returns:
        A list of recognized symptom tokens (e.g., ['chest_pain', 'cough']).
    """
    # ── 1. Clean: lowercase, remove punctuation, collapse whitespace ──────────
    import re
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Tokenize
    tokens = cleaned.split()

    found: list[str]    = []
    used_indices: set   = set()  # track consumed token positions to avoid double-matching

    # ── 2. Multi-word phrase matching (5-gram to bigram) ───────────────────
    for window in (5, 4, 3, 2):
        for i in range(len(tokens) - window + 1):
            if any(j in used_indices for j in range(i, i + window)):
                continue  # skip if any token already consumed
            phrase = " ".join(tokens[i : i + window])
            if phrase in SYMPTOM_ALIASES:
                mapped = SYMPTOM_ALIASES[phrase]
                if mapped not in found:
                    found.append(mapped)
                for j in range(i, i + window):
                    used_indices.add(j)

    # ── 3 & 4. Single-token matching ─────────────────────────────────────────
    for i, token in enumerate(tokens):
        if i in used_indices:
            continue  # already consumed in a phrase match
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

    # ── 5. Fallback: also try the old comma/and splitting for typed lists ──────
    # Handles "itching, skin rash, fever" style input when NLP finds nothing
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

        # ── Penalize scary diseases unless markers are present ─────────────────
        if disease in SCARY_DISEASES:
            required_markers = SCARY_DISEASES[disease]
            # User must provide at least ONE of the disease's critical markers
            user_has_marker  = any(m in valid_features for m in required_markers)

            if not user_has_marker:
                # Drastically reduce probability — a scary disease without ANY
                # of its hallmark symptoms is almost certainly a false positive
                adjusted[i] *= SCARY_PENALTY_MULTIPLIER

    # Re-normalize so all probabilities still sum to 1.0
    total = np.sum(adjusted)
    if total > 0:
        adjusted = adjusted / total

    return adjusted


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
#  Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/predict_symptoms", response_model=SymptomResponse)
def predict_symptoms(data: SymptomRequest):
    """Predicts a likely health condition and recommends a specialist.

    Flow:
    1. Direct Lookup: Checks if query is a known disease name.
    2. Parsing: Extracts symptoms using the NLP pipeline (`normalize_input`).
    3. Inference: Computes probabilities via the Bernoulli Naive Bayes model.
    4. Safety Logic: Adjusts probabilities and gates severe diagnoses.
    5. Enrichment: Adds precautions and specialist info from metadata.
    """
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
    X_input = np.zeros(len(metadata['all_symptoms']), dtype=np.float32)
    for s in valid_features:
        idx          = metadata['all_symptoms'].index(s)
        X_input[idx] = 1.0

    raw_probabilities = model.predict_proba([X_input])[0]

    # ── Step 5: Apply Conservative Adjustments ────────────────────────────────
    adjusted_probs = apply_conservative_adjustments(raw_probabilities, valid_features, le)

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

    # ── Step 8: Scary Disease Final Gate ──────────────────────────────────────
    # Even after adjustment, if confidence is still below the high threshold
    # for a scary disease, we fall back to the 2nd prediction or a safe default.
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
        condition   = final_disease,
        confidence  = final_confidence,
        advice      = advice,
        specialist  = specialist,
        description = description,
        precautions = precautions,
        urgency     = urgency,
        top_matches = top_matches,
        next_steps  = next_steps,
    )


@app.post("/predict_wellness", response_model=WellnessResponse)
def predict_wellness(data: WellnessRequest):
    """Analyzes vitals history to generate a health status score.

    Uses a trend-aware heuristic to detect anomalies in Blood Pressure, 
    Heart Rate, and Sleep patterns over the last 5 logs.
    """
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
