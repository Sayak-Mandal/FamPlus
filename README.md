# 🏥 Famplus — Proactive S-Tier Family Healthcare

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20+%20Python%20AI-success)](./structure.md)

Famplus is a premium, high-performance health platform engineered for proactive family wellness. By fusing a cutting-edge **MERN stack** with a specialized **Medical AI engine**, Famplus delivers diagnostic precision, real-time vitals intelligence, and professional-grade reporting in a stunning, high-fidelity interface.

---

## 🚀 Vision: S-Tier Diagnostic Intelligence

Famplus isn't just a tracker; it's a clinical-grade companion. Our latest version introduces **Guardian Technology**—a 3D-enhanced preventative layer that monitors family health trends with unprecedented depth.

### 🧠 Advanced AI Ecosystem
*   **SciSpacy NLP Pipeline**: Migrated from manual keyword mapping to automated biomedical entity extraction. The AI now understands complex medical terminology and conversational symptom descriptions.
*   **Vitals-Aware Inference**: Our Gradient Boosting model doesn't just look at symptoms; it correlates them with real-time Age, Heart Rate, and Blood Pressure for high-fidelity clinical triage.
*   **Technical Deep-Dive**: Explore our inference strategy and safety guardrails in [ai_architecture.md](server/ai_architecture.md).
*   **Local Gemma3 LLM Backend**: Integrated local Large Language Model capabilities for deep clinical reasoning and contextual health advice without compromising privacy.
*   **Vitals-Contextual Diagnostics**: Inference is uniquely aware of the patient's individual vitals (Age, Heart Rate, BP), biasing diagnostic probabilities based on real-time evidence.
*   **Professional PDF Reporting**: Branded, clinical-ready PDF diagnostic reports generated directly from the dashboard for sharing with healthcare providers.

### 🎨 Premium Design & UX
*   **3D Guardian Landing Page**: An immersive Three.js-powered experience showcasing the "Guardian" preventative features.
*   **Custom Physics Engine**: A lightweight 2D collision physics engine powers micro-interactions and animated CSS icons for a tactile, high-end feel.
*   **Medical-Themed Auth UI**: A completely overhauled, branded authentication flow with smooth transitions and refined typography.
*   **Responsive Analytics**: Interactive Recharts dashboards that visualize health data across all devices.

---

## 🛠️ High-Performance Technology Stack

| Layer | Core Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, Three.js, Framer Motion, jspdf |
| **Backend** | Node.js, Express, MongoDB (Mongoose), JWT Security |
| **AI Engine** | Python 3.11, FastAPI, SciSpacy (en_core_sci_sm), Scikit-learn, Gemma3 |
| **Mapping** | Google Maps Platform (Address-based routing), Leaflet |

---

## 📦 Quick Start

### 1. Prerequisites
- **Node.js** (v18+) & **Python** (v3.9+)
- **MongoDB** (Local or Atlas)
- **Google Maps API Key** (for Find Care features)

### 2. Backend Orchestrator
```bash
cd backend
npm install
# Configure .env with MONGO_URI, JWT_SECRET, and GOOGLE_MAPS_API_KEY
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

---

*Developed with ❤️ by Sayak Mandal. Built for the future of digital health.*

