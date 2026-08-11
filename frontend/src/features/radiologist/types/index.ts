export type RadiologistCaseStatus = 'Assigned' | 'In_Progress' | 'Rep_Correction' | 'QA_Audit' | 'QA_Review' | 'Finalized' | 'Rejected';
export type CaseUrgency = 'Routine' | 'STAT';
export type Modality = 'CT' | 'MRI' | 'X-Ray' | 'US';

export interface RadiologistCase {
    _id: string;
    patientId: string;
    patientName: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    modality: Modality;
    studyDate: string;
    accessionNumber: string;
    studyInstanceUID: string; // DICOM Study Instance UID for viewer
    status: RadiologistCaseStatus;
    urgency: CaseUrgency;
    isEmergency?: boolean;
    tatRemainingSeconds: number;
    studyDescription: string;
    technicianNotes?: string;
    clinicalHistory?: string;
    attachments?: Array<{
        name: string;
        url: string;
        path: string;
        fileType: string;
        category: string;
        uploadedAt: string;
    }>;
    rejectionReason?: string;
    timeSpentSeconds: number; // For productivity tracking
    report?: {
        author?: string;
        findings?: string;
        impression?: string;
        docxUrl?: string;
        docxPath?: string;
        jsonContent?: string;
        banner?: string;
        status?: string;
        version?: number;
    };
    uploadedBy?: {
        _id: string;
        name: string;
    };
    qaVerification?: {
        verifiedBy: { _id: string; name: string };
        verifiedAt: string;
    };
    assignedRadiologist?: {
        _id: string;
        name: string;
    };
}

export interface RejectionReason {
    id: string;
    label: string;
    category: 'Technically-Unsound' | 'Patient-Data-Error' | 'Clinical-Mismatch';
}

export interface ReportTemplate {
    id: string;
    title: string;
    modality: Modality;
    bodyPart: string;
    content: string; // HTML or structured JSON
    isCustom?: boolean;
}

export interface ReportMacro {
    key: string; // e.g. ".nad"
    expansion: string;
}

export interface CaseReport {
    caseId: string;
    findings: string;
    impression: string;
    isDraft: boolean;
    digitallySigned: boolean;
    signedBy?: string;
    signedAt?: string;
}
