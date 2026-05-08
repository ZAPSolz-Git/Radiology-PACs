import api from '@/lib/axios';
import { QACase, QACaseStatus, Modality as QAModality } from '../types';
import { Case, Modality as TechModality } from '../../technician/types/technician';

const mapStatus = (status: string): QACaseStatus => {
    const statusMap: Record<string, QACaseStatus> = {
        'Uploaded': 'New',
        'QA_Pending': 'New',
        'QA_Review': 'QA_Review',
        'Assigned': 'Assigned',
        'In_Progress': 'In_Progress',
        'Rep_Correction': 'Rep_Correction',
        'QA_Audit': 'QA_Audit',
        'Finalized': 'Finalized',
        'Rejected': 'Rejected'
    };
    return statusMap[status] || 'New';
};

const mapModality = (modality: TechModality | string): QAModality => {
    if (modality === 'X-Ray') return 'DX';
    return modality as QAModality;
};

export const QAReceptionService = {
    fetchReceptionQueue: async (): Promise<QACase[]> => {
        try {
            const response = await api.get('/cases');
            const data: Case[] = response.data.data;

            return data.map((c): QACase => ({
                _id: c._id,
                patientId: c.patientId,
                patientName: c.patientName,
                age: c.age,
                gender: c.gender,
                modality: mapModality(c.modality),
                studyDate: c.studyDate,
                accessionNumber: c.accessionNumber || 'N/A',
                status: mapStatus(c.status),
                studyInstanceUID: c.studyInstanceUID,
                sourceHospital: c.institution || 'Unknown Hospital',
                receivedAt: c.createdAt,
                description: c.bodyPart || 'Study',
                technicianId: c.uploadedBy?.name || 'Unknown',
                imageCount: c.dicomFiles?.length || 0,
                seriesCount: new Set(c.dicomFiles?.map(f => f.seriesInstanceUID)).size || 1,
                clinicalHistory: c.clinicalHistory,
                urgency: c.urgency,
                isEmergency: c.isEmergency,
                tatRemainingSeconds: c.tatRemainingSeconds,
                assignedRadiologist: c.assignedRadiologist ? {
                    _id: c.assignedRadiologist._id,
                    name: c.assignedRadiologist.name
                } : undefined,
                report: c.report ? {
                    findings: c.report.findings,
                    impression: c.report.impression,
                    author: c.report.author,
                    status: c.report.status,
                    submittedAt: c.report.submittedAt,
                    version: c.report.version,
                    docxUrl: c.report.docxUrl,
                    docxPath: c.report.docxPath,
                    jsonContent: c.report.jsonContent,
                    banner: c.report.banner
                } : undefined
            }));
        } catch (error) {
            console.error("Failed to fetch QA cases", error);
            throw error;
        }
    },

    indexCaseMetadata: async (caseId: string) => {
        try {
            const response = await api.get(`/cases/${caseId}/metadata`);
            return { success: true, data: response.data.data, timestamp: new Date().toISOString() };
        } catch (error) {
            console.error("Failed to index metadata", error);
            return { success: false, timestamp: new Date().toISOString() };
        }
    },

    rejectCase: async (caseId: string, reason: string, notes: string) => {
        try {
            const response = await api.post(`/qa/${caseId}/reject`, { reason, notes });
            return response.data.data;
        } catch (error) {
            console.error("Failed to reject case", error);
            throw error;
        }
    },

    resolveCase: async (caseId: string) => {
        try {
            const response = await api.patch(`/cases/${caseId}/resolve`);
            return response.data.data;
        } catch (error) {
            console.error("Failed to resolve case", error);
            throw error;
        }
    },

    updateReport: async (caseId: string, data: any) => {
        try {
            const isFormData = data instanceof FormData;
            const response = await api.patch(`/qa/${caseId}/report`, data, {
                headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
            });
            return response.data.data;
        } catch (error) {
            console.error("Failed to update report", error);
            throw error;
        }
    },

    finalizeReport: async (caseId: string, data: any) => {
        try {
            const isFormData = data instanceof FormData;
            const response = await api.post(`/qa/${caseId}/finalize`, data, {
                headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
            });
            return response.data.data;
        } catch (error) {
            console.error("Failed to finalize report", error);
            throw error;
        }
    }
};
