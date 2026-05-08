export type ReportStatus = 'Uploaded' | 'QA_Pending' | 'QA_Review' | 'Assigned' | 'In_Progress' | 'Rep_Correction' | 'QA_Audit' | 'Finalized' | 'Rejected' | 'Incomplete';
export type CasePriority = 'Routine' | 'STAT';
export type Modality = 'CT' | 'MRI' | 'X-Ray' | 'US';

export interface Patient {
    id?: string;
    patientId: string;
    name: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    referringDoctor?: string;
}

export interface Case {
    _id: string;
    id: string; // Map from _id if needed
    studyInstanceUID?: string;
    patientId: string;
    patient: Patient;
    patientName: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    modality: Modality;
    studyDate: string;
    studyDirectory?: string;
    bodyPart?: string;
    referringDoctor?: string;
    institution?: string;
    accessionNumber?: string;
    // accessionNumber is already defined above
    dicomFiles: Array<{
        name: string;
        path: string;
        size: number;
        seriesInstanceUID?: string;
        sopInstanceUID?: string;
        sopClassUID?: string;
        instanceNumber?: number;
        rows?: number;
        columns?: number;
        pixelSpacing?: number[];
        sliceThickness?: number;
        imagePositionPatient?: number[];
        imageOrientationPatient?: number[];
        frameOfReferenceUID?: string;
        bitsAllocated?: number;
        bitsStored?: number;
        highBit?: number;
        pixelRepresentation?: number;
        samplesPerPixel?: number;
        photometricInterpretation?: string;
        windowCenter?: number;
        windowWidth?: number;
        rescaleIntercept?: number;
        rescaleSlope?: number;
        transferSyntax?: string;
    }>;
    status: ReportStatus;
    urgency: CasePriority;
    isEmergency?: boolean;
    priority: 'routine' | 'urgent' | 'emergency'; // Legacy UI fallback
    rejectionReason?: string;
    clinicalHistory?: string;
    assignedRadiologist?: {
        _id: string;
        name: string;
        email: string;
    };
    uploadedBy: {
        _id: string;
        name: string;
    };
    attachments?: Array<{
        name: string;
        url: string;
        path: string;
        fileType: string;
        category: string;
        uploadedAt: string;
    }>;
    tatRemainingSeconds: number;
    hasNewChat: boolean;
    createdAt: string;
    checklist?: SubmissionChecklist;
    source?: 'FOLDER_UPLOAD' | 'PACS_IMPORT' | 'PACS_PUSH';
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
    qaDetails?: {
        _id: string;
        name: string;
    };
    integrityResults?: {
        score: number;
        status: 'Pass' | 'Warning' | 'Fail' | 'Pending';
        lastRun: string;
        metadataHealth: number;
        structuralHealth: number;
        findings: Array<{
            level: 'Metadata' | 'Structural' | 'Clinical' | 'AI';
            type: 'Error' | 'Warning' | 'Info';
            message: string;
            seriesInstanceUID?: string;
            details?: any;
        }>;
    };
}

export interface HistoryTemplate {
    id: string;
    title: string;
    content: string;
    modality?: Modality | 'General';
}

export interface SubmissionChecklist {
    detailsVerified: boolean;
    correctStudy: boolean;
    historyAdded: boolean;
    allSeriesUploaded: boolean;
}
