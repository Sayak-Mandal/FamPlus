export async function predictCondition(symptoms: string) {
    try {
        const response = await fetch("http://localhost:8000/predict_symptoms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
