"""
Synthetic Medical Training Data Generator (v2 — Vitals-Aware)
--------------------------------------------------------------
This script generates medically plausible synthetic data to balance 
under-represented classes in the disease training set.

v2 Enhancement (Vitals-Aware):
  Each synthetic row now includes medically realistic vital signs:
    - Age         (years)
    - HeartRate   (bpm)
    - SystolicBP  (mmHg)
    - DiastolicBP (mmHg)
  These are sampled from per-disease clinical distributions so the 
  downstream XGBoost model can learn the correlation between vitals 
  and disease severity.

Algorithm:
  1. Profile Extraction: Learns core vs. secondary symptoms for each disease.
  2. Vitals Sampling: Generates age, heart rate, and blood pressure from 
     medically plausible ranges per disease.
  3. Weighted Sampling: Generates new rows by combining hallmark markers with 
     statistically likely secondary symptoms.
  4. Noise Injection: Injects medically irrelevant symptoms to improve model 
     robustness and generalize to noisy user inputs.
"""

import pandas as pd
import numpy as np
import os
import random

# ── Paths ──────────────────────────────────────────────────────────────────────
DATASET_PATH    = '../dataset/archive/dataset.csv'
SEVERITY_PATH   = '../dataset/archive/Symptom-severity.csv'
OUTPUT_PATH     = '../dataset/archive/synthetic_data.csv'

# ── Tuning knobs ───────────────────────────────────────────────────────────────
# How many total rows we want per disease after combining real + synthetic
TARGET_ROWS_PER_DISEASE = 2000

# Probability that a given noise symptom gets injected into a row (0.0 – 1.0)
NOISE_PROBABILITY = 0.15   # 15%  →  more robust against irrelevant inputs

# How many noise symptoms can be added per row at most
MAX_NOISE_SYMPTOMS = 3

# Min / max symptoms per synthetic sample (mimics real patient visit complexity)
MIN_SYMPTOMS = 3
MAX_SYMPTOMS = 8

# Fix randomness so results are reproducible during development
RANDOM_SEED = 2024
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ══════════════════════════════════════════════════════════════════════════════
#  Disease → Vitals Clinical Profiles
#  Each disease gets a medically realistic vitals distribution.
#  Format: { 'age': (mean, std), 'hr': (mean, std), 'sbp': (mean, std), 'dbp': (mean, std) }
# ══════════════════════════════════════════════════════════════════════════════

# Default vitals for diseases without a specific profile
DEFAULT_VITALS_PROFILE = {
    'age': (35, 15),    # Mean 35, std 15 → broad general population
    'hr':  (75, 10),    # Normal resting heart rate
    'sbp': (120, 12),   # Normal systolic BP
    'dbp': (78, 8),     # Normal diastolic BP
}

DISEASE_VITALS_PROFILES = {
    # ── Cardiac / Vascular ─────────────────────────────────────────────────
    'Heart attack': {
        'age': (62, 10),    # Skewed older
        'hr':  (115, 25),   # Higher tachycardia for MI
        'sbp': (165, 25),   # Extreme hypertension risk
        'dbp': (102, 15),
    },
    'Hypertension': {
        'age': (55, 12),
        'hr':  (85, 12),
        'sbp': (160, 20),   # Higher threshold
        'dbp': (100, 10),
    },
    'Hypertension ': {      
        'age': (55, 12),
        'hr':  (85, 12),
        'sbp': (160, 20),
        'dbp': (100, 10),
    },
    # ── Stroke ─────────────────────────────────────────────────────────────
    'Paralysis (brain hemorrhage)': {
        'age': (65, 12),    
        'hr':  (95, 20),
        'sbp': (185, 25),   # Critical hypertension is classic for hemorrhage
        'dbp': (110, 15),
    },
    # ── Severe Infections ──────────────────────────────────────────────────
    'Pneumonia': {
        'age': (55, 20),
        'hr':  (110, 18),   # High tachycardia in respiratory distress
        'sbp': (115, 15),   # Potential sepsis-driven hypotension
        'dbp': (70, 10),
    },
    'Dengue': {
        'age': (28, 14),
        'hr':  (105, 15),   
        'sbp': (95, 15),    # Hypotension (Shock syndrome)
        'dbp': (62, 12),
    },
    'Malaria': {
        'age': (30, 15),
        'hr':  (108, 18),
        'sbp': (105, 12),
        'dbp': (65, 10),
    },

    'Varicose veins': {
        'age': (48, 15),
        'hr':  (72, 8),
        'sbp': (128, 14),
        'dbp': (82, 8),
    },
    'Migraine': {
        'age': (32, 12),
        'hr':  (78, 10),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'Cervical spondylosis': {
        'age': (55, 12),
        'hr':  (72, 8),
        'sbp': (130, 14),
        'dbp': (84, 8),
    },
    '(vertigo) Paroymsal  Positional Vertigo': {
        'age': (50, 15),
        'hr':  (74, 10),
        'sbp': (125, 12),
        'dbp': (80, 8),
    },
    'Common Cold': {
        'age': (28, 15),
        'hr':  (80, 8),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'Common Flu': {
        'age': (30, 15),
        'hr':  (88, 10),
        'sbp': (116, 10),
        'dbp': (74, 8),
    },
    'Tuberculosis': {
        'age': (38, 15),
        'hr':  (90, 12),
        'sbp': (115, 12),
        'dbp': (72, 8),
    },
    'Bronchial Asthma': {
        'age': (25, 15),
        'hr':  (88, 12),
        'sbp': (120, 10),
        'dbp': (78, 8),
    },
    'Typhoid': {
        'age': (25, 12),
        'hr':  (85, 10),
        'sbp': (110, 10),
        'dbp': (70, 8),
    },
    'Chicken pox': {
        'age': (12, 8),
        'hr':  (90, 12),
        'sbp': (110, 10),
        'dbp': (70, 8),
    },
    'Hepatitis B': {
        'age': (35, 14),
        'hr':  (78, 10),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'Hepatitis C': {
        'age': (40, 14),
        'hr':  (76, 10),
        'sbp': (120, 10),
        'dbp': (78, 8),
    },
    'Hepatitis D': {
        'age': (38, 14),
        'hr':  (78, 10),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'Hepatitis E': {
        'age': (30, 12),
        'hr':  (80, 10),
        'sbp': (116, 10),
        'dbp': (74, 8),
    },
    'hepatitis A': {
        'age': (22, 12),
        'hr':  (82, 10),
        'sbp': (114, 10),
        'dbp': (72, 8),
    },
    'Alcoholic hepatitis': {
        'age': (45, 12),    # Associated with prolonged alcohol use
        'hr':  (85, 12),
        'sbp': (130, 14),
        'dbp': (85, 10),
    },
    'Chronic cholestasis': {
        'age': (48, 14),
        'hr':  (74, 8),
        'sbp': (122, 12),
        'dbp': (80, 8),
    },
    'Jaundice': {
        'age': (30, 18),
        'hr':  (80, 10),
        'sbp': (116, 10),
        'dbp': (74, 8),
    },
    'Heart attack': {
        'age': (62, 10),
        'hr':  (115, 25),
        'sbp': (165, 25),
        'dbp': (102, 15),
    },
    'Hypertension': {
        'age': (55, 12),
        'hr':  (85, 12),
        'sbp': (160, 20),
        'dbp': (100, 10),
    },
    'Paralysis (brain hemorrhage)': {
        'age': (65, 12),
        'hr':  (95, 20),
        'sbp': (185, 25),
        'dbp': (110, 15),
    },
    'Pneumonia': {
        'age': (55, 20),
        'hr':  (110, 18),
        'sbp': (115, 15),
        'dbp': (70, 10),
    },
    'Dengue': {
        'age': (28, 14),
        'hr':  (105, 15),
        'sbp': (95, 15),
        'dbp': (62, 12),
    },
    'Malaria': {
        'age': (30, 15),
        'hr':  (108, 18),
        'sbp': (105, 12),
        'dbp': (65, 10),
    },
    'Diabetes': {
        'age': (52, 14),
        'hr':  (82, 12),
        'sbp': (145, 18),
        'dbp': (92, 10),
    },
    'Hypoglycemia': {
        'age': (35, 15),
        'hr':  (110, 15),   # Higher tachycardia for hypo
        'sbp': (95, 12),    # Hypotension
        'dbp': (60, 10),
    },
    'Hyperthyroidism': {
        'age': (35, 12),
        'hr':  (112, 14),   # Very high HR
        'sbp': (145, 14),
        'dbp': (70, 10),
    },
    'Hypothyroidism': {
        'age': (42, 14),
        'hr':  (52, 8),     # Very low HR
        'sbp': (110, 10),
        'dbp': (85, 8),
    },
    'GERD': {
        'age': (40, 14),
        'hr':  (76, 8),
        'sbp': (122, 10),
        'dbp': (80, 8),
    },
    'Gastroenteritis': {
        'age': (28, 14),
        'hr':  (88, 12),    # Dehydration can cause tachycardia
        'sbp': (112, 12),
        'dbp': (72, 10),
    },
    'Peptic ulcer diseae': {
        'age': (42, 14),
        'hr':  (78, 10),
        'sbp': (120, 10),
        'dbp': (78, 8),
    },
    'Dimorphic hemmorhoids(piles)': {
        'age': (42, 14),
        'hr':  (74, 8),
        'sbp': (122, 10),
        'dbp': (80, 8),
    },

    # ── Endocrine / Metabolic ──────────────────────────────────────────────
    'Diabetes': {
        'age': (50, 14),
        'hr':  (80, 10),
        'sbp': (138, 16),   # Often comorbid with hypertension
        'dbp': (88, 10),
    },
    'Diabetes ': {          # Trailing space variant
        'age': (50, 14),
        'hr':  (80, 10),
        'sbp': (138, 16),
        'dbp': (88, 10),
    },
    'Hypoglycemia': {
        'age': (35, 15),
        'hr':  (95, 14),    # Sympathetic activation → tachycardia
        'sbp': (105, 12),   # May drop during episode
        'dbp': (68, 10),
    },
    'Hyperthyroidism': {
        'age': (35, 12),
        'hr':  (100, 14),   # Thyroid-driven tachycardia
        'sbp': (135, 14),
        'dbp': (75, 10),    # Wide pulse pressure
    },
    'Hypothyroidism': {
        'age': (42, 14),
        'hr':  (58, 8),     # Bradycardia
        'sbp': (118, 10),
        'dbp': (82, 8),
    },

    # ── Dermatological ─────────────────────────────────────────────────────
    'Acne': {
        'age': (18, 6),     # Teenagers / young adults
        'hr':  (75, 8),
        'sbp': (115, 8),
        'dbp': (72, 6),
    },
    'Psoriasis': {
        'age': (35, 14),
        'hr':  (74, 8),
        'sbp': (120, 10),
        'dbp': (78, 8),
    },
    'Fungal infection': {
        'age': (30, 15),
        'hr':  (74, 8),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'Impetigo': {
        'age': (8, 5),      # Common in children
        'hr':  (90, 10),
        'sbp': (105, 10),
        'dbp': (68, 8),
    },

    # ── Musculoskeletal ────────────────────────────────────────────────────
    'Arthritis': {
        'age': (55, 14),
        'hr':  (72, 8),
        'sbp': (130, 14),
        'dbp': (84, 8),
    },
    'Osteoarthristis': {
        'age': (60, 12),    # Degenerative — elderly
        'hr':  (70, 8),
        'sbp': (132, 14),
        'dbp': (84, 8),
    },

    # ── Other ──────────────────────────────────────────────────────────────
    'Allergy': {
        'age': (28, 15),
        'hr':  (78, 10),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'Drug Reaction': {
        'age': (35, 18),
        'hr':  (85, 14),
        'sbp': (120, 14),
        'dbp': (78, 10),
    },
    'Urinary tract infection': {
        'age': (30, 14),
        'hr':  (82, 10),
        'sbp': (118, 10),
        'dbp': (76, 8),
    },
    'AIDS': {
        'age': (35, 10),
        'hr':  (85, 12),
        'sbp': (112, 12),
        'dbp': (70, 10),
    },
    'Insomnia': {
        'age': (38, 14),
        'hr':  (82, 12),
        'sbp': (125, 12),
        'dbp': (80, 8),
    },
    'Fever': {
        'age': (28, 15),
        'hr':  (92, 12),
        'sbp': (116, 10),
        'dbp': (74, 8),
    },
    'Slight Headache': {
        'age': (30, 14),
        'hr':  (74, 8),
        'sbp': (118, 8),
        'dbp': (76, 6),
    },
    'Stomach ache': {
        'age': (30, 14),
        'hr':  (76, 8),
        'sbp': (118, 8),
        'dbp': (76, 6),
    },
}


from typing import Optional
def normalize_symptom(s: str) -> Optional[str]:
    """Normalize a symptom string to lowercase_underscore format."""
    if not isinstance(s, str):
        return None
    return s.strip().lower().replace(' ', '_')


def load_and_prepare_dataset(path: str) -> tuple[pd.DataFrame, list[str], list[str]]:
    """Loads and sanitizes the source medical CSV dataset.

    Args:
        path: Absolute or relative path to the dataset.csv file.

    Returns:
        A tuple of (cleaned DataFrame, list of symptom columns, unique sorted 
        symptom vocabulary).
    """
    df = pd.read_csv(path)
    df['Disease'] = df['Disease'].str.strip()

    symptom_cols = [c for c in df.columns if 'Symptom' in c]
    for col in symptom_cols:
        df[col] = df[col].apply(normalize_symptom)

    all_symptoms: set[str] = set()
    for col in symptom_cols:
        all_symptoms.update(df[col].dropna().unique())

    return df, symptom_cols, sorted(list(all_symptoms))


def compute_disease_symptom_profiles(
    df: pd.DataFrame,
    symptom_cols: list[str]
) -> dict[str, dict[str, float]]:
    """Generates frequency profiles for every disease in the dataset.

    Args:
        df: The normalized DataFrame.
        symptom_cols: The list of columns containing symptom strings.

    Returns:
        A dictionary mapping {disease: {symptom: prevalence_frequency}}.
        Used to distinguish core hallmark symptoms from secondary ones.
    """
    profiles: dict[str, dict[str, float]] = {}

    for disease, group in df.groupby('Disease'):
        symptom_counts: dict[str, int] = {}
        n_rows = len(group)

        for col in symptom_cols:
            for sym in group[col].dropna():
                if sym:
                    symptom_counts[sym] = symptom_counts.get(sym, 0) + 1

        # Normalize to frequency (0.0 – 1.0)
        profiles[disease] = {sym: count / n_rows for sym, count in symptom_counts.items()}

    return profiles


def sample_vitals(disease: str) -> dict:
    """Generates medically plausible vitals for a single synthetic patient.

    Uses per-disease clinical distributions defined in DISEASE_VITALS_PROFILES.
    Values are clamped to physiologically valid ranges.

    Args:
        disease: The target disease label.

    Returns:
        Dict with keys: Age, HeartRate, SystolicBP, DiastolicBP.
    """
    profile = DISEASE_VITALS_PROFILES.get(disease, DEFAULT_VITALS_PROFILE)

    age = int(np.clip(np.random.normal(*profile['age']), 2, 95))
    hr  = int(np.clip(np.random.normal(*profile['hr']), 40, 180))
    sbp = int(np.clip(np.random.normal(*profile['sbp']), 70, 220))
    dbp = int(np.clip(np.random.normal(*profile['dbp']), 40, 140))

    # Ensure systolic > diastolic (physiological constraint)
    if sbp <= dbp:
        sbp = dbp + random.randint(15, 40)

    return {
        'Age': age,
        'HeartRate': hr,
        'SystolicBP': sbp,
        'DiastolicBP': dbp,
    }


def generate_synthetic_row(
    disease: str,
    symptom_profile: dict[str, float],
    all_symptoms: list[str],
    symptom_cols: list[str],
    noise_prob: float = NOISE_PROBABILITY,
    max_noise: int = MAX_NOISE_SYMPTOMS,
) -> dict:
    """Assembles a single medically realistic synthetic patient row.

    The generator ensures each synthetic patient has at least one core hallmark 
    symptom of the target disease, plus a statistically varied set of 
    secondary symptoms. Noise (irrelevant symptoms) is optionally added for 
    regularization. Vitals are sampled from the disease-specific profile.

    Args:
        disease: The target label (e.g., 'Hypertension').
        symptom_profile: The learned probability distribution for this disease.
        all_symptoms: Global vocabulary for noise sampling.
        symptom_cols: CSV schema columns.

    Returns:
        A dictionary representing one CSV row with symptoms + vitals.
    """
    core_symptoms     = {s: f for s, f in symptom_profile.items() if f >= 0.4}
    secondary_symptoms = {s: f for s, f in symptom_profile.items() if f < 0.4}

    chosen: list[str] = []

    # ── Step 1: Guarantee at least 1 core symptom ─────────────────────────────
    if core_symptoms:
        core_list    = list(core_symptoms.keys())
        core_weights = np.array([core_symptoms[s] for s in core_list])
        core_weights /= core_weights.sum()
        n_core = min(random.randint(1, 2), len(core_list))
        chosen += list(np.random.choice(core_list, size=n_core, replace=False, p=core_weights))

    # ── Step 2: Sample secondary symptoms ─────────────────────────────────────
    if secondary_symptoms:
        sec_list    = list(secondary_symptoms.keys())
        sec_weights = np.array([secondary_symptoms[s] for s in sec_list])
        sec_weights /= sec_weights.sum()
        remaining_slots = random.randint(MIN_SYMPTOMS, MAX_SYMPTOMS) - len(chosen)
        n_sec = min(max(0, remaining_slots), len(sec_list))
        if n_sec > 0:
            sampled_sec = np.random.choice(sec_list, size=n_sec, replace=False, p=sec_weights)
            chosen += [s for s in sampled_sec if s not in chosen]

    # Ensure we meet minimum
    if len(chosen) < MIN_SYMPTOMS and core_symptoms:
        extras = [s for s in core_symptoms if s not in chosen]
        chosen += extras[:max(0, MIN_SYMPTOMS - len(chosen))]

    # ── Step 3: Noise injection (simulates real-world messy inputs) ────────────
    if random.random() < noise_prob and len(chosen) < MAX_SYMPTOMS:
        noise_pool = [s for s in all_symptoms if s not in symptom_profile]
        if noise_pool:
            n_noise = random.randint(1, min(max_noise, len(noise_pool)))
            noise_chosen = random.sample(noise_pool, n_noise)
            chosen += noise_chosen

    # Shuffle so column order isn't always the same (avoids positional bias)
    random.shuffle(chosen)

    # ── Step 4: Build the row dict matching original CSV schema ───────────────
    row: dict = {'Disease': disease}
    for i, col in enumerate(symptom_cols):
        row[col] = chosen[i] if i < len(chosen) else None

    # ── Step 5: Add vitals columns ────────────────────────────────────────────
    vitals = sample_vitals(disease)
    row.update(vitals)

    return row


def generate_synthetic_dataset(
    df: pd.DataFrame,
    symptom_profiles: dict[str, dict[str, float]],
    all_symptoms: list[str],
    symptom_cols: list[str],
    target_per_disease: int = TARGET_ROWS_PER_DISEASE,
) -> pd.DataFrame:
    """
    Generate synthetic rows for ALL diseases to reach `target_per_disease` total.
    
    If a disease already exceeds the target, it is skipped (no oversampling for rich classes).
    Under-represented diseases (e.g. Insomnia with 30 rows) get the most new rows.
    """
    real_counts = df['Disease'].value_counts().to_dict()
    synthetic_rows: list[dict] = []

    for disease, profile in symptom_profiles.items():
        real_count    = real_counts.get(disease, 0)
        needed        = max(0, target_per_disease - real_count)

        if needed == 0:
            print(f"  ⏭  {disease:<45} already has {real_count} rows — skipping")
            continue

        print(f"  ➕ {disease:<45} {real_count:>3} real → generating {needed} synthetic rows")
        for _ in range(needed):
            row = generate_synthetic_row(disease, profile, all_symptoms, symptom_cols)
            synthetic_rows.append(row)

    output_cols = ['Disease'] + symptom_cols + ['Age', 'HeartRate', 'SystolicBP', 'DiastolicBP']
    return pd.DataFrame(synthetic_rows, columns=output_cols)


def main():
    print("=" * 65)
    print("  🧬 Synthetic Medical Data Generator (v2 — Vitals-Aware)")
    print("=" * 65)

    # 1. Load and prepare
    print("\n📂 Loading original dataset...")
    df, symptom_cols, all_symptoms = load_and_prepare_dataset(DATASET_PATH)
    print(f"   Original rows : {len(df)}")
    print(f"   Diseases      : {df['Disease'].nunique()}")
    print(f"   Unique symptoms: {len(all_symptoms)}")

    # 2. Learn symptom patterns from real data
    print("\n🔬 Computing per-disease symptom profiles...")
    profiles = compute_disease_symptom_profiles(df, symptom_cols)

    # 3. Generate synthetic rows
    print(f"\n🧪 Generating synthetic samples (target: {TARGET_ROWS_PER_DISEASE} per disease)...")
    synthetic_df = generate_synthetic_dataset(df, profiles, all_symptoms, symptom_cols)

    # 4. Save output
    os.makedirs(os.path.dirname(OUTPUT_PATH) if os.path.dirname(OUTPUT_PATH) else '.', exist_ok=True)
    synthetic_df.to_csv(OUTPUT_PATH, index=False)

    print("\n" + "=" * 65)
    print(f"✅ Done!")
    print(f"   Synthetic rows generated : {len(synthetic_df)}")
    print(f"   Columns                  : {list(synthetic_df.columns[-4:])}")
    print(f"   Saved to                 : {OUTPUT_PATH}")
    print(f"\n📌 Next step: run train_model.py to merge and retrain.")
    print("=" * 65)


if __name__ == "__main__":
    main()
