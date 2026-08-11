import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Eye,
    CheckCircle2,
    Clock,
    AlertCircle,
    ClipboardIcon,
    ClipboardList,
    History,
    MessageSquare,
    Activity,
    UserCircle2,
    BadgeCheck,
    Microscope,
    Hourglass,
    Zap,
    Download,
    CircleDot,
    CalendarDays,
    Hash,
    User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadiologistCase, RadiologistCaseStatus } from '../types';
import { ConfirmationModal } from '../../technician/components/ConfirmationModal';
import { useState, useEffect } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const PAGE_SIZE = 50;

interface WorklistTableProps {
    cases: RadiologistCase[];
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onView: (id: string) => void;
    onViewStudy: (id: string) => void;
    onOpenDetails: (id: string) => void;
    onOpenTimeline: (id: string) => void;
    chattingCaseId: string | null;
    setChattingCaseId: (id: string | null) => void;
}

export function WorklistTable({
    cases,
    onAccept,
    onReject,
    onView,
    onViewStudy,
    onOpenDetails,
    onOpenTimeline,
    chattingCaseId,
    setChattingCaseId
}: WorklistTableProps) {
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [cases]);

    const visibleCases = cases.slice(0, page * PAGE_SIZE);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'default' | 'destructive';
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { }
    });

    const handleExport = (c: RadiologistCase) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const url = `${baseUrl}/cases/${c._id}/export`;

        setConfirmModal({
            isOpen: true,
            title: `Export "${c.patientName}"?`,
            description: "A ZIP file containing all studies and reports will be prepared for download.",
            confirmLabel: "Export",
            onConfirm: () => {
                toast.info(`Preparing ZIP for "${c.patientName}"...`);
                fetch(url, { credentials: 'include' })
                    .then(res => {
                        if (!res.ok) throw new Error('Export failed');
                        return res.blob();
                    })
                    .then(blob => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        const safeName = c.patientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                        a.download = `${safeName}_${c.modality}.zip`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                        toast.success(`Downloaded "${c.patientName}" as ZIP`);
                    })
                    .catch(() => toast.error('Failed to export case'));
            }
        });
    };

    // ─── Status Badge ────────────────────────────────────────────────────────────
    const getStatusBadge = (status: RadiologistCaseStatus, reason?: string) => {
        const cfg: Record<string, { dot: string; label: string; cls: string }> = {
            Assigned: { dot: 'bg-blue-400', label: 'Assigned', cls: 'bg-blue-500/8 text-blue-700 border-blue-400/25 dark:text-blue-300' },
            In_Progress: { dot: 'bg-cyan-400 animate-pulse', label: 'In Progress', cls: 'bg-cyan-500/8 text-cyan-700 border-cyan-400/25 dark:text-cyan-300' },
            Rep_Correction: { dot: 'bg-orange-400', label: 'Correction', cls: 'bg-orange-500/8 text-orange-700 border-orange-400/25 dark:text-orange-300' },
            QA_Audit: { dot: 'bg-teal-400', label: 'QA Audit', cls: 'bg-teal-500/8 text-teal-700 border-teal-400/25 dark:text-teal-300' },
            QA_Review: { dot: 'bg-violet-400', label: 'QA Review', cls: 'bg-violet-500/8 text-violet-700 border-violet-400/25 dark:text-violet-300' },
            Finalized: { dot: 'bg-emerald-400', label: 'Finalized', cls: 'bg-emerald-500/8 text-emerald-700 border-emerald-400/25 dark:text-emerald-300' },
        };

        if (status === 'Rejected') {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-[0.07em] border cursor-help bg-red-500/8 text-red-700 border-red-400/25 dark:text-red-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block flex-shrink-0" />
                                Rejected
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-destructive text-destructive-foreground border-destructive/20 max-w-[200px]">
                            <div className="text-[10px] font-bold mb-1 uppercase tracking-widest">Rejection Reason</div>
                            <div className="text-xs">{reason || 'No reason provided'}</div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        const s = cfg[status];
        if (!s) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-[0.07em] border bg-muted/40 text-muted-foreground border-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block flex-shrink-0" />
                    {status}
                </span>
            );
        }

        return (
            <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-[0.07em] border',
                s.cls
            )}>
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block flex-shrink-0', s.dot)} />
                {s.label}
            </span>
        );
    };

    // ─── Urgency Indicator ───────────────────────────────────────────────────────
    const getUrgencyIndicator = (urgency: string, isEmergency?: boolean) => {
        if (isEmergency || urgency === 'STAT') {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                    <Zap className="w-3 h-3 fill-current animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{isEmergency ? 'EMERGENCY' : 'STAT'}</span>
                </div>
            );
        }
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] bg-emerald-500/8 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <CircleDot className="w-3 h-3 opacity-70" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Routine</span>
            </div>
        );
    };

    // ─── TAT Display ─────────────────────────────────────────────────────────────
    const formatTAT = (seconds: number | undefined, urgency: string, status: string) => {
        const totalSLA = urgency === 'STAT' ? 3600 : 86400;
        const displayTotal = urgency === 'STAT' ? "1h" : "24h";

        if (status === 'Finalized') {
            const takenSeconds = totalSLA - (seconds || 0);
            let displayTaken = "0m";
            if (takenSeconds > 0) {
                const tMins = Math.floor(takenSeconds / 60);
                const tHours = Math.floor(tMins / 60);
                const tDisplayMins = tMins % 60;
                displayTaken = tHours > 0 ? `${tHours}h ${tDisplayMins}m` : `${tDisplayMins}m`;
            } else {
                displayTaken = "< 1m";
            }

            return (
                <div className="flex flex-col gap-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-emerald-500/8 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 w-fit">
                        <CheckCircle2 className="w-3 h-3 opacity-80 flex-shrink-0" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">Completed</span>
                    </div>
                    <div className="text-[9px] font-medium text-muted-foreground/60 pl-0.5 tabular-nums">
                        {displayTaken} / {displayTotal}
                    </div>
                </div>
            );
        }

        if (seconds === undefined || isNaN(seconds) || seconds <= 0) {
            const breachedBySeconds = Math.abs(seconds || 0);
            const takenSeconds = totalSLA + breachedBySeconds;
            const tMins = Math.floor(takenSeconds / 60);
            const tHours = Math.floor(tMins / 60);
            const tDisplayMins = tMins % 60;
            const displayTaken = tHours > 0 ? `${tHours}h ${tDisplayMins}m` : `${tDisplayMins}m`;

            return (
                <div className="flex flex-col gap-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-red-500/8 border border-red-500/20 text-red-600 dark:text-red-400 animate-pulse w-fit">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em]">SLA Breach</span>
                    </div>
                    <div className="text-[9px] font-medium text-red-500/60 pl-0.5 tabular-nums">
                        {displayTaken} / {displayTotal}
                    </div>
                </div>
            );
        }

        const mins = Math.floor(seconds / 60);
        const hours = Math.floor(mins / 60);
        const displayMins = mins % 60;

        let colorCls = "bg-emerald-500/8 border-emerald-500/20 text-emerald-700 dark:text-emerald-400";
        if (seconds < 1800 || urgency === 'STAT') {
            colorCls = "bg-red-500/8 border-red-500/20 text-red-600 dark:text-red-400";
        } else if (seconds < 3600) {
            colorCls = "bg-amber-500/8 border-amber-500/20 text-amber-700 dark:text-amber-400";
        }

        return (
            <div className="flex flex-col gap-0.5">
                <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border tabular-nums w-fit", colorCls)}>
                    <Clock className="w-3 h-3 opacity-70 flex-shrink-0" />
                    <span className="text-[11px] font-semibold">{hours > 0 ? `${hours}h ` : ''}{displayMins}m</span>
                </div>
                <div className="text-[9px] font-medium text-muted-foreground/50 pl-0.5 transition-opacity duration-200">
                    of {displayTotal} SLA
                </div>
            </div>
        );
    };


    return (
        <div className="w-full rounded-xl border border-border/60 overflow-hidden shadow-sm bg-card relative mb-5">
            <style>{`
                @keyframes sweep {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(250%); }
                }
                .animate-sweep { animation: sweep 3s infinite linear; }

                /* Left accent bar for STAT rows */
                tr.row-stat { background: rgba(239,68,68,0.02); }
                tr.row-stat td:first-child::before {
                    content: '';
                    display: block;
                    width: 3px;
                    height: 100%;
                    background: #ef4444;
                    border-radius: 0 2px 2px 0;
                    position: absolute;
                    top: 0; left: 0;
                }
                tr.row-stat td:first-child { position: relative; }

                tr.row-routine td:first-child::before {
                    content: '';
                    display: block;
                    width: 3px;
                    height: 100%;
                    background: #10b981;
                    border-radius: 0 2px 2px 0;
                    position: absolute;
                    top: 0; left: 0;
                }
                tr.row-routine td:first-child { position: relative; }
            `}</style>

            <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-border/40 shadow-sm bg-card/40 backdrop-blur-sm custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/60">
                                <th className="w-[3px] p-0" />
                                <th className="px-4 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                        <Activity className="w-3 h-3 opacity-60" />
                                        Priority
                                    </span>
                                </th>
                                <th className="px-4 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                        <User className="w-3 h-3 opacity-60" />
                                        Patient
                                    </span>
                                </th>
                                <th className="px-4 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                        <Microscope className="w-3 h-3 opacity-60" />
                                        Study Details
                                    </span>
                                </th>
                                <th className="px-4 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                        <BadgeCheck className="w-3 h-3 opacity-60" />
                                        Status
                                    </span>
                                </th>
                                <th className="px-4 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                        <Hourglass className="w-3 h-3 opacity-60" />
                                        TAT
                                    </span>
                                </th>
                                <th className="px-4 py-4 text-right">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border/50">
                            {visibleCases.map((c) => {
                                const isEmergency = c.isEmergency || c.urgency === 'STAT';
                                const iconBtn = "h-8 w-8 rounded-xl border border-border/40 bg-transparent hover:bg-muted/60 hover:border-border/70 hover:-translate-y-px transition-all duration-150";

                                return (
                                    <tr
                                        key={c._id}
                                        className={cn(
                                            "group relative hover:bg-muted/10 transition-colors",
                                            isEmergency ? "row-stat" : "row-routine"
                                        )}
                                    >
                                        <td className="p-0 w-[3px] relative z-10" />
                                        <td className="px-4 py-4 relative z-10">
                                            <div className="scale-90 sm:scale-100 origin-left">
                                                {getUrgencyIndicator(c.urgency, c.isEmergency)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative z-10">
                                            <div className="space-y-1 min-w-[160px]">
                                                <div
                                                    className="font-bold text-[13px] text-foreground flex items-center gap-1.5 leading-tight cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => onView(c._id)}
                                                >
                                                    <UserCircle2 className="w-4 h-4 text-muted-foreground/70 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
                                                    <span className="truncate max-w-[120px] sm:max-w-none">{c.patientName}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[8px] px-1.5 h-4 bg-primary/5 border-primary/20 text-primary font-black uppercase ml-1 shrink-0"
                                                    >
                                                        {c.modality}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-[0.07em] font-bold pl-5 opacity-70">
                                                    <span>{c.age}Y</span>
                                                    <span className="opacity-30">·</span>
                                                    <span>{c.gender}</span>
                                                    <span className="opacity-30">·</span>
                                                    <span>{c.patientId}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative z-10">
                                            <div className="min-w-[180px] space-y-1.5">
                                                <div className="text-[11px] text-foreground/90 font-bold truncate max-w-[200px]" title={c.studyDescription}>
                                                    {c.studyDescription}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {c.accessionNumber && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 text-[9px] text-muted-foreground font-black uppercase tracking-tight">
                                                            <Hash className="w-2.5 h-2.5" />
                                                            {c.accessionNumber.slice(-8)}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground tabular-nums font-bold uppercase opacity-60">
                                                        <CalendarDays className="w-3 h-3 opacity-50 flex-shrink-0" />
                                                        {format(new Date(c.studyDate), 'MMM dd, HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative z-10">
                                            <div className="flex flex-col gap-1.5 min-w-[100px]">
                                                <div className="scale-90 sm:scale-100 origin-left">
                                                    {getStatusBadge(c.status)}
                                                </div>
                                                {['QA_Review', 'QA_Audit', 'Finalized'].includes(c.status) && (
                                                    <div className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600 tracking-tighter ml-1 opacity-80">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        Submitted
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative z-10">
                                            <div className="scale-90 sm:scale-100 origin-left">
                                                {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 relative z-10">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {c.status !== 'Rejected' && (
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="outline" size="icon" className={iconBtn} onClick={() => onOpenDetails(c._id)} title="View Details">
                                                            <ClipboardList className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="outline" size="icon" className={iconBtn} onClick={() => handleExport(c)} title="Export study">
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="outline" size="icon" className={iconBtn} onClick={() => onViewStudy(c._id)} title="View DICOM">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className={cn(
                                                                iconBtn,
                                                                chattingCaseId === c._id && "bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-600"
                                                            )}
                                                            onClick={() => setChattingCaseId(chattingCaseId === c._id ? null : c._id)}
                                                            title="Messenger"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="outline" size="icon" className={iconBtn} onClick={() => onOpenTimeline(c._id)} title="Timeline">
                                                            <History className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="h-4 w-px bg-border/40 mx-1" />

                                                {c.status === 'Assigned' && (
                                                    <div className="flex gap-1.5">
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => onAccept(c._id)}
                                                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onReject(c._id)}
                                                            className="h-8 px-3 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}

                                                {c.status !== 'Assigned' && c.status !== 'Rejected' && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={c.status === 'Finalized'}
                                                        onClick={() => onView(c._id)}
                                                        className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest gap-2 transition-all active:scale-95"
                                                    >
                                                        <Activity className="w-3.5 h-3.5" />
                                                        {c.status === 'In_Progress' && !c.report?.jsonContent ? 'Start' :
                                                            (c.status === 'In_Progress' || c.status === 'Rep_Correction' ? 'Resume' : 'Review')}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {cases.length > page * PAGE_SIZE && (
                        <div className="flex justify-center py-4">
                            <button
                                onClick={() => setPage(p => p + 1)}
                                className="px-6 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl border border-border bg-background hover:bg-muted/60 text-muted-foreground transition-all"
                            >
                                Load More — {cases.length - page * PAGE_SIZE} remaining
                            </button>
                        </div>
                    )}
                </div>


            </div>

            {/* ── Empty State ───────────────────────────────────────────────────── */}
            {cases.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 border-t border-border/50 animate-in fade-in duration-300">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center mb-4 opacity-50">
                        <ClipboardIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-foreground/70">Worklist Clear</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">No pending cases assigned to you at this moment.</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, isOpen: open }))}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
                onConfirm={confirmModal.onConfirm}
            />
        </div>
    );
}
