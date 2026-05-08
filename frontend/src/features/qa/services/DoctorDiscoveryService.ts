import api from '@/lib/axios';
import { RadiologistDetails, Modality } from '../types';

export const DoctorDiscoveryService = {
    fetchAvailableDoctors: async (modality?: Modality): Promise<RadiologistDetails[]> => {
        try {
            const response = await api.get('/auth/radiologists');
            return response.data.data;
        } catch (error) {
            console.error("Failed to fetch radiologists", error);
            return [];
        }
    },

    assignCase: async (caseId: string, doctorId?: string, partnerId?: string) => {
        try {
            const payload: any = {};
            if (doctorId) payload.radiologistId = doctorId;
            if (partnerId) payload.partnerId = partnerId;
            
            const response = await api.patch(`/cases/${caseId}/assign`, payload);
            return { success: true, timestamp: new Date().toISOString(), data: response.data.data };
        } catch (error: any) {
            console.error(`Failed to assign case ${caseId}`, error);
            throw new Error(error.response?.data?.message || "Failed to assign case");
        }
    },

    fetchPartners: async (): Promise<PartnerDetails[]> => {
        try {
            const response = await api.get('/qa/partners');
            console.log('[fetchPartners] Response:', response.data);
            return response.data.data || [];
        } catch (error: any) {
            console.error("Failed to fetch partners", error);
            toast.error("Failed to load partners: " + (error.response?.data?.message || error.message));
            return [];
        }
    }
};
