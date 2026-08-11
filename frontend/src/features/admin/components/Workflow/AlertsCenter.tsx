import {
    AlertCircle,
    ShieldAlert,
    Zap,
    CheckCheck,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SystemAlert } from '../../types/workflow';
import { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { formatDistanceToNow } from 'date-fns';

export function AlertsCenter() {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const fetchAlerts = async () => {
        try {
            const data = await AdminService.getSystemAlerts();
            setAlerts(data);
        } catch (err) {
            console.error("Failed to fetch system alerts:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between mb-4">

                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest gap-2">
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark All Read
                    </Button>
                </div>

                <div className="space-y-3 min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Retrieving critical logs...</p>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] bg-muted/5 rounded-3xl border border-dashed border-border p-12 text-center">
                            <CheckCheck className="w-12 h-12 text-emerald-500/30 mb-4" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">All Systems Clear</h3>
                            <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[200px] font-medium leading-relaxed">No critical or high-severity events detected in the current audit window.</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={cn(
                                    "group relative p-5 rounded-2xl border transition-all duration-200",
                                    !alert.isRead ? "bg-indigo-50/30 border-indigo-100" : "bg-background border-border"
                                )}
                            >
                                {!alert.isRead && (
                                    <div className="absolute top-6 left-0 w-1 h-8 bg-indigo-600 rounded-r-full" />
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                            alert.severity === 'critical' ? "bg-red-100 text-red-600" :
                                                alert.severity === 'high' ? "bg-amber-100 text-amber-600" :
                                                    "bg-blue-100 text-blue-600"
                                        )}>
                                            {alert.type === 'sla_breach' ? <ShieldAlert className="w-5 h-5" /> :
                                                alert.type === 'emergency_upload' ? <Zap className="w-5 h-5" /> :
                                                    <AlertCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{alert.type.replace('_', ' ')}</span>
                                                <span className="text-[10px] text-muted-foreground">•</span>
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold leading-relaxed text-foreground">{alert.message}</p>

                                            {alert.resourceId && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <div className="px-2 py-0.5 rounded bg-muted text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border">
                                                        {alert.resourceType}: {alert.resourceId.substring(0, 8)}
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>


        </div>
    );
}
