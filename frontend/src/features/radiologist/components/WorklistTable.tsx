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
import { useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
                <div className="hidden md:block overflow-x-auto rounded-3xl border border-border/40 shadow-sm bg-card/40 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        {/* ... (existing table header) */}
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/60">
                                <th className="w-[3px] p-0" />
                                <th className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        <Activity className="w-3 h-3 opacity-60" />
                                        Priority
                                    </span>
                                </th>
                                <th className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        <User className="w-3 h-3 opacity-60" />
                                        Patient
                                    </span>
                                </th>
                                <th className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        <Microscope className="w-3 h-3 opacity-60" />
                                        Study Details
                                    </span>
                                </th>
                                <th className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        <BadgeCheck className="w-3 h-3 opacity-60" />
                                        Status
                                    </span>
                                </th>
                                <th className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        <Hourglass className="w-3 h-3 opacity-60" />
                                        TAT
                                    </span>
                                </th>
                                <th className="px-4 py-3 text-right">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border/50">
                            {cases.map((c) => {
                                const isEmergency = c.isEmergency || c.urgency === 'STAT';
                                const iconBtn = "h-7 w-7 rounded-[5px] border border-border/40 bg-transparent hover:bg-muted/60 hover:border-border/70 hover:-translate-y-px transition-all duration-150";

                                return (
                                    <tr
                                        key={c._id}
                                        className={cn(
                                            "group relative hover:bg-muted/20 transition-colors",
                                            isEmergency ? "row-stat" : "row-routine"
                                        )}
                                    >
                                        <td className="p-0 w-[3px] relative z-10" />
                                        <td className="px-4 py-3.5 relative z-10">
                                            {getUrgencyIndicator(c.urgency, c.isEmergency)}
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            <div className="space-y-0.5">
                                                <div
                                                    className="font-semibold text-[13px] text-foreground flex items-center gap-1.5 leading-tight cursor-pointer hover:text-indigo-600 transition-colors"
                                                    onClick={() => onView(c._id)}
                                                >
                                                    <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
                                                    {c.patientName}
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px] px-1.5 h-4 bg-primary/5 border-primary/20 text-primary font-bold uppercase ml-1"
                                                    >
                                                        {c.modality}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.07em] font-medium pl-5">
                                                    <span>{c.age}Y</span>
                                                    <span className="opacity-30">·</span>
                                                    <span>{c.gender}</span>
                                                    <span className="opacity-30">·</span>
                                                    <span>MRN: {c.patientId}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            <div className="min-w-[200px] space-y-1">
                                                <div className="text-[11px] text-foreground/90 font-medium truncate max-w-[250px]" title={c.studyDescription}>
                                                    {c.studyDescription}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {c.accessionNumber && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border border-border/50 bg-muted/30 text-[9px] text-muted-foreground font-medium uppercase tracking-[0.07em]">
                                                            <Hash className="w-2.5 h-2.5" />
                                                            {c.accessionNumber.slice(-8)}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tabular-nums font-medium">
                                                        <CalendarDays className="w-3 h-3 opacity-50 flex-shrink-0" />
                                                        {format(new Date(c.studyDate), 'MMM dd, HH:mm')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            <div className="flex flex-col gap-1">
                                                {getStatusBadge(c.status)}
                                                {['QA_Review', 'QA_Audit', 'Finalized'].includes(c.status) && (
                                                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-600 tracking-tight ml-1 animate-in fade-in slide-in-from-left-1">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        Submitted
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {c.status !== 'Rejected' && (
                                                    <div className="flex items-center transition-all duration-200">
                                                        <Button variant="outline" size="icon" className={cn(iconBtn, "hover:text-foreground")} onClick={() => onOpenDetails(c._id)} title="View Details">
                                                            <ClipboardList className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="outline" size="icon" className={cn(iconBtn, "hover:border-indigo-400/40 hover:text-indigo-500 hover:bg-indigo-500/6")} onClick={() => handleExport(c)} title="Export study">
                                                            <Download className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="outline" size="icon" className={cn(iconBtn, "hover:text-foreground")} onClick={() => onViewStudy(c._id)} title="View DICOM">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className={cn(
                                                                iconBtn,
                                                                chattingCaseId === c._id
                                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-600"
                                                                    : "hover:border-indigo-400/40 hover:text-indigo-500 hover:bg-indigo-500/6"
                                                            )}
                                                            onClick={() => setChattingCaseId(chattingCaseId === c._id ? null : c._id)}
                                                            title="Messenger"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="outline" size="icon" className={cn(iconBtn, "hover:text-foreground")} onClick={() => onOpenTimeline(c._id)} title="Timeline">
                                                            <History className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <div className="w-px h-3.5 bg-border/60 mx-1" />
                                                    </div>
                                                )}

                                                {c.status === 'Assigned' && (
                                                    <div className="flex gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onAccept(c._id)}
                                                            className="h-7 px-2.5 rounded-[5px] border border-emerald-500/30 bg-emerald-500/6 text-emerald-700 hover:bg-emerald-500/12 text-[10px] font-semibold uppercase tracking-[0.07em] transition-all"
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onReject(c._id)}
                                                            className="h-7 px-2.5 rounded-[5px] border border-red-500/30 bg-red-500/6 text-red-700 hover:bg-red-500/12 text-[10px] font-semibold uppercase tracking-[0.07em] transition-all"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}

                                                {c.status === 'Rejected' && (
                                                    <div className="text-[10px] font-bold uppercase text-red-600 tracking-wider bg-red-500/8 px-2 py-1 rounded border border-red-400/25">
                                                        Rejected
                                                    </div>
                                                )}

                                                {c.status !== 'Assigned' && c.status !== 'Rejected' && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={c.status === 'Finalized'}
                                                        onClick={() => onView(c._id)}
                                                        className="h-7.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-none text-[10px] font-bold uppercase tracking-wider gap-1.5 transition-all ml-1"
                                                    >
                                                        <Activity className="w-3 h-3" />
                                                        {c.status === 'In_Progress' && !c.report?.jsonContent ? 'Start Reporting' :
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
                </div>

                {/* Mobile Card Grid */}
                <div className="md:hidden divide-y divide-border/40">
                    {cases.map((c) => {
                        const isEmergency = c.isEmergency || c.urgency === 'STAT';
                        return (
                            <div key={c._id} className={cn(
                                "p-4 space-y-4 relative",
                                isEmergency ? "bg-red-500/[0.02]" : "bg-card"
                            )}>
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1",
                                    isEmergency ? "bg-red-500" : "bg-emerald-500/40"
                                )} />

                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">{c.patientName}</h3>
                                            <Badge variant="outline" className="text-[9px] font-black h-4 bg-muted/50 border-border/50">{c.modality}</Badge>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                                            MRN: {c.patientId} · {c.age}Y · {c.gender}
                                        </div>
                                    </div>
                                    {getUrgencyIndicator(c.urgency, c.isEmergency)}
                                </div>

                                <div className="space-y-2 py-1 border-y border-border/40">
                                    <div className="text-[11px] font-medium text-foreground/80 leading-relaxed uppercase tracking-tight">
                                        {c.studyDescription}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 tabular-nums uppercase font-bold tracking-widest">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays className="w-3 h-3" />
                                            {format(new Date(c.studyDate), 'MMM dd, HH:mm')}
                                        </div>
                                        {c.accessionNumber && (
                                            <div className="flex items-center gap-1">
                                                <Hash className="w-3 h-3" />
                                                {c.accessionNumber.slice(-8)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col gap-2">
                                        {getStatusBadge(c.status)}
                                        {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                                        {c.status !== 'Rejected' && (
                                            <>
                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onOpenDetails(c._id)}><ClipboardList className="w-4 h-4" /></Button>
                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleExport(c)}><Download className="w-4 h-4" /></Button>
                                                <Button variant="outline" size="icon" className={cn("h-8 w-8 rounded-lg", chattingCaseId === c._id && "bg-indigo-600 text-white")} onClick={() => setChattingCaseId(chattingCaseId === c._id ? null : c._id)}><MessageSquare className="w-4 h-4" /></Button>
                                            </>
                                        )}
                                        {c.status === 'Assigned' ? (
                                            <div className="flex gap-1">
                                                <Button size="sm" onClick={() => onAccept(c._id)} className="h-8 px-3 rounded-lg bg-emerald-600 text-white font-bold text-[10px] uppercase">Accept</Button>
                                                <Button size="sm" variant="outline" onClick={() => onReject(c._id)} className="h-8 px-3 rounded-lg border-red-500 text-red-500 font-bold text-[10px] uppercase">Reject</Button>
                                            </div>
                                        ) : (
                                            c.status !== 'Rejected' && (
                                                <Button size="sm" onClick={() => onView(c._id)} disabled={c.status === 'Finalized'} className="h-8 px-4 rounded-lg bg-indigo-600 text-white font-bold text-[10px] uppercase">
                                                    {c.status === 'In_Progress' ? 'Resume' : 'Review'}
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
