import api from '@/lib/axios';

export interface OrthancStudy {
    id: string; // Orthanc internal ID
    patientId: string;
    patientName: string;
    studyDate: string;
    studyTime: string;
    studyInstanceUID: string;
    accessionNumber: string;
    studyDescription: string;
    seriesCount: number;
    isLinked: boolean;
    dbCaseId: string | null;
}

export interface OrthancSeries {
    id: string; // Orthanc internal series ID
    modality: string;
    seriesNumber: string;
    seriesDescription: string;
    instanceCount: number;
}

export interface OrthancStudyDetail extends OrthancStudy {
    series: OrthancSeries[];
}

export interface OrthancStats {
    totalDiskSizeMB: string;
    totalUncompressedSizeMB: string;
    countPatients: number;
    countStudies: number;
    countSeries: number;
    countInstances: number;
}

export const OrthancService = {
    async getStudies(): Promise<OrthancStudy[]> {
        const response = await api.get('/orthanc/studies');
        return response.data.data;
    },

    async getStudyDetail(orthancId: string): Promise<OrthancStudyDetail> {
        const response = await api.get(`/orthanc/studies/${orthancId}`);
        return response.data.data;
    },

    async getStats(): Promise<OrthancStats> {
        const response = await api.get('/orthanc/stats');
        return response.data.data;
    },

    async deleteStudy(orthancId: string, cascadeToDB: boolean = false): Promise<any> {
        const response = await api.delete(`/orthanc/studies/${orthancId}?cascade=${cascadeToDB}`);
        return response.data.data;
    },

    async bulkDeleteStudies(orthancIds: string[], cascadeToDB: boolean = false): Promise<number> {
        let successCount = 0;
        // Process sequentially to avoid overwhelming Orthanc/DB
        for (const id of orthancIds) {
            try {
                await this.deleteStudy(id, cascadeToDB);
                successCount++;
            } catch (error) {
                console.error(`Failed to delete Orthanc study ${id}:`, error);
            }
        }
        return successCount;
    }
};
