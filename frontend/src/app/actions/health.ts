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
 * Calls the Node.js backend to get a specialist recommendation for a given
 * symptom description. The backend proxies to the Python AI engine and handles
 * failures gracefully.
 *
 * @param symptoms - Natural language symptom string
 * @returns The specialist name (e.g. "Cardiologist") and the condition analysis text
 */
export async function predictSpecialty(symptoms: string): Promise<{ specialist: string; analysis: string; urgency: string }> {
    try {
        const response = await api.post('/doctors/analyze', { symptoms }, { headers: getHeaders() });
        const data = response.data;
        return {
            specialist: data.specialty || 'General Physician',
            analysis: data.analysis || 'Unable to analyze symptoms.',
            urgency: data.urgency || 'Normal',
        };
    } catch (error: any) {
        console.error('predictSpecialty error:', error?.response?.data || error);
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
        const response = await api.put(`/family/${memberId}`, data, { headers: getHeaders() });
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('updateFamilyMember error:', error?.response?.data || error);
        return { success: false, error: error?.response?.data?.error || "Failed to update family member" };
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

export async function downloadRecordFile(fileUrl: string): Promise<Blob | null> {
    try {
        const response = await api.get(fileUrl, {
            headers: getHeaders(),
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        console.error("Failed to download record file", error);
        return null;
    }
}
