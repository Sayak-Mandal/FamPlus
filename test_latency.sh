#!/bin/bash
test_case() {
    name="$1"
    payload="$2"
    echo "Testing: $name"
    echo "Payload: $payload"
    time curl -s -X POST http://localhost:8000/predict_symptoms \
      -H "Content-Type: application/json" \
      -d "{\"symptoms\":\"$payload\"}" > /dev/null
    echo -e "\n----------------------------------------\n"
}

test_case "1. Fast-First Emergency (Heart Attack)" "crushing chest pain, left arm pain, cold sweat"
test_case "2. Fast-First Common (Flu)" "fever, body ache, tired, runny nose"
test_case "3. Slow-Path Complex (Ollama Fallback)" "my left toe has a weird purple spot and i have a slight headache but no fever"
