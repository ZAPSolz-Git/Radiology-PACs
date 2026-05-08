export type PriceModality = 'CT' | 'MRI' | 'X-Ray' | 'US' | 'PET-CT' | 'MG' | 'BMD' | 'OTHERS';

export interface PricingRule {
    _id?: string;
    modality: PriceModality;
    studyType: string;
    basePrice: number;
    emergencySurcharge: number;
    nightHolidaySurcharge: number;
    targetHospitalId?: string | null;
    targetRadiologistId?: string | null;
    isActive?: boolean;
}

export interface Invoice {
    _id: string;
    invoiceId: string;
    technician: any; // Populated User
    institutionName: string;
    amount: number;
    status: 'paid' | 'pending' | 'partial';
    dueDate: string;
    createdAt: string;
    period: {
        month: number;
        year: number;
    };
    caseCount: number;
    cases: any[]; // Populated Case IDs
}

export interface Payout {
    _id: string;
    payoutId: string;
    radiologist: { _id: string; name: string; email: string };
    amount: number;
    status: 'Pending' | 'Paid';
    period: string;
    caseCount: number;
    paidAt?: string;
    attachments?: {
        url: string;
        name: string;
        uploadedAt: string;
    }[];
    attachmentUrl?: string; // Legacy support
    createdAt: string;
}

export interface FinancialStats {
    dailyRevenue: number;
    monthlyRevenue: number;
    modalityIncome: Record<PriceModality, number>;
    doctorCosts: number;
    profitMargin: number;
}
