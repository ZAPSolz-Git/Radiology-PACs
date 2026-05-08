export type LockStatus = 'locked' | 'unlocked' | 'restricted';

export interface DataAccessRule {
    id: string;
    role: string;
    resource: string;
    permission: 'view' | 'edit' | 'delete' | 'export';
    status: 'active' | 'inactive';
}

export interface BackupJob {
    id: string;
    timestamp: string;
    size: string; // e.g. "1.2 GB"
    status: 'success' | 'failed' | 'in-progress';
    type: 'automatic' | 'manual';
    retention: string; // e.g. "90 days"
}

export interface ComplianceStats {
    totalLockedCases: number;
    accessViolations: number;
    lastBackup: string;
    complianceScore: number; // 0-100
}
