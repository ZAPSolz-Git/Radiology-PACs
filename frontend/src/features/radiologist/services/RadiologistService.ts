import api from '@/lib/axios';
import { RadiologistCase } from '../types';

export const RadiologistService = {
    // Fetch assigned cases from backend
    async fetchWorklist(filters?: { status?: string; priority?: string }): Promise<RadiologistCase[]> {
        const response = await api.get('/radiologist/worklist', { params: filters });
        const data = response.data.data;
        return data.map((c: any) => ({
            ...c,
            uploadedBy: c.uploadedBy ? { _id: c.uploadedBy._id, name: c.uploadedBy.name } : undefined,
            qaDetails: c.qaVerification?.verifiedBy ? { _id: c.qaVerification.verifiedBy._id, name: c.qaVerification.verifiedBy.name } : undefined
        }));
    },

    // Save report draft
    async saveDraft(caseId: string, data: any): Promise<RadiologistCase> {
        const isFormData = data instanceof FormData;
        const response = await api.post(`/radiologist/${caseId}/draft`, data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
        });
        return response.data.data;
    },

    // Submit final report
    async submitReport(caseId: string, data: any): Promise<RadiologistCase> {
        const isFormData = data instanceof FormData;
        const response = await api.post(`/radiologist/${caseId}/submit`, data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
        });
        return response.data.data;
    },

    async acceptCase(caseId: string): Promise<RadiologistCase> {
        const response = await api.patch(`/radiologist/${caseId}/accept`);
        return response.data.data;
    },

    async rejectCase(caseId: string, data: { reason: string; comment: string }): Promise<RadiologistCase> {
        const response = await api.patch(`/radiologist/${caseId}/reject`, data);
        return response.data.data;
    },

    // --- Template Intelligence ---
    async getTemplates(): Promise<any[]> {
        const response = await api.get('/templates');
        return response.data.data;
    },

    async createTemplate(data: any): Promise<any> {
        const response = await api.post('/templates', data);
        return response.data.data;
    },

    async updateTemplate(id: string, data: any): Promise<any> {
        const response = await api.put(`/templates/${id}`, data);
        return response.data.data;
    },

    async deleteTemplate(id: string): Promise<void> {
        await api.delete(`/templates/${id}`);
    },

    // --- Macro Intelligence ---
    async getMacros(): Promise<any[]> {
        const response = await api.get('/macros');
        return response.data.data;
    },

    async createMacro(data: any): Promise<any> {
        const response = await api.post('/macros', data);
        return response.data.data;
    },

    async updateMacro(id: string, data: any): Promise<any> {
        const response = await api.put(`/macros/${id}`, data);
        return response.data.data;
    },

    async deleteMacro(id: string): Promise<void> {
        await api.delete(`/macros/${id}`);
    },

    // --- Profile Settings ---
    async saveSignature(signatureBase64: string | null): Promise<{ signature: string }> {
        const response = await api.post('/auth/signature', { signature: signatureBase64 });
        return response.data.data;
    }
};
