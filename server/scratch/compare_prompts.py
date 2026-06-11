import sys
import os
import time
import json
import dotenv

# Load environment variables
dotenv.load_dotenv("/Users/sayak__mandal/Coding Folder/Famplus/.env")

# Add server directory to path
server_dir = "/Users/sayak__mandal/Coding Folder/Famplus/server"
sys.path.insert(0, server_dir)

import groq
from ai_engine import MEDICAL_SYSTEM_PROMPT

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = groq.Groq(api_key=GROQ_API_KEY)

# Baseline Config
BASELINE_SYSTEM_PROMPT = MEDICAL_SYSTEM_PROMPT
BASELINE_JSON_TEMPLATE = {
    "condition": "Primary Condition Name",
    "confidence": 90,
    "advice": "Immediate clinical advice/instructions.",
    "specialist": "Cardiologist",
    "description": "Short explanation of the condition and vitals correlation.",
    "precautions": ["Precaution 1", "Precaution 2"],
    "urgency": "Emergency",
    "top_matches": [
        {"condition": "Condition 1", "confidence": 90},
        {"condition": "Condition 2", "confidence": 75},
        {"condition": "Condition 3", "confidence": 60}
    ],
    "next_steps": ["Actionable step 1", "Actionable step 2"]
}

# Optimized Config
# 1. Concise system prompt focusing only on clinical guidance and safety rules, removing common pattern tables
OPTIMIZED_SYSTEM_PROMPT = """You are a clinical decision support assistant.
Analyze patient symptoms and vitals. Follow safety rules.
SAFETY RULES:
- Recommend consulting a physician.
- Set urgency to "Emergency" for life-threatening symptoms.
- Be conservative. Default to General Physician if unsure.
- Specialists: Cardiologist, Neurologist, Pulmonologist, Gastroenterologist, Dermatologist, Rheumatologist, Endocrinologist, Infectious Disease Specialist, ENT Specialist, Urologist, Hepatologist, Allergist, Sleep Specialist, Vascular Surgeon, General Physician.
- Urgencies: Emergency, High, Normal.
- Keep text fields (advice, next_steps) to 1 short sentence.
Respond ONLY in the specified minified JSON format."""

# 2. Minified JSON keys:
# c: condition, f: confidence, u: urgency, a: advice, s: specialist, d: description, p: precautions, t: top_matches (list of c/f), n: next_steps
OPTIMIZED_JSON_TEMPLATE = {
    "c": "Condition",
    "f": 90,
    "u": "Emergency",
    "a": "Advice",
    "s": "Specialist",
    "d": "Description",
    "p": ["Precaution"],
    "t": [{"c": "Diff Diagnosis", "f": 90}],
    "n": ["Next Step"]
}

TEST_CASES = [
    {
        "name": "Emergency Cardiac",
        "symptoms": "crushing chest pain, left arm pain, and shortness of breath",
        "vitals": "Age: 58 years, Heart Rate: 110 bpm, Blood Pressure: 145/95 mmHg"
    },
    {
        "name": "General Flu",
        "symptoms": "high fever, severe body ache, sore throat, and dry cough",
        "vitals": "Age: 25 years, Heart Rate: 85 bpm, Blood Pressure: 120/80 mmHg"
    }
]

def run_baseline(case):
    user_msg = f"Patient reports: \"{case['symptoms']}\"\n\nPatient Vitals:\n{case['vitals']}"
    user_msg += "\n\nAnalyze these symptoms carefully. Consider the most clinically likely condition, provide your confidence level, the recommended specialist, practical precautions, and next steps for the patient.\nYou must respond with a JSON object conforming exactly to this structure (filled with actual values):\n" + json.dumps(BASELINE_JSON_TEMPLATE)
    
    start = time.time()
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": BASELINE_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        timeout=15,
    )
    latency = time.time() - start
    usage = resp.usage
    content = resp.choices[0].message.content
    return {
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
        "latency": latency,
        "content_length": len(content)
    }

def run_optimized(case):
    user_msg = f"Patient reports: \"{case['symptoms']}\"\nPatient Vitals: {case['vitals']}"
    user_msg += "\nRespond ONLY as a JSON object matching this schema:\n" + json.dumps(OPTIMIZED_JSON_TEMPLATE)
    
    start = time.time()
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": OPTIMIZED_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        timeout=15,
    )
    latency = time.time() - start
    usage = resp.usage
    content = resp.choices[0].message.content
    return {
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
        "latency": latency,
        "content_length": len(content),
        "content": content
    }

def main():
    print("=== BENCHMARKING GROQ TOKEN USAGE ===")
    for case in TEST_CASES:
        print(f"\n--- Scenario: {case['name']} ---")
        base = run_baseline(case)
        print(f"Baseline: Input={base['prompt_tokens']}, Output={base['completion_tokens']}, Total={base['total_tokens']}, Latency={base['latency']:.3f}s")
        
        opt = run_optimized(case)
        print(f"Optimized: Input={opt['prompt_tokens']}, Output={opt['completion_tokens']}, Total={opt['total_tokens']}, Latency={opt['latency']:.3f}s")
        
        input_saved = base['prompt_tokens'] - opt['prompt_tokens']
        output_saved = base['completion_tokens'] - opt['completion_tokens']
        total_saved = base['total_tokens'] - opt['total_tokens']
        
        print(f"Savings: Input={input_saved} ({input_saved/base['prompt_tokens']*100:.1f}%), Output={output_saved} ({output_saved/base['completion_tokens']*100:.1f}%), Total={total_saved} ({total_saved/base['total_tokens']*100:.1f}%)")
        print("Optimized JSON returned:")
        print(opt["content"])

if __name__ == "__main__":
    main()
