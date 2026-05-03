# 📂 Famplus Project Structure

This document provides a comprehensive overview of the directory structure and the responsibilities of each component in the **Famplus** ecosystem.

---

## 🌳 Directory Tree

```text
Famplus/
├── backend/                # Node.js / Express Orchestration Server
│   ├── models/             # Mongoose Schemas (User, Member, Vitals, Reports)
│   ├── scripts/            # Database initialization & maintenance
│   ├── server.js           # Main Entry Point (Express + Socket.io)
│   └── package.json        # Node dependencies
├── frontend/               # React 19 / Vite SPA
│   ├── src/
│   │   ├── app/            # Global State & Context Providers
│   │   ├── components/     # UI Components (Charts, Modals, 3D Canvas)
│   │   │   └── animated-background.tsx # 2D Physics-based background
│   │   ├── layouts/        # Page Shells (Dashboard, Premium Auth)
│   │   ├── pages/          # View Logic (Guardian Landing, Vitals, Map)
│   │   ├── services/       # API Abstraction (Backend & AI Engine)
│   │   ├── lib/            # Styling Tokens (Tailwind v4), Utilities
│   │   └── main.tsx        # App Entry
│   ├── public/             # Static Assets & 3D Models
│   └── vite.config.ts      # Build configuration
├── server/                 # Python AI Clinical Inference Engine
│   ├── ai_engine.py         # S-Tier Inference Engine (SciSpacy + XGBoost)
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
- **Authentication & Security**: JWT-based session management and encrypted user profiles.
- **Data Persistence**: Aggregates and stores historical vitals and diagnostic logs in MongoDB.
- **Reporting Service**: Interfaces with the AI Engine to compile clinical data into professional PDF reports via `jspdf`.
- **Map Services**: Proxies requests to Google Maps Platform for address-validated hospital discovery.

### 2. `frontend/` (The Experience)
A high-fidelity React application leveraging the latest web technologies:
- **3D Visualization**: Uses `@react-three/fiber` to render immersive health status environments.
- **Tactile UI**: Implements a custom 2D collision physics engine for fluid, reactive interface elements.
- **Real-time Analytics**: High-performance charting via `Recharts` for long-term health trend analysis.
- **Diagnostic Portal**: Integration with the AI module for clinical report generation.
- **Tailwind v4**: Utilizes the next-generation CSS framework for a modern, "S-Tier" aesthetic.

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
6. **Delivery**: The result is returned to the UI and optionally rendered into a **PDF Report**.

---

*Structure valid as of May 2026. Maintainer: Sayak Mandal.*

