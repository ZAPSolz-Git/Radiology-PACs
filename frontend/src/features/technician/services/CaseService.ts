import api from '@/lib/axios';
import { Case, Patient } from '../types/technician';

export interface UploadProgress {
    uploadedFiles: number;
    totalFiles: number;
    completedBatches: number;
    totalBatches: number;
    phase: 'creating' | 'uploading' | 'retrying' | 'complete' | 'exporting';
    failedCount: number;
}

export const CaseService = {
    async getCases(filters?: {
        /** Filter by status string (e.g. "Uploaded", "Finalized") */
        status?: string;
        /** Filter by modality (e.g. "CT", "MRI") */
        modality?: string;
        /** Lookup by DICOM Study Instance UID */
        studyInstanceUID?: string;
        /** Server-side pagination — page number (1-based) */
        page?: number;
        /** Server-side pagination — max results per page */
        limit?: number;
        /** Allow any extra ad-hoc filter the backend supports */
        [key: string]: any;
    }): Promise<Case[]> {
        const response = await api.get('/cases', { params: filters });
        const data = response.data.data;
        return data.map((c: any) => ({
            ...c,
            qaDetails: c.qaVerification?.verifiedBy ? { _id: c.qaVerification.verifiedBy._id, name: c.qaVerification.verifiedBy.name } : undefined
        }));
    },

    async getServerInfo(): Promise<{ localIp: string; scuPort: string }> {
        const response = await api.get('/pacs/server-info');
        return response.data.data;
    },

    async getCaseById(id: string): Promise<Case> {
        const response = await api.get(`/cases/${id}`);
        const c = response.data.data;
        return {
            ...c,
            qaDetails: c.qaVerification?.verifiedBy ? { _id: c.qaVerification.verifiedBy._id, name: c.qaVerification.verifiedBy.name } : undefined
        };
    },

    async uploadStudy(files: File[], metadata: any, onProgress?: (progress: UploadProgress) => void, imageFiles: File[] = []): Promise<Case> {
        const BATCH_SIZE = 50;
        const totalFiles = files.length + imageFiles.length;
        let finalCase: Case | null = null;

        // Calculate total batches upfront
        const totalBatches = Math.ceil(files.length / BATCH_SIZE) || 1;
        let completedBatches = 0;
        let uploadedFiles = 0;

        const fireProgress = (phase: UploadProgress['phase'], failedCount = 0) => {
            onProgress?.({
                uploadedFiles,
                totalFiles,
                completedBatches,
                totalBatches,
                phase,
                failedCount,
            });
        };

        // Metadata + Attachments should generally go with the first batch
        // so the Case is created correctly with all details.
        const createBatchData = (batchFiles: File[], isFirstBatch: boolean, batchImages: File[] = []) => {
            const formData = new FormData();
            if (isFirstBatch) {
                formData.append('patientName', metadata.patientName);
                formData.append('patientId', metadata.patientId);
                formData.append('age', metadata.age);
                formData.append('gender', metadata.gender);
                formData.append('bodyPart', metadata.bodyPart || 'GENERAL');
                formData.append('studyInstanceUID', metadata.studyInstanceUID);
                formData.append('clinicalHistory', metadata.clinicalHistory || '');
                formData.append('referringDoctor', metadata.referringDoctor || '');
                formData.append('institution', metadata.institution || '');
                formData.append('accessionNumber', metadata.accessionNumber || '');
                formData.append('modality', metadata.modality || 'CT');
                formData.append('urgency', metadata.urgency || 'Routine');
                formData.append('uploadMode', metadata.uploadMode || 'folder');
                formData.append('checklist', JSON.stringify(metadata.checklist));

                if (metadata.attachments && metadata.attachments.length > 0) {
                    metadata.attachments.forEach((file: File) => {
                        formData.append('attachments', file);
                    });
                }

                if (batchImages && batchImages.length > 0) {
                    batchImages.forEach(file => {
                        formData.append('images', file);
                    });
                }
            } else {
                // Subsequent batches only need these for identification
                formData.append('studyInstanceUID', metadata.studyInstanceUID);
                formData.append('uploadMode', metadata.uploadMode || 'folder');
            }

            batchFiles.forEach(file => {
                formData.append('files', file);
            });

            return formData;
        };

        const uploadBatch = async (batchFiles: File[], isFirst: boolean, batchImages: File[] = []) => {
            const formData = createBatchData(batchFiles, isFirst, batchImages);
            const url = metadata.uploadMode === 'pacs' ? '/cases/upload?uploadMode=pacs' : '/cases/upload';
            const response = await api.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-Upload-Mode': metadata.uploadMode || 'folder'
                }
            });
            return response.data.data;
        };

        // 1. Upload the first batch first to ensure the Case exists
        fireProgress('creating');
        const firstBatchFiles = files.slice(0, BATCH_SIZE);
        finalCase = await uploadBatch(firstBatchFiles, true, imageFiles);
        uploadedFiles = firstBatchFiles.length + imageFiles.length;
        completedBatches = 1;
        fireProgress('uploading');
        console.log(`[Frontend Upload] Case created. Uploaded ${uploadedFiles}/${totalFiles} objects.`);

        // 2. Upload remaining batches in parallel (Concurrency: 3)
        const remainingFiles = files.slice(BATCH_SIZE);
        if (remainingFiles.length === 0) {
            fireProgress('complete');
            return finalCase as Case;
        }

        const batches: File[][] = [];
        for (let i = 0; i < remainingFiles.length; i += BATCH_SIZE) {
            batches.push(remainingFiles.slice(i, i + BATCH_SIZE));
        }

        // Process batches in chunks of 3 concurrent requests
        const CHUNK_CONCURRENCY = 3;
        const failedBatches: File[][] = [];

        for (let i = 0; i < batches.length; i += CHUNK_CONCURRENCY) {
            const chunk = batches.slice(i, i + CHUNK_CONCURRENCY);
            const results = await Promise.allSettled(
                chunk.map(batch => uploadBatch(batch, false))
            );

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    uploadedFiles += chunk[idx].length;
                    completedBatches++;
                    finalCase = result.value; // keep latest response
                } else {
                    console.error(`[Frontend Upload] Batch failed, will retry:`, result.reason);
                    failedBatches.push(chunk[idx]);
                }
            });

            fireProgress('uploading', failedBatches.length);
            console.log(`[Frontend Upload] Progress: ${uploadedFiles}/${totalFiles} files uploaded.`);
        }

        // Retry failed batches one-by-one
        if (failedBatches.length > 0) {
            fireProgress('retrying', failedBatches.length);
        }
        for (const batch of failedBatches) {
            try {
                const result = await uploadBatch(batch, false);
                uploadedFiles += batch.length;
                completedBatches++;
                finalCase = result;
                fireProgress('retrying', failedBatches.length);
                console.log(`[Frontend Upload] Retry success. Progress: ${uploadedFiles}/${totalFiles}`);
            } catch (err) {
                console.error(`[Frontend Upload] Retry failed for ${batch.length} files. These files were NOT uploaded.`, err);
            }
        }

        fireProgress('complete');
        console.log(`[Frontend Upload] Upload complete. ${uploadedFiles}/${totalFiles} files uploaded.`);
        return finalCase as Case;
    },

    async assignRadiologist(caseId: string, radiologistId: string): Promise<void> {
        await api.patch(`/cases/${caseId}/assign`, { radiologistId });
    },

    async updatePatient(patientId: string, data: Partial<Patient>): Promise<Patient> {
        const response = await api.put(`/patients/${patientId}`, data);
        return response.data.data;
    },

    async setPriority(caseId: string, priority: string): Promise<void> {
        await api.patch(`/cases/${caseId}/priority`, { priority });
    },

    async uploadHistoryFile(caseId: string, file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/cases/${caseId}/history-files`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data.url;
    },

    async getRadiologists(): Promise<any[]> {
        const response = await api.get('/auth/radiologists');
        return response.data.data;
    },

    async getCaseMetadata(id: string): Promise<any> {
        const response = await api.get(`/cases/${id}/metadata`);
        return response.data.data;
    },

    async deleteCase(id: string): Promise<void> {
        await api.delete(`/cases/${id}`);
    },

    async getDeleteImpact(id: string): Promise<any> {
        const response = await api.get(`/cases/${id}/delete-impact`);
        return response.data.data;
    },

    async submitCase(id: string): Promise<Case> {
        const response = await api.post(`/cases/${id}/submit`);
        return response.data.data;
    },

    async updateCase(id: string, data: any, attachments: File[] = []): Promise<Case> {
        let payload = data;
        let config = {};

        // If we have attachments, we must use FormData
        if (attachments && attachments.length > 0) {
            const formData = new FormData();

            // Append all data fields
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    if (typeof data[key] === 'object') {
                        formData.append(key, JSON.stringify(data[key]));
                    } else {
                        formData.append(key, data[key] as string);
                    }
                }
            });

            // Append Attachments
            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            payload = formData;
            config = { headers: { 'Content-Type': 'multipart/form-data' } };
        }

        const response = await api.put(`/cases/${id}`, payload, config);
        return response.data.data;
    },

    async addAttachment(caseId: string, file: File | Blob): Promise<{ url: string, attachment: any }> {
        const formData = new FormData();
        const fileName = (file as File).name || `snapshot-${Date.now()}.png`;
        formData.append('file', file, fileName);

        const response = await api.post(`/cases/${caseId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    },

    async resolveRejection(id: string): Promise<Case> {
        const response = await api.patch(`/cases/${id}/resolve`);
        return response.data.data;
    },

    async createShareLink(caseId: string, role: string, expiresIn: string = "24h"): Promise<{ shareUrl: string; token: string; expiresAt: string }> {
        const response = await api.post('/share-links', { caseId, role, expiresIn });
        return response.data.data;
    },

    async revokeShareLink(token: string): Promise<void> {
        await api.delete(`/share-links/${token}`);
    },

    async getCaseShareLinks(caseId: string): Promise<any[]> {
        const response = await api.get(`/share-links/case/${caseId}`);
        return response.data.data;
    },

    async runIntegrityValidation(id: string): Promise<void> {
        await api.post(`/cases/${id}/validate`);
    },

    async deleteDicomFrame(id: string, sopUid: string): Promise<void> {
        await api.delete(`/cases/${id}/images/${sopUid}`);
    },

    async replaceDicomFrame(id: string, sopUid: string, file: File): Promise<void> {
        const formData = new FormData();
        formData.append('file', file);
        await api.patch(`/cases/${id}/images/${sopUid}/replace`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    async insertDicomFrame(id: string, targetIndex: number, file: File): Promise<void> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetIndex', targetIndex.toString());
        await api.post(`/cases/${id}/images/insert`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // PACS Integration Methods
    async getSites(): Promise<any[]> {
        const response = await api.get('/pacs/sites');
        return response.data.data;
    },

    async searchPACS(siteId: string, params: any): Promise<any[]> {
        const response = await api.get('/pacs/search', { params: { siteId, ...params } });
        return response.data.data;
    },

    async importFromPACS(siteId: string, studyInstanceUID: string): Promise<any> {
        const response = await api.post('/pacs/import', { siteId, studyInstanceUID });
        return response.data.data;
    },

    async createFromPACS(data: any): Promise<Case> {
        const response = await api.post('/pacs/import-study', data);
        return response.data.data;
    },

    async createPacsSite(data: any): Promise<any> {
        const response = await api.post('/pacs/sites', data);
        return response.data.data;
    },

    async updatePacsSite(siteId: string, data: any): Promise<any> {
        const response = await api.put(`/pacs/sites/${siteId}`, data);
        return response.data.data;
    },

    async deletePacsSite(siteId: string): Promise<any> {
        const response = await api.delete(`/pacs/sites/${siteId}`);
        return response.data.data;
    },

    async testPacsConnection(data: any): Promise<any> {
        const response = await api.post('/pacs/test-connection', data);
        return response.data.data;
    },

    async getStudyByUID(studyInstanceUID: string): Promise<any | null> {
        const response = await api.get('/cases', { params: { studyInstanceUID } });
        return response.data.data && response.data.data.length > 0 ? response.data.data[0] : null;
    },

    async exportToPACS(files: File[], siteId: string, options?: { studyInstanceUID?: string, onProgress?: (progress: UploadProgress) => void }): Promise<any> {
        const formData = new FormData();
        formData.append('siteId', siteId);
        if (options?.studyInstanceUID) {
            formData.append('studyInstanceUID', options.studyInstanceUID);
        }

        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('dicomFiles', file);
            });
        }

        const response = await api.post('/pacs/export', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (files && files.length > 0) {
                    const total = progressEvent.total || files.reduce((acc, f) => acc + f.size, 0);
                    if (options?.onProgress) {
                        options.onProgress({
                            uploadedFiles: Math.round((progressEvent.loaded / total) * files.length),
                            totalFiles: files.length,
                            completedBatches: 1,
                            totalBatches: 1,
                            phase: 'uploading',
                            failedCount: 0
                        });
                    }
                }
            }
        });
        return response.data.data;
    },

    async getPacsReceived(): Promise<any[]> {
        const response = await api.get('/pacs/received');
        return response.data.data;
    },

    async getScpStatus(): Promise<{ isRunning: boolean; port: string; activeStudies: Array<{ studyInstanceUID: string; receivedFiles: number }> }> {
        const response = await api.get('/pacs/scp-status');
        return response.data.data;
    },
};
