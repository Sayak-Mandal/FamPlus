import sys
sys.path.append('.')
from ai_engine import normalize_input, metadata

if metadata:
    known = metadata['all_symptoms']
    print("Test 1 (fever, cold):", normalize_input("fever, cold", known))
    print("Test 2 (fever and cold):", normalize_input("fever and cold", known))
else:
    print("No metadata")
