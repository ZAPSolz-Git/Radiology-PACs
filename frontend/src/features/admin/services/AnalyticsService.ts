import api from '@/lib/axios';

export interface RevenueAnalytics {
    overallStats: {
        netRevenue: number;
        doctorCost: number;
        profitMargin: number;
        avgStudyValue: number;
        totalCases: number;
    };
    trajectory: {
        label: string;
        year: number;
        income: number;
        cost: number;
    }[];
    modalityMix: {
        label: string;
        value: string; // percentage string e.g. "45.0"
        absoluteCount: number;
    }[];
    topInstitutions: {
        name: string;
        revenue: number;
        caseCount: number;
    }[];
    cashFlow: {
        receivables: { collected: number, pending: number },
        payables: { paid: number, pending: number }
    };
}

export class AnalyticsService {
    static async getRevenueAnalytics(startDate?: string, endDate?: string): Promise<RevenueAnalytics> {
        const response = await api.get('/analytics/revenue', { params: { startDate, endDate } });
        return response.data.data;
    }
}
