import httpx
import asyncio
import json
import time

URL = "http://127.0.0.1:8000/predict_symptoms"

SCENARIOS = [
    # 1. Clear Emergencies
    {
        "category": "Clear Emergencies",
        "name": "Cardiac Emergency (Heart Attack)",
        "payload": {
            "symptoms": "crushing chest pain, numbness in left arm, cold sweat",
            "vitals_context": {
                "heart_rate": 110,
                "blood_pressure": "150/95",
                "age": 55
            }
        }
    },
    {
        "category": "Clear Emergencies",
        "name": "Neurological Emergency (Stroke)",
        "payload": {
            "symptoms": "one-sided weakness, slurred speech, drooping face",
            "vitals_context": {
                "heart_rate": 88,
                "blood_pressure": "170/110",
                "age": 68
            }
        }
    },
    {
        "category": "Clear Emergencies",
        "name": "Respiratory Emergency",
        "payload": {
            "symptoms": "severe difficulty breathing, chest tightness, coughing up blood",
            "vitals_context": {
                "heart_rate": 125,
                "blood_pressure": "140/90",
                "age": 45
            }
        }
    },
    # 2. Mild / Common Ailments
    {
        "category": "Mild Ailments",
        "name": "Common Cold",
        "payload": {
            "symptoms": "headache, runny nose, sneezing",
            "vitals_context": {
                "heart_rate": 75,
                "blood_pressure": "120/80",
                "age": 28
            }
        }
    },
    {
        "category": "Mild Ailments",
        "name": "Gastroenteritis",
        "payload": {
            "symptoms": "stomach pain, nausea, watery diarrhea",
            "vitals_context": {
                "heart_rate": 85,
                "blood_pressure": "115/75",
                "age": 30
            }
        }
    },
    {
        "category": "Mild Ailments",
        "name": "Urinary Tract Infection (UTI)",
        "payload": {
            "symptoms": "burning sensation when urinating, frequent bathroom trips",
            "vitals_context": {
                "heart_rate": 80,
                "blood_pressure": "120/80",
                "age": 35
            }
        }
    },
    # 3. Chronic / Specialist Referrals
    {
        "category": "Chronic Conditions",
        "name": "Diabetes Symptoms",
        "payload": {
            "symptoms": "extreme thirst, frequent urination, unexplained weight loss",
            "vitals_context": {
                "heart_rate": 82,
                "blood_pressure": "125/82",
                "age": 42
            }
        }
    },
    {
        "category": "Chronic Conditions",
        "name": "Arthritis Symptoms",
        "payload": {
            "symptoms": "painful swollen joints, stiffness in the mornings",
            "vitals_context": {
                "heart_rate": 72,
                "blood_pressure": "120/80",
                "age": 60
            }
        }
    },
    # 4. Vitals Context Influence
    {
        "category": "Vitals Context Influence",
        "name": "Palpitations/Dizziness (Normal Vitals)",
        "payload": {
            "symptoms": "palpitations and dizziness",
            "vitals_context": {
                "heart_rate": 72,
                "blood_pressure": "120/80",
                "age": 35
            }
        }
    },
    {
        "category": "Vitals Context Influence",
        "name": "Palpitations/Dizziness (High Vitals)",
        "payload": {
            "symptoms": "palpitations and dizziness",
            "vitals_context": {
                "heart_rate": 130,
                "blood_pressure": "165/105",
                "age": 65
            }
        }
    },
    # 5. Edge Cases & Safety Gating
    {
        "category": "Edge Cases",
        "name": "Nonsense symptoms",
        "payload": {
            "symptoms": "I ate a blue crayon and now I can see ghosts in the kitchen."
        }
    },
    {
        "category": "Edge Cases",
        "name": "Vague symptoms",
        "payload": {
            "symptoms": "I feel kinda weird."
        }
    },
    {
        "category": "Edge Cases",
        "name": "Deceased Easter Egg",
        "payload": {
            "symptoms": "I am already dead."
        }
    }
]

async def run_comprehensive_tests():
    print("# 📊 Famplus AI Engine Diagnostic Evaluation Report")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    print("## Test Scenarios & Outcomes\n")
    print("| Category | Scenario | Input Symptoms | Vitals (Age / HR / BP) | Mapped Condition | Confidence | Urgency | Specialist | Latency | Vitals Analysis / Notes |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    
    async with httpx.AsyncClient(timeout=35.0) as client:
        for s in SCENARIOS:
            payload = s["payload"]
            vitals = payload.get("vitals_context")
            vitals_str = "N/A"
            if vitals:
                vitals_str = f"Age {vitals.get('age')} / {vitals.get('heart_rate')} bpm / {vitals.get('blood_pressure')} mmHg"
            
            start = time.time()
            try:
                resp = await client.post(URL, json=payload)
                duration = time.time() - start
                
                if resp.status_code == 200:
                    data = resp.json()
                    condition = data.get("condition", "N/A")
                    confidence = f"{data.get('confidence', 0)}%"
                    urgency = data.get("urgency", "N/A")
                    specialist = data.get("specialist", "N/A")
                    vitals_analysis = "; ".join(data.get("vitals_analysis", [])) or "None"
                    
                    # Highlight emergencies
                    if urgency == "Emergency":
                        urgency_cell = f"🚨 **{urgency}**"
                    elif urgency == "High":
                        urgency_cell = f"⚠️ **{urgency}**"
                    else:
                        urgency_cell = urgency
                        
                    print(f"| {s['category']} | {s['name']} | *\"{payload['symptoms']}\"* | {vitals_str} | **{condition}** | {confidence} | {urgency_cell} | {specialist} | {duration:.2f}s | {vitals_analysis} |")
                else:
                    print(f"| {s['category']} | {s['name']} | *\"{payload['symptoms']}\"* | {vitals_str} | **ERROR** | N/A | N/A | N/A | {duration:.2f}s | HTTP {resp.status_code}: {resp.text[:50]} |")
            except Exception as e:
                duration = time.time() - start
                print(f"| {s['category']} | {s['name']} | *\"{payload['symptoms']}\"* | {vitals_str} | **FAILED** | N/A | N/A | N/A | {duration:.2f}s | Connection Error: {str(e)[:50]} |")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_comprehensive_tests())
