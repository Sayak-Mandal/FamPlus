import requests
import json

BASE_URL = "http://localhost:8000"

test_cases = [
    {
        "name": "Direct & Simple",
        "input": {"symptoms": "chest pain, breathlessness, sweating"},
        "expected_hint": "Heart attack"
    },
    {
        "name": "Conversational & Verbose",
        "input": {"symptoms": "I've been feeling really sick to my stomach lately and I keep having to run to the bathroom because of diarrhea. Also my head is just pounding."},
        "expected_hint": "Typhoid / Gastroenteritis"
    },
    {
        "name": "Indirect/Metaphorical",
        "input": {"symptoms": "It feels like an elephant is sitting on my chest and I am gasping for air."},
        "expected_hint": "Heart attack"
    },
    {
        "name": "Misspelled & Slang",
        "input": {"symptoms": "got bad headach and stumack hurts and i feel dizzy"},
        "expected_hint": "Headache / Hypoglycemia"
    },
    {
        "name": "Multi-Symptom Cluster (Jaundice/Hepatitis)",
        "input": {"symptoms": "My skin looks yellowish, I have dark urine, and I feel very itchy all over."},
        "expected_hint": "Jaundice / Hepatitis"
    },
    {
        "name": "Non-Medical / Vague",
        "input": {"symptoms": "I just feel really tired and bored and my life is stressful"},
        "expected_hint": "Low confidence or general stress"
    },
    {
        "name": "Negation (The 'Tricky' Test)",
        "input": {"symptoms": "I have a severe headache but I do NOT have any fever or vomiting."},
        "expected_hint": "Should ideally only pick up headache"
    }
]

def run_tests():
    print(f"{'Test Name':<35} | {'Symptoms Detected':<40} | {'Condition':<20} | {'Conf'}")
    print("-" * 110)
    
    for case in test_cases:
        try:
            # 1. Get the detected symptoms (we can see this in server logs too, but let's look at output)
            # Actually the /predict_symptoms endpoint doesn't return the detected symptoms list in the JSON body,
            # but we can infer it from the logs or add it to the response if needed.
            # For now, let's just look at the diagnosis.
            
            response = requests.post(f"{BASE_URL}/predict_symptoms", json=case["input"])
            data = response.json()
            
            # Since the API doesn't return the internal 'matched_symptoms' list, 
            # I'll rely on the server logs to see the 'Matched=' part.
            
            condition = data.get("condition", "N/A")
            confidence = data.get("confidence", 0)
            
            print(f"{case['name']:<35} | {'(Check server logs)':<40} | {condition:<20} | {confidence}%")
            
        except Exception as e:
            print(f"Error testing {case['name']}: {e}")

if __name__ == "__main__":
    run_tests()
