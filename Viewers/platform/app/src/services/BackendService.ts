import axios from 'axios';

// Create a simple axios instance for backend calls
const api = axios.create({
    baseURL: (window as any).config?.backendUrl || 'http://localhost:5000/api',
    withCredentials: true,
});

// Request interceptor to add access token from localStorage/cookies if needed
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const RadiologistService = {
    async getCase(caseId: string) {
        const response = await api.get(`/cases/${caseId}`);
        return response.data.data || response.data;
    },

    async saveDraft(caseId: string, formData: FormData) {
        const response = await api.post(`/radiologist/${caseId}/draft`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    async submitReport(caseId: string, formData: FormData) {
        const response = await api.post(`/radiologist/${caseId}/submit`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }
};

export const CaseService = {
    async addAttachment(caseId: string, blob: Blob) {
        const formData = new FormData();
        formData.append('file', blob, 'snapshot.png');
        const response = await api.post(`/cases/${caseId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }
};

export default api;
