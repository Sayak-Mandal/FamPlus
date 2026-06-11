import joblib
import sys
import os

metadata_path = "/Users/sayak__mandal/Coding Folder/Famplus/server/metadata.joblib"
if not os.path.exists(metadata_path):
    print(f"Error: {metadata_path} not found")
    sys.exit(1)

metadata = joblib.load(metadata_path)
print("Metadata type:", type(metadata))
if isinstance(metadata, dict):
    print("\nMetadata Keys:")
    for k in metadata.keys():
        val = metadata[k]
        if isinstance(val, (dict, list, set)):
            print(f"- {k}: type={type(val)}, length={len(val)}")
        else:
            print(f"- {k}: type={type(val)}")
    
    if "description_map" in metadata:
        print("\nFirst 5 entries in description_map:")
        for i, (disease, desc) in enumerate(list(metadata["description_map"].items())[:5]):
            print(f"  * {disease}: {desc[:80]}...")
            
    if "precaution_map" in metadata:
        print("\nFirst 5 entries in precaution_map:")
        for i, (disease, precs) in enumerate(list(metadata["precaution_map"].items())[:5]):
            print(f"  * {disease}: {precs}")
            
    if "specialist_map" in metadata:
        print("\nFirst 5 entries in specialist_map:")
        for i, (disease, spec) in enumerate(list(metadata["specialist_map"].items())[:5]):
            print(f"  * {disease}: {spec}")
else:
    print("Metadata is not a dictionary.")
