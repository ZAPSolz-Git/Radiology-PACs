export type Modality = 'CT' | 'MRI' | 'DX' | 'US' | 'PET' | 'MG' | 'CR' | 'OT';

export type QACaseStatus = 'New' | 'In_Progress' | 'Pending-Technician' | 'Approved' | 'Rejected' | 'Assigned' | 'QA_Review' | 'Rep_Correction' | 'QA_Audit' | 'Finalized';

export interface Banner {
    _id: string;
    title: string;
    imageUrl: string;
    description?: string;
    isActive: boolean;
}

export interface QACase {
    _id: string;
    patientId: string;
    patientName: string;
    age: number;
    gender: string;
    modality: Modality;
    studyDate: string;
    accessionNumber: string;
    status: QACaseStatus;
    studyInstanceUID?: string;
    sourceHospital: string;
    receivedAt: string;
    description: string;
    technicianId: string;
    uploadedBy?: {
        _id: string;
        name: string;
    };
    qaVerification?: {
        verifiedBy: { _id: string; name: string };
        verifiedAt: string;
    };
    imageCount: number;
    seriesCount: number;
    clinicalHistory?: string;
    urgency: 'STAT' | 'Routine';
    isEmergency?: boolean;
    tatRemainingSeconds?: number;
    assignedRadiologist?: {
        _id: string;
        name: string;
    };
    assignedPartner?: {
        _id: string;
        partnerName: string;
    };
    report?: {
        findings: string;
        impression: string;
        author?: string | { _id: string; name: string };
        status: string;
        submittedAt?: string;
        version?: number;
        docxUrl?: string;
        docxPath?: string;
        jsonContent?: string;
        banner?: string;
    };
    integrityResults?: {
        score: number;
        status: 'Pass' | 'Warning' | 'Fail' | 'Pending';
        lastRun?: string;
        findings: Array<{
            level: 'Metadata' | 'Structural' | 'Clinical' | 'AI';
            type: 'Error' | 'Warning' | 'Info';
            message: string;
            seriesInstanceUID?: string;
            details?: any;
        }>;
    };
}

export interface QANotification {
    id: string;
    caseId: string;
    message: string;
    timestamp: string;
    type: 'New-Study' | 'Message' | 'Alert';
    read: boolean;
}

export interface MetadataIndex {
    patientDetails: {
        name: string;
        id: string;
        dob: string;
        gender: string;
    };
    studyDetails: {
        modality: Modality;
        description: string;
        accession: string;
        date: string;
    };
    series: Array<{
        number: string;
        description: string;
        instances: number;
    }>;
}

export interface RadiologistDetails {
    _id: string;
    name: string;
    email: string;
    specialties: string[];
    modalities: Modality[];
    online: boolean;
    lastActive?: string;
    currentWorkload: number;
    avgTAT: string;
    rating: string | number;
    phoneMasked?: string;
}

export interface PartnerDetails {
    _id: string;
    partnerName: string;
    keyPrefix: string;
    scopes: string[];
    isActive: boolean;
    rateLimit?: number;
    createdAt: string;
    currentWorkload: number;
    online: boolean;
}

export interface AssignmentNotification {
    caseId: string;
    doctorId: string;
    method: 'WhatsApp' | 'SMS' | 'In-App';
    timestamp: string;
}

export interface ChatMessage {
    id?: string;
    _id?: string;
    caseId: string;
    senderId: string | { _id: string; name: string };
    senderName: string;
    senderRole?: string;
    role?: string;
    text: string;
    timestamp?: string;
    createdAt?: string;
    chatType?: 'technician' | 'radiologist' | 'qa' | 'group';
    deliveredTo?: Array<{ userId: string; timestamp: string }>;
    readBy?: Array<{ userId: string; userName?: string; timestamp: string }>;
    deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface UserPresence {
    userId: string;
    userName: string;
    userRole: string;
    isOnline: boolean;
    lastSeen?: string;
}

export interface UnreadInfo {
    caseId: string;
    count: number;
    lastReadMessageId?: string;
}

export interface ReportDraft {
    caseId: string;
    findings: string;
    impression: string;
    doctorId: string;
    doctorName?: string;
    submittedAt: string;
    status: string;
    version?: number;
    docxUrl?: string;
    docxPath?: string;
}
