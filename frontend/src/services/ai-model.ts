/**
 * @file ai-model.ts
 * @description Frontend service layer for the Famplus AI Diagnostic Engine.
 *
 * Communicates through the Node.js backend proxy which securely forwards
 * requests to the Python AI engine. This avoids CORS issues and ensures
 * the API key / AI engine URL is never exposed to the browser.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Optional vitals context from the user's dashboard.
 * When provided, the AI engine uses these objective measurements
 * to improve diagnostic accuracy (e.g., elevated HR boosts cardiac conditions).
 *
 * All fields are optional — the system gracefully degrades to
 * symptom-only mode if vitals are absent or stale.
 */
export interface VitalsContext {
    heart_rate?:       number;   // bpm
    blood_pressure?:   string;   // "120/80" format
    sleep?:            string;   // "7h" or "7h 30m" format
    age?:              number;
    data_age_minutes?: number;   // how many minutes old the vitals data is
}

/**
 * Sends a symptom description to the AI diagnostic engine via the backend
 * proxy and returns the prediction result.
 *
 * NOTE: This function calls /api/doctors/analyze (not the AI engine directly),
 * so it requires the user to be authenticated. Make sure the JWT token is
 * stored in localStorage under the key 'token'.
 *
 * @param symptoms       - Natural language symptom description
 * @param vitalsContext  - Optional dashboard vitals for context-aware diagnosis (unused here, handled server-side)
 * @returns Prediction object with condition, confidence, advice, specialist, etc.
 */
export async function predictCondition(symptoms: string, vitalsContext?: VitalsContext) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/doctors/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ symptoms }),
        });

        if (!response.ok) {
            throw new Error("AI Service Unavailable");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("AI Service Error:", error);
        // Fallback for offline/error
        return {
            condition: "Service Unavailable",
            confidence: 0,
            advice: "Unable to connect to AI engine. Please ensure the server is running.",
            specialist: "System Administrator"
        };
    }
}

// Deprecated: trainModel is no longer needed on client
export async function trainModel() {
    console.log("Training deferred to Python backend.");
}
