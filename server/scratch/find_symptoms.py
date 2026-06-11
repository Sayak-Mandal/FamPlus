import sys
sys.path.append('.')
from ai_engine import metadata

if metadata:
    known = metadata['all_symptoms']
    for s in known:
        if any(x in s for x in ['cold', 'sneeze', 'cough', 'runny', 'chills']):
            print(s)
