import { useState, useEffect, useMemo } from 'react';
import { QACase, QANotification } from '../types';
import { QAReceptionService } from '../services/QAReceptionService';
import { toast } from 'sonner';

export function useReceptionQueue() {
    const [cases, setCases] = useState<QACase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<QANotification[]>([]);

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        setIsLoading(true);
        try {
            const data = await QAReceptionService.fetchReceptionQueue();
            setCases(data);

            // Simulate receiving a notification for the newest case
            if (data.length > 0) {
                const newest = data[0];
                const notif: QANotification = {
                    id: Math.random().toString(),
                    caseId: newest._id,
                    message: `New STAT Study received: ${newest.patientName} (${newest.modality})`,
                    timestamp: new Date().toISOString(),
                    type: 'New-Study',
                    read: false
                };
                setNotifications(prev => [notif, ...prev]);
                toast.info(notif.message, {
                    description: `Source: ${newest.sourceHospital}`,
                    duration: 5000,
                });
            }
        } catch (err) {
            toast.error("Failed to fetch reception queue");
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        return {
            total: cases.length,
            new: cases.filter(c => c.status === 'New').length,
            stat: cases.filter(c => c.urgency === 'STAT').length,
            unassigned: cases.filter(c => c.status !== 'Assigned').length
        };
    }, [cases]);

    return {
        cases,
        isLoading,
        notifications,
        stats,
        refresh: loadQueue
    };
}
