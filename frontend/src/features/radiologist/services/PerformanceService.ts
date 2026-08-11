import api from '@/lib/axios';

export interface PerformanceStats {
    overview: {
        totalCases: number;
        totalEarnings: number;
        avgTAT: number;
        completionRate: number;
    };
    modalityDistribution: { name: string; value: number }[];
    dailyActivity: { date: string; count: number }[];
    monthlyActivity: { month: string; count: number }[];
    recentEarnings: {
        id: string;
        date: string;
        patientName: string;
        modality: string;
        studyType: string;
        basePrice: number;
        surcharge: number;
        total: number;
    }[];
}

export const PerformanceService = {
    async getStats(): Promise<PerformanceStats> {
        const response = await api.get('/performance/stats');
        return response.data.data;
    }
};
