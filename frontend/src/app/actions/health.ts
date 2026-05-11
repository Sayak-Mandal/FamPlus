import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
});

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}` };
};

export async function createFamilyMember(data: any) {
    try {
        const response = await api.post(`/family`, data, { headers: getHeaders() });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: "Failed to create family member" };
    }
}

export async function logVitals(familyMemberId: string, data: any) {
    try {
        await api.post(`/family/${familyMemberId}/vitals`, data, { headers: getHeaders() });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to log vitals" };
    }
}

export async function logSymptom(familyMemberId: string, symptoms: string, analysis: string, severity: string) {
    try {
        await api.post(`/family/${familyMemberId}/symptoms`, { symptoms, analysis, severity }, { headers: getHeaders() });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to log symptoms" };
    }
}

export async function analyzeAndLogSymptom(familyMemberId: string, symptoms: string) {
    try {
        const response = await api.post(`/family/${familyMemberId}/analyze-symptoms`, { symptoms }, { headers: getHeaders() });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: "Failed to analyze symptoms" };
    }
}

export async function getVitalsHistory(familyMemberId: string) {
    try {
        const response = await api.get(`/family/${familyMemberId}/vitals`, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        return [];
    }
}

export async function getFamilyMembers(userId?: string) {
    try {
        // We use the JWT for identity, userId parameter is now secondary
        const response = await api.get(`/family`, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        return [];
    }
}

export async function analyzeSymptomsAndFindDoctors(symptoms: string, providedSpecialist?: string, providedAnalysis?: string) {
    try {
        const payload: any = { symptoms };
        if (providedSpecialist) payload.providedSpecialist = providedSpecialist;
        if (providedAnalysis) payload.providedAnalysis = providedAnalysis;
        
        const response = await api.post(`/doctors/analyze`, payload, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        return { analysis: "Error analyzing symptoms", specialty: "General Physician", doctors: [] };
    }
}

/**
 * Calls the Python AI engine DIRECTLY (bypassing the Node backend proxy) to get
 * a specialist recommendation for a given symptom description.
 * This is the correct approach since the doctor list lives in the frontend and
 * the Node proxy has a MongoDB lookup that always returns 0 results.
 *
 * @param symptoms - Natural language symptom string
 * @returns The specialist name (e.g. "Cardiologist") and the condition analysis text
 */
export async function predictSpecialty(symptoms: string): Promise<{ specialist: string; analysis: string; urgency: string }> {
    try {
        const response = await fetch('http://localhost:8000/predict_symptoms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms }),
        });
        if (!response.ok) throw new Error(`AI engine error: ${response.status}`);
        const data = await response.json();
        return {
            specialist: data.specialist || 'General Physician',
            analysis: `${data.condition} — ${data.advice}`,
            urgency: data.urgency || 'Normal',
        };
    } catch (error) {
        console.error('Direct AI engine call failed:', error);
        return { specialist: 'General Physician', analysis: 'Unable to analyze symptoms.', urgency: 'Normal' };
    }
}


export async function updateVitalLog(logId: string, data: any) {
    try {
        await api.put(`/vitals/${logId}`, data, { headers: getHeaders() });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update vital log" };
    }
}

export async function deleteVitalLog(logId: string) {
    try {
        await api.delete(`/vitals/${logId}`, { headers: getHeaders() });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete vital log" };
    }
}

export async function updateFamilyMember(memberId: string, data: any) {
    try {
        await api.put(`/family/${memberId}`, data, { headers: getHeaders() });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update family member" };
    }
}

export async function uploadRecord(formData: FormData) {
    try {
        const response = await api.post(`/records/upload`, formData, { 
            headers: { 
                ...getHeaders(),
                'Content-Type': 'multipart/form-data'
            } 
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: "Failed to upload record" };
    }
}

export async function getRecords() {
    try {
        const response = await api.get(`/records`, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        return [];
    }
}

export async function deleteRecord(recordId: string) {
    try {
        await api.delete(`/records/${recordId}`, { headers: getHeaders() });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete record" };
    }
}
