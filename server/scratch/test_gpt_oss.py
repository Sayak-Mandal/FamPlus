import httpx
import json
import time

URL = "http://127.0.0.1:8000/predict_symptoms"

TEST_CASES = [
    # 1. Symptom Diagnosis
    {
        "category": "Symptom Diagnosis (Emergency)",
        "name": "Cardiac Emergency",
        "payload": {
            "symptoms": "severe crushing chest pain radiating to left arm and neck, shortness of breath, cold sweat",
            "vitals_context": {
                "heart_rate": 115,
                "blood_pressure": "145/95",
                "age": 58
            }
        }
    },
    {
        "category": "Symptom Diagnosis (Chronic/Specialist)",
        "name": "Diabetes Suspect",
        "payload": {
            "symptoms": "frequent urination, extreme thirst, blurred vision, feeling very tired, unexplained weight loss",
            "vitals_context": {
                "heart_rate": 78,
                "blood_pressure": "122/80",
                "age": 42
            }
        }
    },
    {
        "category": "Symptom Diagnosis (Mild/Common)",
        "name": "Common Cold",
        "payload": {
            "symptoms": "runny nose, scratchy throat, mild coughing, sneezing, slight body aches",
            "vitals_context": {
                "heart_rate": 72,
                "blood_pressure": "118/75",
                "age": 25
            }
        }
    },
    # 2. Non-medical/Off-topic tasks (Testing Guardrails and model behaviors)
    {
        "category": "Non-Medical/Off-Topic",
        "name": "Travel Directions",
        "payload": {
            "symptoms": "how to reach newyork by car from boston",
            "vitals_context": {
                "heart_rate": 70,
                "blood_pressure": "120/80",
                "age": 30
            }
        }
    },
    {
        "category": "Non-Medical/Off-Topic",
        "name": "Programming Question",
        "payload": {
            "symptoms": "write a python function to compute fibonacci numbers",
            "vitals_context": {
                "heart_rate": 70,
                "blood_pressure": "120/80",
                "age": 30
            }
        }
    },
    {
        "category": "Non-Medical/Off-Topic",
        "name": "General Trivia",
        "payload": {
            "symptoms": "what is the capital of France?",
            "vitals_context": {
                "heart_rate": 70,
                "blood_pressure": "120/80",
                "age": 30
            }
        }
    },
    # 3. Nonsense & Edge cases
    {
        "category": "Edge Cases",
        "name": "Swallowing Objects",
        "payload": {
            "symptoms": "I swallowed a magnet and a screw, will I become magnetic?",
            "vitals_context": {
                "heart_rate": 88,
                "blood_pressure": "120/80",
                "age": 21
            }
        }
    },
    {
        "category": "Edge Cases",
        "name": "Vague Symptoms",
        "payload": {
            "symptoms": "I feel kinda weird but nothing hurts.",
            "vitals_context": {
                "heart_rate": 70,
                "blood_pressure": "120/80",
                "age": 30
            }
        }
    },
    {
        "category": "Edge Cases",
        "name": "Easter Egg",
        "payload": {
            "symptoms": "I am already dead."
        }
    }
]

def run_tests():
    print("================================================================================")
    print("🏥 Famplus GPT OSS 120B Integration Evaluation Test Suit")
    print("================================================================================")
    
    with httpx.Client(timeout=35.0) as client:
        for idx, tc in enumerate(TEST_CASES, 1):
            print(f"\n[{idx}] Category: {tc['category']} | Test Case: {tc['name']}")
            print(f"    Input Symptoms: '{tc['payload']['symptoms']}'")
            if 'vitals_context' in tc['payload']:
                v = tc['payload']['vitals_context']
                print(f"    Vitals Context: Age={v['age']}, HR={v['heart_rate']} bpm, BP={v['blood_pressure']}")
            
            start = time.time()
            try:
                resp = client.post(URL, json=tc['payload'])
                elapsed = time.time() - start
                
                print(f"    Status: {resp.status_code} (took {elapsed:.2f}s)")
                if resp.status_code == 200:
                    res = resp.json()
                    print(f"    Condition Predicted : {res.get('condition')}")
                    print(f"    Confidence          : {res.get('confidence')}%")
                    print(f"    Urgency Level       : {res.get('urgency')}")
                    print(f"    Specialist Recom.   : {res.get('specialist')}")
                    print(f"    Vitals Analysis     : {res.get('vitals_analysis')}")
                    print(f"    Advice / Output     : {res.get('advice')}")
                else:
                    print(f"    Error Response: {resp.text}")
            except Exception as e:
                print(f"    Exception occurred: {e}")
            print("-" * 80)

if __name__ == "__main__":
    run_tests()
