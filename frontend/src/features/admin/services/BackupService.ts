import api from '@/lib/axios';

export interface BackupRecord {
    _id: string;
    backupId: string;
    type: 'automatic' | 'manual';
    status: 'success' | 'failed' | 'in-progress';
    size: string;
    sizeBytes: number;
    filePath: string;
    retention: string;
    triggeredBy?: { name: string; email: string };
    errorMessage?: string;
    createdAt: string;
}

export interface BackupStats {
    totalStorage: string;
    totalBytes: number;
    totalBackups: number;
    successCount: number;
    failedCount: number;
    health: string;
    healthDetail: string;
    lastBackupAt: string | null;
}

export interface ComplianceStats {
    lockedCases: number;
    accessChecks: number;
    violations: number;
    lastBackup: string | null;
    complianceScore: number;
}

export class BackupService {
    static async getAllBackups(): Promise<BackupRecord[]> {
        const response = await api.get('/backups');
        return response.data.data;
    }

    static async getStats(): Promise<BackupStats> {
        const response = await api.get('/backups/stats');
        return response.data.data;
    }

    static async triggerBackup(): Promise<BackupRecord> {
        const response = await api.post('/backups/trigger');
        return response.data.data;
    }

    static async deleteBackup(id: string): Promise<void> {
        await api.delete(`/backups/${id}`);
    }

    static getDownloadUrl(id: string): string {
        return `/backups/${id}/download`;
    }

    static async getComplianceStats(): Promise<ComplianceStats> {
        const response = await api.get('/backups/compliance');
        return response.data.data;
    }
}
