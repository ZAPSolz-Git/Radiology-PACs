import axios from '@/lib/axios';

export class ReportService {
    /**
     * Download report in specified format
     * @param caseId - The case ID
     * @param format - 'docx' or 'pdf'
     */
    static async downloadReport(caseId: string, format: 'docx' | 'pdf' = 'docx', noBanner: boolean = false, patientName?: string): Promise<void> {
        try {
            const response = await axios.get(`/reports/${caseId}/download`, {
                params: { format, ...(noBanner && { noBanner: 'true' }) },
                responseType: 'blob',
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Determine filename: Priority 1: Passed patientName, Priority 2: Header, Priority 3: Default
            let filename = `report.${format}`;
            const contentDisposition = response.headers['content-disposition'];

            if (patientName) {
                filename = `${patientName.trim().replace(/\s+/g, '_')}.${format}`;
            } else if (contentDisposition) {
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
        } catch (error: any) {
            console.error('Error downloading report:', error);
            throw new Error(error.response?.data?.message || 'Failed to download report');
        }
    }
}
