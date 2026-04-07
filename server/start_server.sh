#!/bin/bash

# Ensure we are in the server directory
cd "$(dirname "$0")"

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the server (no --reload: the 33MB model takes 2-3min to reload on every file save)
uvicorn ai_engine:app --host 0.0.0.0 --port 8000
