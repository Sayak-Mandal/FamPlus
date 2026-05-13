import httpx
import time
import json

URL = "http://localhost:8000/predict_symptoms"

SCENARIOS = [
    {
        "name": "Nonsense/Stupid Symptoms",
        "payload": {"symptoms": "I ate a blue crayon and now I can see ghosts in the kitchen."}
    },
    {
        "name": "Emergency/Concerning Symptoms",
        "payload": {"symptoms": "I have crushing chest pain and my left arm is numb. I am sweating a lot."}
    },
    {
        "name": "Vague/Complex Symptoms (LLM Target)",
        "payload": {"symptoms": "I feel generally unwell, like my soul is heavy and my left big toe has a weird green spot. Also I'm a bit thirsty."}
    },
    {
        "name": "Normal Symptoms (ML Fast Path)",
        "payload": {"symptoms": "I have a headache, runny nose, and I'm sneezing."}
    }
]

async def run_tests():
    async with httpx.AsyncClient(timeout=30.0) as client:
        for scenario in SCENARIOS:
            print(f"\n--- Testing Scenario: {scenario['name']} ---")
            print(f"Input: '{scenario['payload']['symptoms']}'")
            start = time.time()
            try:
                resp = await client.post(URL, json=scenario['payload'])
                duration = time.time() - start
                print(f"Time: {duration:.2f} seconds")
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"Condition: {data.get('condition')}")
                    print(f"Confidence: {data.get('confidence')}%")
                    print(f"Urgency: {data.get('urgency')}")
                    print(f"Advice: {data.get('advice')}")
                else:
                    print(f"Error: {resp.status_code} - {resp.text}")
            except Exception as e:
                print(f"Request failed: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_tests())
