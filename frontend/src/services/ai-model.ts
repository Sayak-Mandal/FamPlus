/**
 * @file ai-model.ts
 * @description Frontend service layer for the Famplus AI Diagnostic Engine.
 *
 * Communicates with the FastAPI backend at localhost:8000 to send symptom
 * descriptions (and optionally, real-time vitals context from the dashboard)
 * for ML-based diagnostic prediction.
 */

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
 * Sends a symptom description (and optional vitals context) to the AI
 * diagnostic engine and returns the prediction result.
 *
 * @param symptoms       - Natural language symptom description
 * @param vitalsContext   - Optional dashboard vitals for context-aware diagnosis
 * @returns Prediction object with condition, confidence, advice, specialist, etc.
 */
export async function predictCondition(symptoms: string, vitalsContext?: VitalsContext) {
    try {
        const body: Record<string, unknown> = { symptoms };

        // Only include vitals_context if provided and non-empty
        if (vitalsContext) {
            body.vitals_context = vitalsContext;
        }

        const response = await fetch("http://localhost:8000/predict_symptoms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
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
