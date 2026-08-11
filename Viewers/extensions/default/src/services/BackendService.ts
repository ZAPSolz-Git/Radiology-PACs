import axios from 'axios';

const api = axios.create({
    baseURL: (window as any).config?.backendUrl || 'http://localhost:5000/api',  //http://localhost:5000/api
    withCredentials: true,
});

// ── Request interceptor ──────────────────────────────────────────────
// Auth is handled by HttpOnly cookies (same domain via reverse proxy).
// Only attach the share-link header when a public share token is present.
api.interceptors.request.use(
    (config) => {
        try {
            const shareToken = sessionStorage.getItem('shareToken');
            if (shareToken) {
                config.headers['x-share-token'] = shareToken;
            }
        } catch (err) {
            console.error('[BackendService] Error in request interceptor:', err);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor — 401 redirect ──────────────────────────────
// If the session expires mid-viewer, redirect to /login.
// Exception: share links are intentionally public and should never redirect.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 &&
            !sessionStorage.getItem('shareToken')
        ) {
            console.warn('[BackendService] 401 received — session expired. Redirecting to /login.');
            UserService.clearCache();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── UserService — cached /auth/me ────────────────────────────────────
// Module-level promise so all consumers (index.tsx, Header, ReportEditor)
// share a single network request per page load.
let userPromise: Promise<any> | null = null;

export const UserService = {
    /** Returns the authenticated user profile. Cached per page load. */
    getMe(): Promise<any> {
        // Check cross-app logout signal from the frontend authStore
        try {
            const logoutSignal = localStorage.getItem('viewer-logout-signal');
            if (logoutSignal && userPromise) {
                userPromise = null;
                localStorage.removeItem('viewer-logout-signal');
            }
        } catch { /* localStorage unavailable */ }

        if (!userPromise) {
            userPromise = api
                .get('/auth/me')
                .then((res) => res.data?.data?.user || res.data?.data || null)
                .catch((err) => {
                    console.error('[UserService] getMe failed:', err);
                    userPromise = null;
                    return null;
                });
        }
        return userPromise;
    },

    /** Clear the cached promise (call on logout before redirect). */
    clearCache() {
        userPromise = null;
    },
};

export const RadiologistService = {
    async getCase(caseId: string) {
        const response = await api.get(`/cases/${caseId}`);
        const data = response.data.data || response.data;
        console.log('[RadiologistService] getCase response:', {
            hasReport: !!data.report,
            hasJson: !!data.report?.jsonContent,
            jsonLength: data.report?.jsonContent?.length || 0
        });
        return data;
    },
    async saveDraft(caseId: string, formData: FormData) {
        const response = await api.post(`/radiologist/${caseId}/draft`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data;
    },
    async submitReport(caseId: string, formData: FormData) {
        const response = await api.post(`/radiologist/${caseId}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data;
    },
    async findCaseByStudyUID(studyUID: string) {
        console.log('[RadiologistService] findCaseByStudyUID requested for:', studyUID);
        try {
            const response = await api.get('/cases', { params: { studyInstanceUID: studyUID } });
            const cases = response.data.data || response.data;
            console.log(`[RadiologistService] findCaseByStudyUID found ${cases?.length || 0} cases`);
            return cases.length > 0 ? cases[0] : null;
        } catch (err) {
            console.error('[RadiologistService] findCaseByStudyUID error:', err);
            throw err;
        }
    },
    async getTemplates() {
        try {
            const response = await api.get('/templates');
            return response.data.data || [];
        } catch (err) {
            console.error('[RadiologistService] getTemplates error:', err);
            return [];
        }
    },
    async getMacros() {
        try {
            const response = await api.get('/macros');
            return response.data.data || [];
        } catch (err) {
            console.error('[RadiologistService] getMacros error:', err);
            return [];
        }
    },
    async saveSignature(base64: string) {
        // Fixed: Use correct endpoint /auth/signature (was incorrectly using /radiologist/signature)
        const response = await api.post('/auth/signature', { signature: base64 });
        return response.data;
    }
};

export const CaseService = {
    async addAttachment(caseId: string, blob: Blob) {
        const formData = new FormData();
        formData.append('file', blob, 'snapshot.png');
        const response = await api.post(`/cases/${caseId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data;
    }
};

export const ShareService = {
    async validateShareToken(token: string) {
        const response = await api.get(`/share-links/validate`, { params: { token } });
        return response.data.data;
    }
};

export default api;
