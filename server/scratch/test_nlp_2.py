import sys
sys.path.append('.')
from ai_engine import normalize_input, metadata, nlp_med
import re

text = "fever, cold"
cleaned = re.sub(r"[^\w\s,]", " ", text.lower())
cleaned = re.sub(r"\s+", " ", cleaned).strip()

print(f"Cleaned: '{cleaned}'")
doc = nlp_med(cleaned)
for ent in doc.ents:
    print("Entity:", ent.text)

