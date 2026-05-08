import api from '@/lib/axios';
import { Case } from '@/features/technician/types/technician';

// Add QA specific response types here if needed
export interface QAQueueResponse {
    urgent: Case[];
    routine: Case[];
}

export const QAService = {
    // Get cases waiting for QA
    async getQueue(): Promise<Case[]> {
        const response = await api.get('/qa/queue');
        return response.data.data;
    },

    // Verify checkpoints (Approve step 1)
    async verifyCase(id: string, data: {
        identityMatch: boolean;
        imageQuality: 'Optimal' | 'Adequate' | 'Suboptimal' | 'Unacceptable';
        protocolValid: boolean;
        contrastCheck: boolean;
        notes?: string;
    }): Promise<Case> {
        const response = await api.post(`/qa/${id}/verify`, data);
        return response.data.data;
    },

    // Dispatch to Doctor (Approve step 2)
    async dispatchCase(id: string, assignment: {
        doctorId: string;
        priority?: 'Routine' | 'STAT';
    }): Promise<Case> {
        const response = await api.post(`/qa/${id}/dispatch`, assignment);
        return response.data.data;
    },

    // Reject back to Tech
    async rejectCase(id: string, reason: {
        reason: string;
        notes?: string;
    }): Promise<Case> {
        const response = await api.post(`/qa/${id}/reject`, reason);
        return response.data.data;
    }
};
