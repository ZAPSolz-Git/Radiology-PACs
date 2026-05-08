import { useEffect, useState } from 'react';
import axios from '@/lib/axios';

export interface TimelineEntry {
    _id: string;
    action: string;
    status: string;
    user: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    userName: string;
    role: string;
    timestamp: string;
    details?: string;
    metadata?: Record<string, any>;
}

export interface TimelineData {
    caseId: string;
    patientName: string;
    patientId: string;
    timeline: TimelineEntry[];
}

export function useCaseTimeline(caseId: string | null) {
    const [timeline, setTimeline] = useState<TimelineData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!caseId) {
            setTimeline(null);
            return;
        }

        const fetchTimeline = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/cases/${caseId}/timeline`);
                setTimeline(response.data.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load timeline');
                console.error('Error fetching timeline:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();

        // Listen for real-time updates via custom event dispatched by useSocket
        const handleRemoteUpdate = (event: any) => {
            if (event.detail === caseId) {
                console.log('[useCaseTimeline] Refreshing due to socket update');
                fetchTimeline();
            }
        };

        window.addEventListener('case_updated', handleRemoteUpdate);

        return () => {
            window.removeEventListener('case_updated', handleRemoteUpdate);
        };
    }, [caseId]);

    return { timeline, loading, error };
}
