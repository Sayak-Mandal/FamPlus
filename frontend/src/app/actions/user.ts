import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
});

// Helper to get userId from localStorage
const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}` };
};

export async function login(formData: FormData) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    
    if (!username || !password) {
        throw new Error("Username and password are required");
    }

    // If it looks like an email, use it directly, otherwise assume it is a username
    const email = username.includes('@') ? username : `${username.toLowerCase().replace(/\s+/g, '')}@famplus.com`;
    
    // Call Express backend to login
    try {
        const res = await api.post('/auth/login', { email, password });
        const user = res.data;
        localStorage.setItem('userId', user.id);
        localStorage.setItem('token', user.token);
        return user;
    } catch (error: any) {
        const message = error.response?.data?.error || "Login failed";
        throw new Error(message);
    }
}

export async function register(name: string, email: string, password: string) {
    try {
        const res = await api.post('/auth/register', { name, email, password });
        const user = res.data;
        localStorage.setItem('userId', user.id);
        localStorage.setItem('token', user.token);
        return user;
    } catch (error: any) {
        const message = error.response?.data?.error || "Registration failed";
        throw new Error(message);
    }
}

export async function deleteAccount() {
    try {
        await api.delete('/auth/account', { headers: getHeaders() });
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
    } catch (error) {
        console.error("Error deleting account:", error);
    }
}

// ─────────────────────────────────────────────
// FAMILY CIRCLE ACTIONS
// ─────────────────────────────────────────────

export async function getCircleDetails() {
    try {
        const res = await api.get('/circle/details', { headers: getHeaders() });
        return res.data;
    } catch (error) {
        console.error("Error fetching circle details:", error);
        return null;
    }
}

export async function inviteToCircle(email: string) {
    try {
        const res = await api.post('/circle/invite', { email }, { headers: getHeaders() });
        return { success: true, message: res.data.message };
    } catch (error: any) {
        const message = error.response?.data?.error || "Invitation failed";
        return { success: false, error: message };
    }
}

export async function getCircleInvites() {
    try {
        const res = await api.get('/circle/invites', { headers: getHeaders() });
        return res.data;
    } catch (error) {
        console.error("Error fetching circle invites:", error);
        return [];
    }
}

export async function acceptInvite(circleId: string) {
    try {
        const res = await api.post('/circle/accept', { circleId }, { headers: getHeaders() });
        return { success: true, migratedCount: res.data.migratedCount };
    } catch (error: any) {
        const message = error.response?.data?.error || "Failed to join circle";
        return { success: false, error: message };
    }
}
