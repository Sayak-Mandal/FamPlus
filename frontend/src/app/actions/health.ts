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

export async function analyzeSymptomsAndFindDoctors(symptoms: string) {
    try {
        const response = await api.post(`/doctors/analyze`, { symptoms }, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        return { analysis: "Error analyzing symptoms", specialty: "General Physician", doctors: [] };
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
