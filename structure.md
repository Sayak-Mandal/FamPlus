# 📂 Famplus Project Structure

This document provides a comprehensive overview of the directory structure and the responsibilities of each component in the **Famplus** ecosystem.

---

## 🌳 Directory Tree

```text
Famplus/
├── backend/                # Node.js / Express API Server
│   ├── models/             # Mongoose Data Models (User, FamilyMember, VitalLog, etc.)
│   ├── scripts/            # Database utility scripts
│   ├── server.js           # Main Express entry point & Orchestration logic
│   └── package.json        # Backend dependencies & scripts
├── frontend/               # React / Vite SPA
│   ├── src/
│   │   ├── app/            # Core application state (Context API)
│   │   ├── components/     # Reusable UI components (Modals, Charts, Forms)
│   │   ├── layouts/        # Page layouts (Dashboard, Auth)
│   │   ├── pages/          # Full page views (Login, Dashboard, FindCare)
│   │   ├── services/       # API client abstractions (Axios wrappers)
│   │   ├── lib/            # Utility functions & styling tokens
│   │   └── main.tsx        # React mounting point
│   ├── public/             # Static assets (images, icons)
│   └── package.json        # Frontend dependencies & Vite config
├── server/                 # Python AI Inference Engine
│   ├── ai_engine.py        # FastAPI server & NLP pre-processing layer
│   ├── train_model.py      # ML Training pipeline (Scikit-learn)
│   ├── generate_synthetic_data.py # Dataset generation for local training
│   ├── model.joblib        # Serialized ML model weights
│   ├── metadata.joblib     # Model vocabulary and label mappings
│   └── requirements.txt    # Python dependencies
├── dataset/                # Raw health data for model training
├── .env                    # Global environment configuration (shared)
└── README.md               # Project overview and setup guide
```

---

## 🎯 Component Responsibilities

### 1. `backend/` (The Orchestrator)
The Express server acts as the central hub. It handles:
- **Authentication**: Managing user accounts and session state.
- **Persistence**: Saving and retrieving family health data from MongoDB.
- **Orchestration**: Forwarding complex medical queries to the Python AI engine and aggregating results for the UI.

### 2. `frontend/` (The Experience)
A high-performance React application built with Vite. It features:
- **Personalized UI**: Dynamic dashboards tailored to individual family profiles.
- **Data Visualization**: Rich, interactive charts for health trend analysis.
- **Responsive Design**: Fully optimized for both desktop and mobile viewing.

### 3. `server/` (The Intelligence)
A Python microservice powered by FastAPI. Its core functions are:
- **NLP Processing**: Mapping free-form text symptoms to structured medical data.
- **Machine Learning**: Running inference via a Bernoulli Naive Bayes classifier to identify conditions.
- **Safety Rails**: Implementing a "General Physician First" logic to ensure conservative and safe medical guidance.

---

## 🛠️ Data Flow

1. **User Action**: A user enters symptoms in the **Frontend**.
2. **Request**: The Frontend sends the data to the **Express Backend**.
3. **AI Inference**: The Backend forwards the symptoms to the **Python AI Engine**.
4. **Analysis**: The AI Engine processes the text, runs the ML model, and returns a specialist recommendation.
5. **Persistence**: The Backend logs the analysis in **MongoDB**.
6. **Response**: The result is sent back to the Frontend for display.
