#  Famplus — Proactive Family Healthcare Prototype

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20(React%2019%20+%20Express%205)%20+%20Python%20AI%20(FastAPI)-success)](./structure.md)

Famplus is a premium, high-performance health platform engineered for proactive family wellness. By fusing a cutting-edge **MERN stack (React 19, Vite 8, Express 5, MongoDB 9)** with a specialized **Medical AI engine (FastAPI, SciSpacy, scikit-learn, GPT OSS 120B)**, Famplus delivers diagnostic precision, real-time vitals intelligence, and professional-grade reporting in a stunning, high-fidelity interface.

---

##  System Architecture

Famplus is built on a **3-layer decoupled microservice architecture** to handle polyglot computing efficiently:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            LAYER 1: FRONTEND                             │
│    React 19 SPA  •  Vite 8  •  TypeScript  •  Tailwind CSS v4            │
│    Three.js (3D) •  Framer Motion  •  Web Speech API                    │
│    Recharts • Leaflet Maps • jsPDF • Radix UI Components                │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  HTTP/REST (JSON)  +  WebSockets
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       LAYER 2: ORCHESTRATION (Node.js)                  │
│    Express 5 Server  •  JWT Auth  •  Helmet Security                   │
│    AES-256-CBC Encryption  •  MongoDB GridFS  •  Rate Limiting          │
│    Google OAuth 2.0  •  Google Maps Platform Proxy                      │
└────────────────┬─────────────────────────────────┬───────────────────────┘
                 │                                  │
          Mongoose ORM                        HTTP REST
                 │                                  │
                 ▼                                  ▼
┌───────────────────────────┐         ┌─────────────────────────────────────┐
│     DATABASE (MongoDB)    │         │     LAYER 3: AI ENGINE (Python)     │
│  Collections:             │         │  FastAPI  •  SciSpacy NER           │
│  - users                  │         │  HistGradientBoosting (ML)          │
│  - familymembers          │         │  Groq Cloud LLM (gpt-oss-120b)      │
│  - vitallogs              │         │  Joblib Model Serialization         │
│  - symptomlogs            │         │  Emergency Hallmark Bypass Logic    │
│  - familycircles          │         │  StandardScaler Vitals Normalization│
│  - records                │         │                                     │
│  - medical_records.files  │         │  Endpoints:                         │
│  - medical_records.chunks │         │  - POST /predict_symptoms           │
│      (GridFS Bucket)      │         │  - POST /predict_wellness           │
└───────────────────────────┘         └─────────────────────────────────────┘
```

For a detailed breakdown of the file system and internal logic, please refer to the **[System Structure Guide](./structure.md)**.

---

##  Vision & Key Features

Famplus is a research-oriented health monitoring prototype designed to bridge the gap between tracking and triage.

###  Advanced AI Ecosystem
*   **SciSpacy NLP Pipeline**: Utilizes an automated biomedical entity extraction pipeline (`en_core_sci_sm`) to parse symptoms and extract clinical entities directly from natural language.
*   **Vitals-Contextual Diagnostics**: Uses a `HistGradientBoostingClassifier` trained on synthetic medical datasets to correlate user symptoms with real-time biometric indicators (Age, Heart Rate, Systolic/Diastolic Blood Pressure).
*   **Groq Cloud LLM Integration**: Leverages Groq's high-speed API (`openai/gpt-oss-120b`) running structured JSON schemas to provide rapid, context-aware clinical reasoning and differential diagnoses.
*   **Emergency Hallmark Override Safety Gate**: Built-in guardrails detect life-threatening symptoms (e.g. crushing chest pain, slurred speech) and bypass conservative model confidence gates to trigger immediate emergency alerts.
*   **Clinical-Grade PDF Reports**: Generates professional, comprehensive project and diagnostic PDF reports (compiled via `ReportLab` locally or via `jsPDF` client-side).

###  Premium Design & Glassmorphism UX
*   **Glassmorphic Health Panels**: The dashboard features an interactive Wellness Score panel utilizing CSS backdrop-filter glassmorphism, dynamic green/yellow/red risk alerts, and slow-pulsing background glow blobs.
*   **Live Vitals Responsiveness**: Calculates user health index dynamically using live heart rate inputs with safety warnings (e.g. bradycardia detection).
*   **3D Guardian Landing Page**: An immersive Three.js-powered experience showcasing the "Guardian" preventative features.
*   **Custom Physics Engine**: A lightweight 2D collision physics engine powers micro-interactions and animated CSS icons for a tactile, high-end feel.

###  Medical Vault & Secure Records
*   **MongoDB GridFS Secure Storage**: User-uploaded medical records (PDFs, images) are streamed directly into MongoDB GridFS, keeping them encrypted and securely integrated into the database without storing files on the local filesystem.
*   **In-App Document Vault**: Allows uploading files with secure, authenticated API access, resolving file URLs dynamically.
*   **Document Previews & Downloads**: Preview PDFs and images directly inside the application workspace or download them securely from the GridFS stream.
*   **Encrypted Personal Vitals**: Secures sensitive user telemetry at-rest via an AES-256-CBC cipher with dynamic initialization vectors.
*   **Vitals Logs Editing & Localization**: Modify vitals (weight, height, heart rate) with automatic `EDITED` badge labels, localized `DD/MM/YYYY` date format, and randomized historical logging times for realistic data visualization.

---

##  High-Performance Technology Stack

| Layer | Core Technologies | Package / Dependency Specs |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS v4, Three.js, Framer Motion, Recharts, React-Leaflet, jsPDF, Radix UI, Axios | `react@19.2.4`, `vite@8.0.1`, `tailwindcss@4.2.2`, `three@0.184.0`, `@react-three/fiber@9.6.1`, `jspdf@4.2.1` |
| **Backend** | Node.js, Express 5, MongoDB (Mongoose 9), JWT Security, crypto (AES-256-CBC), Helmet, Express Rate Limit, Multer | `express@5.2.1`, `mongoose@9.3.3`, `bcryptjs@3.0.3`, `helmet@8.1.0`, `express-rate-limit@8.3.2` |
| **AI Engine** | Python 3.12, FastAPI, SciSpacy (en_core_sci_sm), Scikit-learn, Groq SDK, Pandas, Joblib, RapidFuzz | `fastapi==0.136.3`, `scikit-learn==1.9.0`, `spacy==3.7.5`, `scispacy==0.6.2`, `groq==1.4.0` |
| **Mapping** | Google Maps Platform (Address-based routing), Leaflet | `leaflet@1.9.4`, `react-leaflet@5.0.0` |

---

##  Version Control Exclusions

To keep the repository clean and secure, standard configuration and cache folders are excluded via `.gitignore`:
*   **Environment Parameters**: `.env`, `.env.local`
*   **Venvs**: Python Virtual Environments (`venv/`, `.venv/`)
*   **Cached models & data**: `__pycache__/`, `.cache/`

---

##  Quick Start

### 1. Prerequisites
- **Node.js** (v18+) & **Python** (v3.12+)
- **Groq API Key**: Required for high-speed cloud LLM reasoning (configured via `GROQ_API_KEY` in `.env`).
- **SciSpacy Model**: Install via `pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz`.
- **MongoDB** (Local or Atlas)
- **Google Maps API Key** (for Find Care features)

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/famplus
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GROQ_API_KEY=your_groq_api_key
```

### 3. Start Backend Orchestrator
```bash
cd backend
npm install
npm start
```

### 4. Start Medical AI Engine
```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Download SciSpacy model
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz
# Train & Initialize Model
python train_model.py
python ai_engine.py
```

### 5. Start Frontend Experience
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at [http://localhost:5173](http://localhost:5173).
