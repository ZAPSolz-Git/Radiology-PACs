import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: timeline, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['case-timeline', caseId],
        queryFn: async () => {
            const response = await axios.get(`/cases/${caseId}/timeline`);
            return response.data.data as TimelineData;
        },
        enabled: !!caseId,
        staleTime: 1000 * 60 * 2, // 2 minutes — timeline is append-only, doesn't need to be live
    });

    // D4: Listen for real-time case_updated events but DEBOUNCE invalidation
    // so rapid socket events (10 users active) cause at most 1 refetch per 2s
    useEffect(() => {
        if (!caseId) return;

        const handleRemoteUpdate = (event: CustomEvent) => {
            if (event.detail !== caseId) return;

            // Cancel any pending debounce and restart the timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['case-timeline', caseId] });
            }, 2000); // wait 2s for burst to settle before refetching
        };

        window.addEventListener('case_updated', handleRemoteUpdate as EventListener);

        return () => {
            window.removeEventListener('case_updated', handleRemoteUpdate as EventListener);
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [caseId, queryClient]);

    const error = queryError
        ? (queryError as any)?.response?.data?.message || 'Failed to load timeline'
        : null;

    return { timeline: timeline ?? null, loading, error };
}
