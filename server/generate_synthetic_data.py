"""
Synthetic Medical Training Data Generator
------------------------------------------
This script generates medically plausible synthetic data to balance 
under-represented classes in the disease training set.

Algorithm:
  1. Profile Extraction: Learns core vs. secondary symptoms for each disease.
  2. Weighted Sampling: Generates new rows by combining hallmark markers with 
     statistically likely secondary symptoms.
  3. Noise Injection: Injects medically irrelevant symptoms to improve model 
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
TARGET_ROWS_PER_DISEASE = 1200

# Probability that a given noise symptom gets injected into a row (0.0 – 1.0)
NOISE_PROBABILITY = 0.08   # 8%  →  realistic but not overwhelming

# How many noise symptoms can be added per row at most
MAX_NOISE_SYMPTOMS = 2

# Min / max symptoms per synthetic sample (mimics real patient visit complexity)
MIN_SYMPTOMS = 3
MAX_SYMPTOMS = 8

# Fix randomness so results are reproducible during development
RANDOM_SEED = 2024
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


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
    regularization.

    Args:
        disease: The target label (e.g., 'Hypertension').
        symptom_profile: The learned probability distribution for this disease.
        all_symptoms: Global vocabulary for noise sampling.
        symptom_cols: CSV schema columns.

    Returns:
        A dictionary representing one CSV row.
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

    return pd.DataFrame(synthetic_rows, columns=['Disease'] + symptom_cols)


def main():
    print("=" * 65)
    print("  🧬 Synthetic Medical Data Generator")
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
    print(f"   Saved to                 : {OUTPUT_PATH}")
    print(f"\n📌 Next step: run train_model.py to merge and retrain.")
    print("=" * 65)


if __name__ == "__main__":
    main()
