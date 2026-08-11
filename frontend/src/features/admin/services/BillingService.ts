import api from '@/lib/axios';

export interface PricingRule {
    _id?: string;
    modality: string;
    studyType: string;
    basePrice: number;
    emergencySurcharge: number;
    nightHolidaySurcharge: number;
    targetHospitalId?: string | null;
    targetRadiologistId?: string | null;
    isActive?: boolean;
}

export const BillingService = {
    async getTariffs(): Promise<PricingRule[]> {
        const response = await api.get('/billing/tariffs');
        return response.data.data;
    },

    async createTariff(data: PricingRule): Promise<PricingRule> {
        const response = await api.post('/billing/tariffs', data);
        return response.data.data;
    },

    async updateTariff(id: string, data: Partial<PricingRule>): Promise<PricingRule> {
        const response = await api.patch(`/billing/tariffs/${id}`, data);
        return response.data.data;
    },

    async deleteTariff(id: string): Promise<void> {
        await api.delete(`/billing/tariffs/${id}`);
    },

    async bulkCreate(tariffs: PricingRule[]): Promise<void> {
        await api.post('/billing/tariffs/bulk', { tariffs });
    },

    async simulateMatch(params: { modality: string; studyType: string; hospitalId?: string; radiologistId?: string; urgency: string }): Promise<any> {
        const response = await api.post('/billing/tariffs/test-match', params);
        return response.data.data;
    },

    // --- Invoice Management ---

    async getInvoices() {
        const response = await api.get('/billing/invoices');
        return response.data.data;
    },

    async getMyInvoices() {
        const response = await api.get('/billing/my-invoices');
        return response.data.data;
    },

    async generateInvoices(month: number, year: number) {
        const response = await api.post('/billing/invoices/generate', { month, year });
        return response.data.data;
    },

    async getInvoiceDetails(invoiceId: string) {
        const response = await api.get(`/billing/invoices/${invoiceId}/details`);
        return response.data.data;
    },

    async updateInvoiceStatus(id: string, status: string) {
        const response = await api.patch(`/billing/invoices/${id}/status`, { status });
        return response.data.data;
    },

    async downloadInvoice(id: string): Promise<void> {
        const response = await api.get(`/billing/invoices/${id}/download`, {
            responseType: 'blob'
        });

        // Create blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers['content-disposition'];
        let filename = `invoice_${id}.pdf`;

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();

        // Cleanup
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    // --- Payout Management ---

    async getPayouts() {
        const response = await api.get('/payouts');
        return response.data.data;
    },

    async getMyPayouts() {
        const response = await api.get('/payouts/my-payouts');
        return response.data.data;
    },

    async getUnbilledCases() {
        const response = await api.get('/payouts/unbilled');
        return response.data.data;
    },

    async generateSelectedPayout(radiologistId: string, caseIds: string[], periodLabel: string) {
        const response = await api.post('/payouts/generate-selected', {
            radiologistId,
            caseIds,
            periodLabel
        });
        return response.data.data;
    },

    async generatePayouts(month: number, year: number) {
        const response = await api.post('/payouts/generate', { month, year });
        return response.data.data;
    },

    async markPayoutAsPaid(payoutId: string, receiptFile?: File) {
        const formData = new FormData();
        if (receiptFile) {
            formData.append('receipt', receiptFile);
        }
        const response = await api.patch(`/payouts/${payoutId}/pay`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data.data;
    },

    async downloadPayoutInvoice(id: string): Promise<void> {
        const response = await api.get(`/payouts/${id}/invoice`, {
            responseType: 'blob'
        });

        // Create blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers['content-disposition'];
        let filename = `payout_invoice_${id}.pdf`;

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();

        // Cleanup
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
};
