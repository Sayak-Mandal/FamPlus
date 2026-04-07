# 🏥 Famplus - Family Health Tracker

Famplus is a powerful, integrated health platform designed to help families stay ahead of their medical needs. By combining a modern **MERN stack** (MongoDB, Express, React, Node) with a specialized **Python AI engine**, Famplus offers proactive diagnostics, vitals tracking, and care discovery in one seamless interface.

---

## ✨ Key Features

### 🤖 1. AI-Powered Symptom Checker
- **Natural Language Processing (NLP)**: Describe symptoms in plain English (e.g., "I've been feeling dizzy and have a slight fever").
- **Specialist Recommendations**: The AI identifies potential conditions and suggests the right type of doctor (e.g., Cardiologist, Dermatologist).
- **"General Physician First" Philosophy**: Conservative thresholding ensures safe guidance, defaulting to a GP when symptoms are ambiguous.

### 📊 2. Vitals & Wellness Dashboard
- **Real-time Tracking**: Monitor Weight, Height, Heart Rate, and Hydration.
- **Interactive Analytics**: Visualize health trends over time using dynamic charts.
- **Wellness Scoring**: An AI-driven score that analyzes your vitals history to provide a holistic view of your current health status.

### 👨‍👩‍👧‍👦 3. Family Management
- **Centralized Profiles**: Manage health data for multiple family members from a single account.
- **Personalized Avatars**: Custom cartoon-style avatars for each member.
- **Health History**: Securely log and retrieve historical symptom analyses and vital records.

### 🗺️ 4. Care Discovery
- **Doctor Matching**: Automatically finds doctors based on the AI's specialty recommendations.
- **Interactive Maps**: Locate nearby clinics and hospitals using integrated mapping services.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Leaflet |
| **Backend** | Node.js, Express, MongoDB (Mongoose), Axios |
| **AI Engine** | Python 3.x, FastAPI, Scikit-learn (Bernoulli Naive Bayes), Pandas, Joblib |
| **DevOps** | Docker, Dotenv |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **MongoDB** (Local instance or Atlas URI)

### 2. Backend Setup (Node/Express)
```bash
cd backend
npm install
# Create a .env file (see Environment Variables section)
npm start
```

### 3. AI Engine Setup (Python/FastAPI)
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Generate mock training data and train the model
python generate_synthetic_data.py
python train_model.py
# Start the server
python ai_engine.py
```

### 4. Frontend Setup (React/Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file in the **root** of the project:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret_key
```

*Note: The frontend is pre-configured to communicate with the backend on port `5001` and the AI Engine on port `8000` locally.*

---

## 📖 Project Documentation
For a detailed breakdown of the file system and project organization, please refer to [STRUCTURE.md](./structure.md).

---

*Developed with ❤️ for Proactive Family Healthcare.*
