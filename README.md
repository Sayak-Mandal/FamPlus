# 🏥 Famplus — Proactive Family Healthcare Prototype

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20+%20Python%20AI-success)](./structure.md)

Famplus is a premium, high-performance health platform engineered for proactive family wellness. By fusing a cutting-edge **MERN stack** with a specialized **Medical AI engine**, Famplus delivers diagnostic precision, real-time vitals intelligence, and professional-grade reporting in a stunning, high-fidelity interface.

---

## 🚀 Vision & Key Features

Famplus is a research-oriented health monitoring prototype designed to bridge the gap between tracking and triage. Our latest version introduces **Guardian Technology**—a 3D-enhanced visualization layer that helps monitor family health trends with greater clarity.

### 🧠 Advanced AI Ecosystem
*   **SciSpacy NLP Pipeline**: Utilizes an automated biomedical entity extraction pipeline to better understand medical terminology and conversational symptom descriptions.
*   **Vitals-Contextual Diagnostics**: The Gradient Boosting model correlates symptoms with real-time Age, Heart Rate, and Blood Pressure for improved diagnostic simulations.
*   **Local Gemma3 LLM Integration**: Leverages local Large Language Model capabilities for contextual health advice and clinical reasoning simulations.
*   **Professional PDF Reporting**: Generate, preview directly in the application, and download clinical-ready PDF diagnostic reports.

### 🎨 Premium Design & Glassmorphism UX
*   **Glassmorphic Indicators**: An interactive Wellness Score panel utilizing CSS backdrop-filter glassmorphism, dynamic green/yellow/red risk alerts, and slow-pulsing background glow blobs.
*   **Live Vitals Responsiveness**: Calculates user health index dynamically using live heart rate inputs with safety warnings (e.g. bradycardia detection).
*   **3D Guardian Landing Page**: An immersive Three.js-powered experience showcasing the "Guardian" preventative features.
*   **Custom Physics Engine**: A lightweight 2D collision physics engine powers micro-interactions and animated CSS icons for a tactile, high-end feel.

### 📁 Medical Vault & Secure Records
*   **MongoDB GridFS Secure Storage**: User-uploaded medical records (PDFs, images) are streamed directly into MongoDB GridFS, keeping them encrypted and securely integrated into the database without storing files on the local filesystem.
*   **In-App Document Vault**: Allows uploading files with secure, authenticated API access, resolving file URLs dynamically.
*   **Document Previews & Downloads**: Preview PDFs and images directly inside the application workspace or download them securely from the GridFS stream.
*   **Encrypted Personal Vitals**: Secures sensitive user telemetry at-rest via an AES-256-CBC cipher with dynamic initialization vectors.
*   **Vitals Logs Editing & Localization**: Modify vitals (weight, height, heart rate) with automatic `EDITED` badge labels, localized `DD/MM/YYYY` date format, and randomized historical logging times for realistic data visualization.

---

## 🛠️ High-Performance Technology Stack

| Layer | Core Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, Three.js, Framer Motion, jspdf |
| **Backend** | Node.js, Express, MongoDB (Mongoose), JWT Security, crypto (AES-256-CBC) |
| **AI Engine** | Python 3.11, FastAPI, SciSpacy (en_core_sci_sm), Scikit-learn, Gemma3 |
| **Mapping** | Google Maps Platform (Address-based routing), Leaflet |

---

## 📦 Quick Start

### 1. Prerequisites
- **Node.js** (v18+) & **Python** (v3.9+)
- **Ollama**: Required for local LLM reasoning. [Download here](https://ollama.com).
- **Gemma 2b/7b**: Pull the model via `ollama pull gemma:2b`.
- **SciSpacy Model**: Install via `pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz`.
- **MongoDB** (Local or Atlas)
- **Google Maps API Key** (for Find Care features)

### 2. Backend Orchestrator
```bash
cd backend
npm install
# Configure .env with MONGO_URI, JWT_SECRET, ENCRYPTION_KEY, and GOOGLE_MAPS_API_KEY
npm start
```

### 3. Medical AI Engine
```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Download SciSpacy model
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz
# Initialize & Start
python train_model.py
python ai_engine.py
```

### 4. Frontend Experience
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 System Architecture

For a detailed breakdown of the file system and internal logic, please refer to the **[System Structure Guide](./structure.md)**.
