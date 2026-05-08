import { useState, useEffect, useMemo } from 'react';
import { RadiologistCase, RadiologistCaseStatus } from '../types';
import { RadiologistService } from '../services/RadiologistService';
import { PerformanceService, PerformanceStats } from '../services/PerformanceService';
import { toast } from 'sonner';

export function useWorklist() {
    const [cases, setCases] = useState<RadiologistCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterModality, setFilterModality] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterUrgency, setFilterUrgency] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);

    useEffect(() => {
        loadCases();
    }, []);

    const loadCases = async () => {
        setIsLoading(true);
        try {
            const [casesData, statsData] = await Promise.all([
                RadiologistService.fetchWorklist(),
                PerformanceService.getStats().catch(() => null)
            ]);
            setCases(casesData);
            if (statsData) setPerformanceStats(statsData);
        } catch (err) {
            toast.error("Failed to sync worklist");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await RadiologistService.acceptCase(id);
            setCases(prev => prev.map(c => c._id === id ? { ...c, status: 'In_Progress' as RadiologistCaseStatus } : c));
            toast.success("Case accepted. Initializing diagnostic tools...");
        } catch (err) {
            toast.error("Failed to accept case");
        }
    };

    const handleReject = async (id: string, reasonId: string, comment: string) => {
        try {
            const updatedCase = await RadiologistService.rejectCase(id, { reason: reasonId, comment });
            setCases(prev => prev.map(c => c._id === id ? { ...c, status: 'Rejected' as RadiologistCaseStatus, rejectionReason: updatedCase.rejectionReason } : c));
            toast.error(`Case rejected. Notification sent to Technician.`);
        } catch (err) {
            toast.error("Failed to reject case");
        }
    };

    const filteredCases = useMemo(() => {
        return cases.filter(c => {
            const matchesSearch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.patientId.includes(searchQuery) ||
                (c.accessionNumber && c.accessionNumber.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesModality = filterModality === 'all' || c.modality === filterModality;

            // Map frontend status values to backend status values
            let matchesStatus = true;
            if (filterStatus !== 'all') {
                if (filterStatus === 'Pending') {
                    matchesStatus = c.status === 'Assigned';
                } else if (filterStatus === 'Accepted') {
                    matchesStatus = c.status === 'In_Progress' || c.status === 'Rep_Correction';
                } else if (filterStatus === 'Reported') {
                    matchesStatus = c.status === 'QA_Audit' || c.status === 'Finalized';
                } else {
                    matchesStatus = c.status === filterStatus;
                }
            }

            const matchesUrgency = filterUrgency === 'all' || c.urgency === filterUrgency;
            return matchesSearch && matchesModality && matchesStatus && matchesUrgency;
        }).sort((a, b) => {
            // 1. Emergency cases always first
            if (a.isEmergency && !b.isEmergency) return -1;
            if (!a.isEmergency && b.isEmergency) return 1;

            // 2. Then by TAT remaining
            return (a.tatRemainingSeconds || 0) - (b.tatRemainingSeconds || 0);
        });
    }, [cases, searchQuery, filterModality, filterStatus, filterUrgency]);

    const stats = useMemo(() => {
        return {
            total: cases.filter(c => c.status !== 'Finalized').length, // Total Active
            pending: cases.filter(c => c.status === 'Assigned').length,
            stat: cases.filter(c => c.urgency === 'STAT').length,
            finalizedToday: performanceStats?.overview.totalCases || 0,
            avgTAT: performanceStats ? `${performanceStats.overview.avgTAT}m` : '--'
        };
    }, [cases, performanceStats]);

    return {
        cases: filteredCases,
        isLoading,
        stats,
        searchQuery,
        filterModality,
        filterStatus,
        filterUrgency,
        setSearchQuery,
        setFilterModality,
        setFilterStatus,
        setFilterUrgency,
        handleAccept,
        handleReject,
        refresh: loadCases
    };
}
