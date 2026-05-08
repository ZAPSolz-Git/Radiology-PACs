export interface CaseStats {
    pending: number;
    reportedToday: number;
    emergency: number;
    activeOperators: number;
    integrityWarnings: number;
}

export interface LiveUser {
    id: string;
    name: string;
    role: 'radiologist' | 'technician' | 'qa' | 'admin' | 'user';
    status: 'online' | 'busy' | 'offline' | 'active' | 'locked' | 'deactivated';
    lastActive: string;
    workload?: number;
}

export interface SLAMetrics {
    id: string;
    caseId: string;
    patientName: string;
    modality: string;
    priority: 'routine' | 'urgent' | 'emergency';
    uploadedAt: string;
    remainingTime: number; // in minutes
    status: 'on-track' | 'warning' | 'breached';
    workflowStatus: string;
    integrityScore: number;
    integrityStatus: string;
    assignedTo: string;
}

export interface SystemAlert {
    id: string;
    type: 'sla_breach' | 'emergency_upload' | 'system_error' | 'delayed_report';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    isRead: boolean;
    resourceType?: string;
    resourceId?: string;
}
