# 📂 Famplus Project Structure

This document provides a comprehensive overview of the directory structure and the responsibilities of each component in the **Famplus** ecosystem.

---

## 🌳 Directory Tree

```text
Famplus/
├── backend/                # Node.js / Express Orchestration Server
│   ├── models/             # Mongoose Schemas (User, Member, VitalLog, SymptomLog)
│   ├── scripts/            # Database initialization & maintenance
│   ├── utils/              # Helper utilities (crypto.js for field encryption)
│   ├── server.js           # Main Entry Point (Express + Socket.io + AI Proxy)
│   └── package.json        # Node dependencies
├── frontend/               # React 19 / Vite SPA
│   ├── src/
│   │   ├── app/            # Global State & Context Providers
│   │   ├── components/     # UI Components (Charts, Modals, 3D Canvas, Dialogs)
│   │   │   ├── edit-family-member-dialog.tsx # Vitals and profile editor
│   │   │   └── wellness-score.tsx  # Glassmorphic live-HR vitals indicator
│   │   ├── layouts/        # Page Shells (Dashboard, Premium Auth)
│   │   ├── pages/          # View Logic (Guardian Landing, Vitals, Vault, Map)
│   │   ├── services/       # API Abstraction (Backend & AI Engine)
│   │   ├── lib/            # Styling Tokens (Tailwind v4), Utilities
│   │   └── main.tsx        # App Entry
│   ├── public/             # Static Assets & 3D Models
│   └── vite.config.ts      # Build configuration
├── server/                 # Python AI Clinical Inference Engine
│   ├── ai_engine.py         # Advanced Inference Engine (SciSpacy + HGBDT + Gemma3)
│   ├── ai_architecture.md   # [DOCS] Technical Deep-Dive on AI Module
│   ├── train_model.py       # ML Training Pipeline
│   ├── model.joblib        # Trained Model Weights
│   ├── metadata.joblib     # NLP Vocabulary & Categorical Encoders
│   ├── requirements.txt    # Python Dependencies
│   └── scratch/            # Experimental scripts & stress tests
├── dataset/                # Clinical training data & synthetic generators
├── README.md               # Project Overview
└── structure.md            # You are here
```

---

## 🎯 Component Responsibilities

### 1. `backend/` (The Orchestrator)
The Express server acts as the central intelligence hub:
- **Authentication & Security**: JWT-based session management, IDOR validation, and password hashing.
- **Vitals Field Encryption**: Encrypts sensitive family database parameters using a AES-256-CBC cypher inside `backend/utils/crypto.js`.
- **Data Persistence**: Aggregates and stores historical vitals, custom profiles, and diagnostic logs in MongoDB.
- **Reporting Service & Vault**: Authenticated file serving, secure upload endpoints, and integration with pdf generation.
- **Map Services**: Proxies requests to Google Maps Platform for address-validated hospital discovery.

### 2. `frontend/` (The Experience)
A high-fidelity React application leveraging the latest web technologies:
- **3D Visualization**: Uses `@react-three/fiber` to render immersive health status environments on the landing page.
- **Glassmorphism Design**: Custom micro-animations and glowing blob backgrounds configured in `frontend/src/index.css`.
- **Vitals & Wellness Dashboard**: Displays wellness indexes computed using live Heart Rate and alerts on bradycardia/tachycardia conditions.
- **Historical Records Editor**: Supports editing vitals (weight, height, heart rate, workouts, etc.) with custom visual indicators (e.g., `EDITED` badge on modified records).
- **In-App Vault Previews**: Preview uploaded PDF and image documents securely inside the web portal without downloading.
- **Tailwind v4**: Utilizes the next-generation CSS framework for a modern, premium aesthetic.

### 3. `server/` (The Intelligence)
A specialized Python microservice dedicated to clinical analysis:
- **Medical NLP**: Powered by `SciSpacy` for high-precision entity extraction from symptoms.
- **Clinical Reasoning**: Integrated with local `Gemma3` LLM for nuanced medical advice.
- **Vitals-Aware ML**: A `HistGradientBoosting` classifier that evaluates symptoms in the context of real-time age, heart rate, and blood pressure.
- **Safety Overlays**: Implements Hallmark Symptom Bypass logic to ensure emergency signals are never suppressed.

---

## 🛠️ Data Flow

1. **Input**: User describes symptoms via the **Frontend** (React).
2. **Preprocessing**: The **Backend** (Node.js) attaches current user vitals (HR, BP) to the request.
3. **NLP Analysis**: The **AI Engine** (FastAPI) extracts medical entities using SciSpacy.
4. **Inference**: The ML model runs a vitals-aware classification to determine severity and specialty.
5. **Enrichment**: Gemma3 provides additional clinical context and preventative advice.
6. **Delivery**: The result is returned to the UI with options for **In-App Previewing** or **PDF Report** download.
