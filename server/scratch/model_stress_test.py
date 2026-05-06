import requests
import json
import time

BASE_URL = "http://localhost:8000"

test_cases = [
    # --- STUPID / NONSENSE SYMPTOMS ---
    {
        "name": "Nonsense - Sparkling Teeth",
        "input": {"symptoms": "I ate a blue crayon and now my teeth are sparkly"},
        "type": "stupid"
    },
    {
        "name": "Nonsense - Robot Elbow",
        "input": {"symptoms": "beep boop I am a robot with a rusty elbow"},
        "type": "stupid"
    },
    {
        "name": "Nonsense - Moon Following",
        "input": {"symptoms": "The moon is following me and I feel purple"},
        "type": "stupid"
    },
    
    # --- GOOD / MEDICAL EDGE CASES ---
    {
        "name": "Medical - Diabetes Indicator",
        "input": {"symptoms": "extreme thirst, blurred vision, frequent urination"},
        "type": "good"
    },
    {
        "name": "Medical - Heart Attack (Vague)",
        "input": {"symptoms": "indigestion but with left jaw pain and sweating"},
        "type": "good"
    },
    {
        "name": "Medical - Meningitis Indicator",
        "input": {"symptoms": "stiff neck, high fever, sensitivity to light"},
        "type": "good"
    },
    
    # --- LLM CHAT ATTEMPTS ---
    {
        "name": "LLM - Joke Request",
        "input": {"symptoms": "Tell me a joke about doctors"},
        "type": "llm"
    },
    {
        "name": "LLM - General Knowledge",
        "input": {"symptoms": "Who is the president of the USA?"},
        "type": "llm"
    },
    {
        "name": "LLM - Health Poem",
        "input": {"symptoms": "Write a short poem about staying healthy"},
        "type": "llm"
    }
]

def run_stress_test():
    print("="*80)
    print("🚀 FAMPLUS AI MODULE: STRESS TEST & EDGE CASE AUDIT")
    print("="*80)
    
    for case in test_cases:
        print(f"\n[TEST: {case['name']}]")
        print(f"Input: \"{case['input']['symptoms']}\"")
        
        try:
            start_time = time.time()
            response = requests.post(f"{BASE_URL}/predict_symptoms", json=case["input"])
            latency = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"Result: {data['condition']} ({data['confidence']}%)")
                print(f"Urgency: {data['urgency']}")
                print(f"Advice: {data['advice'][:100]}...")
                print(f"Latency: {latency:.2f}s")
                
                # Check for LLM fallback behavior
                if "DISCLAIMER" in data['advice'] or data['condition'] == "Unspecific Indications":
                    print("Status: Handled as unspecific or referred to general physician.")
                else:
                    print("Status: ML Model matched a condition.")
            else:
                print(f"FAILED: Status {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"ERROR: {e}")
            
    print("\n" + "="*80)
    print("TESTING COMPLETE")
    print("="*80)

if __name__ == "__main__":
    run_stress_test()
