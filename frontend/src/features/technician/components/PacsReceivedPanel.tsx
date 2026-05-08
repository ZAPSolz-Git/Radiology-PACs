import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Inbox,
    Loader2,
    RefreshCw,
    Radio,
    Wifi,
    WifiOff,
    FileScan,
    ClipboardEdit,
    Building2,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaseService } from '../services/CaseService';
import { Case } from '../types/technician';
import { useTasks } from '@/contexts/TaskContext';
import { toast } from 'sonner';

interface PacsReceivedPanelProps {
    /** Called when the tech clicks "Enrich & Submit" on a received case */
    onEnrich: (caseData: Case) => void;
}

interface ScpStatus {
    isRunning: boolean;
    port: string;
    activeStudies: Array<{
        studyInstanceUID: string;
        receivedFiles: number;
        callingAeTitle?: string;
        userId?: string;
    }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    Uploaded:      { label: 'Ready',       color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    QA_Pending:    { label: 'QA Pending',  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    QA_Review:     { label: 'In Review',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    Assigned:      { label: 'Assigned',    color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
    In_Progress:   { label: 'In Progress', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
    Finalized:     { label: 'Finalized',   color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    Rejected:      { label: 'Rejected',    color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    Incomplete:    { label: 'Incomplete',  color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

function formatRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function PacsReceivedPanel({ onEnrich }: PacsReceivedPanelProps) {
    const { activeTasks } = useTasks();

    const [receivedCases, setReceivedCases] = useState<Case[]>([]);
    const [scpStatus, setScpStatus] = useState<ScpStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    /** Live tasks of type PACS_PUSH currently in-progress */
    const liveIncoming = activeTasks.filter(
        (t) => t.type === 'PACS_PUSH' && t.status === 'RUNNING'
    );

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);
        try {
            const [cases, status] = await Promise.all([
                CaseService.getPacsReceived(),
                CaseService.getScpStatus(),
            ]);
            setReceivedCases(cases);
            setScpStatus(status);
        } catch {
            toast.error('Failed to load PACS Received data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="flex flex-col gap-5 h-full animate-in fade-in slide-in-from-bottom-2">

            {/* ── SCP Listener Status Bar ─────────────────────────────────── */}
            <div className={cn(
                'flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all',
                scpStatus?.isRunning
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        scpStatus?.isRunning ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}>
                        {scpStatus?.isRunning
                            ? <Wifi className="w-4 h-4 text-green-600" />
                            : <WifiOff className="w-4 h-4 text-red-500" />}
                    </div>
                    <div>
                        <div className={cn(
                            'text-[10px] font-black uppercase tracking-widest',
                            scpStatus?.isRunning ? 'text-green-700' : 'text-red-600'
                        )}>
                            DICOM SCP Listener — {scpStatus?.isRunning ? 'Online' : 'Offline'}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-bold mt-0.5">
                            {scpStatus
                                ? `Listening on port ${scpStatus.port}`
                                : 'Checking status...'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {liveIncoming.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                                {liveIncoming.length} Receiving
                            </span>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => fetchData(true)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* ── Live Incoming Feed ──────────────────────────────────────── */}
            {liveIncoming.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <Radio className="w-3 h-3 text-amber-500 animate-pulse" />
                        Live Incoming Transmissions
                    </div>
                    <div className="space-y-2">
                        {liveIncoming.map((task) => {
                            const pct = task.total > 0 ? Math.round((task.progress / task.total) * 100) : 0;
                            return (
                                <div
                                    key={task.taskId}
                                    className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 sm:p-4 animate-in fade-in"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-tight text-amber-700">
                                                {task.metadata?.studyInstanceUID?.slice(0, 20)}…
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold text-amber-600">
                                            {task.progress} files received
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-amber-500/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                            style={{ width: task.total > 0 ? `${pct}%` : '40%' }}
                                        />
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-medium mt-1.5">{task.message}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Recently Received Cases ─────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                    <Inbox className="w-3 h-3" />
                    Auto-Received Cases ({receivedCases.length})
                </div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                        <p className="text-[10px] uppercase font-black text-muted-foreground/50 tracking-widest">
                            Loading received cases...
                        </p>
                    </div>
                ) : receivedCases.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/50 rounded-3xl p-8 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                            <Inbox className="w-7 h-7 text-muted-foreground/30" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                                No Cases Received Yet
                            </h3>
                            <p className="text-[9px] text-muted-foreground/40 mt-1 font-medium">
                                Cases pushed directly to the SCP listener will appear here automatically.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5">
                        {receivedCases.map((c) => {
                            const statusInfo = STATUS_LABELS[c.status] ?? { label: c.status, color: 'bg-muted text-muted-foreground border-border' };
                            const needsEnrichment = !c.clinicalHistory && c.status === 'Uploaded';

                            return (
                                <div
                                    key={c._id}
                                    className="group bg-background border border-border hover:border-primary/30 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left — Study Info */}
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center shrink-0">
                                                <FileScan className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black uppercase tracking-tight truncate max-w-[140px] sm:max-w-none">
                                                        {c.patientName}
                                                    </span>
                                                    {needsEnrichment && (
                                                        <div className="flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                                                            <AlertTriangle className="w-2.5 h-2.5" />
                                                            Needs Enrichment
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-bold text-indigo-500">{c.modality}</span>
                                                    <span className="text-[9px] text-muted-foreground font-medium">
                                                        {c.patientId}
                                                    </span>
                                                    {c.institution && (
                                                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-medium">
                                                            <Building2 className="w-2.5 h-2.5" />
                                                            {c.institution}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-medium">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatRelativeTime(c.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    <span className={cn(
                                                        'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                                                        statusInfo.color
                                                    )}>
                                                        {statusInfo.label}
                                                    </span>
                                                    <span className="text-[8px] text-muted-foreground font-bold">
                                                        {c.dicomFiles?.length ?? 0} files
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right — Enrich Action */}
                                        <Button
                                            size="sm"
                                            onClick={() => onEnrich(c)}
                                            className={cn(
                                                'shrink-0 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest px-3 transition-all',
                                                needsEnrichment
                                                    ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/20'
                                                    : 'bg-primary hover:bg-primary/90 shadow-md shadow-primary/20'
                                            )}
                                        >
                                            <ClipboardEdit className="w-3 h-3 mr-1" />
                                            Enrich
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
