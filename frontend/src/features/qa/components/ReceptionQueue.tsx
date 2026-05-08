import { useState, useMemo } from 'react';
import { QACase, QACaseStatus } from '../types';
import {
    Clock,
    Hospital,
    Activity,
    Layers,
    Pencil,
    History as HistoryIcon,
    FileDown,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MessageSquare,
    FileText,
    Inbox,
    ShieldCheck,
    Briefcase,
    FolderArchive,
    Zap,
    CircleDot,
    CalendarDays,
    Hash,
    FileDown as FileDownIcon,
    Wrench,
    LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmationModal } from '../../technician/components/ConfirmationModal';

interface ReceptionQueueProps {
    cases: QACase[];
    isLoading: boolean;
    chattingCaseId: string | null;
    setChattingCaseId: (id: string | null) => void;
    onViewStudy: (caseId: string) => void;
    onEditDetails: (caseId: string) => void;
    onTimeline: (caseId: string) => void;
    onDownloadReport: (caseId: string, format: 'pdf' | 'docx', noBanner?: boolean, patientName?: string) => void;
    onAccept?: (caseId: string) => void;
    onReject?: (caseId: string) => void;
    onResolve?: (caseId: string) => void;
    onReviewReport?: (caseId: string) => void;
    onAssign?: (caseId: string) => void;
}

export function ReceptionQueue({
    cases,
    isLoading,
    chattingCaseId,
    setChattingCaseId,
    onViewStudy,
    onEditDetails,
    onTimeline,
    onDownloadReport,
    onAccept,
    onReject,
    onResolve,
    onReviewReport,
    onAssign
}: ReceptionQueueProps) {
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
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

    const handleExport = (c: QACase) => {
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

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-28 bg-muted/20 animate-pulse rounded-2xl border border-border" />
                ))}
            </div>
        );
    }

    const filteredCases = cases.filter(c => {
        if (activeTab === 'active') {
            return !['Finalized', 'Rejected'].includes(c.status);
        }
        return ['Finalized', 'Rejected'].includes(c.status);
    });

    const activeCount = cases.filter(c => !['Finalized', 'Rejected'].includes(c.status)).length;
    const historyCount = cases.filter(c => ['Finalized', 'Rejected'].includes(c.status)).length;

    // ─── Status Badge ────────────────────────────────────────────────────────────
    const getStatusBadge = (status: QACaseStatus) => {
        const cfg: Record<string, { dot: string; label: string; cls: string }> = {
            New: { dot: 'bg-blue-400 animate-pulse', label: 'New Arrival', cls: 'bg-blue-500/8 text-blue-700 border-blue-400/25 dark:text-blue-300' },
            In_Progress: { dot: 'bg-cyan-400 animate-pulse', label: 'In Progress', cls: 'bg-cyan-500/8 text-cyan-700 border-cyan-400/25 dark:text-cyan-300' },
            Assigned: { dot: 'bg-indigo-400', label: 'Assigned', cls: 'bg-indigo-500/8 text-indigo-700 border-indigo-400/25 dark:text-indigo-300' },
            QA_Review: { dot: 'bg-violet-400', label: 'QA Review', cls: 'bg-violet-500/8 text-violet-700 border-violet-400/25 dark:text-violet-300' },
            QA_Audit: { dot: 'bg-teal-400', label: 'QA Audit', cls: 'bg-teal-500/8 text-teal-700 border-teal-400/25 dark:text-teal-300' },
            Rep_Correction: { dot: 'bg-orange-400', label: 'Report Correction', cls: 'bg-orange-500/8 text-orange-700 border-orange-400/25 dark:text-orange-300' },
            'Pending-Technician': { dot: 'bg-amber-400', label: 'Pending Tech', cls: 'bg-amber-500/8 text-amber-700 border-amber-400/25 dark:text-amber-300' },
            Approved: { dot: 'bg-emerald-400', label: 'Approved', cls: 'bg-emerald-500/8 text-emerald-700 border-emerald-400/25 dark:text-emerald-300' },
            Finalized: { dot: 'bg-emerald-500 animate-sweep', label: 'Finalized', cls: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30 font-bold dark:text-emerald-300' },
            Rejected: { dot: 'bg-red-400', label: 'Rejected', cls: 'bg-red-500/8 text-red-700 border-red-400/25 dark:text-red-300' },
        };

        const s = cfg[status];
        if (!s) {
            return <Badge variant="secondary" className="text-[9px] uppercase font-black">{status}</Badge>;
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
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-red-500/8 border border-red-500/20 text-red-600 dark:text-red-400">
                    <Zap className="w-2.5 h-2.5 fill-current animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{isEmergency ? 'EMERGENCY' : 'STAT'}</span>
                </div>
            );
        }
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-emerald-500/8 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <CircleDot className="w-2.5 h-2.5 opacity-70" />
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
                <div className="flex flex-col gap-0.5 items-end">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-emerald-500/8 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 w-fit">
                        <CheckCircle2 className="w-2.5 h-2.5 opacity-80 flex-shrink-0" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.06em]">Completed</span>
                    </div>
                    <div className="text-[9px] font-medium text-muted-foreground/60 pr-0.5 tabular-nums">
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
                <div className="flex flex-col gap-0.5 items-end">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-red-500/8 border border-red-500/20 text-red-600 dark:text-red-400 animate-pulse w-fit">
                        <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.06em]">SLA Breach</span>
                    </div>
                    <div className="text-[9px] font-medium text-red-500/60 pr-0.5 tabular-nums">
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
            <div className="flex flex-col gap-0.5 items-end">
                <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border tabular-nums text-[10px] w-fit", colorCls)}>
                    <Clock className="w-2.5 h-2.5 opacity-70 flex-shrink-0" />
                    <span className="font-semibold">{hours > 0 ? `${hours}h ` : ''}{displayMins}m</span>
                </div>
                <div className="text-[9px] font-medium text-muted-foreground/50 pr-0.5 transition-opacity duration-200 uppercase tracking-tighter">
                    rem SLA: {displayTotal}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 h-full relative">
            <style>
                {`
                @keyframes sweep {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 0.15; }
                    100% { transform: translateX(100%); opacity: 0; }
                }
                .animate-sweep {
                    position: relative;
                    overflow: hidden;
                }
                .animate-sweep::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.1),
                        transparent
                    );
                    transform: translateX(-100%);
                    animation: sweep 3s infinite;
                }
                .row-stat {
                    border-left: 4px solid #ef4444 !important;
                }
                .row-routine {
                    border-left: 4px solid #10b981 !important;
                }
                `}
            </style>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-muted/20 p-1 rounded-xl w-full sm:w-auto border border-border/40 backdrop-blur-sm overflow-x-auto custom-scrollbar">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('active')}
                        className={cn(
                            "h-7 sm:h-8 px-3 sm:px-5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest transition-all gap-1.5 sm:gap-2 flex-shrink-0",
                            activeTab === 'active'
                                ? "bg-background text-indigo-600 shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Inbox className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden xs:inline">Active</span>
                        <span className="xs:hidden">New</span>
                        <Badge className={cn(
                            "ml-1 border-none h-3.5 sm:h-4 min-w-[1rem] sm:min-w-[1.25rem] px-1 text-[8px] sm:text-[9px] font-bold flex items-center justify-center",
                            activeTab === 'active' ? "bg-indigo-100 text-indigo-600" : "bg-muted text-muted-foreground/60"
                        )}>
                            {activeCount}
                        </Badge>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "h-7 sm:h-8 px-3 sm:px-5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest transition-all gap-1.5 sm:gap-2 flex-shrink-0",
                            activeTab === 'history'
                                ? "bg-background text-indigo-600 shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <HistoryIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden xs:inline">History</span>
                        <span className="xs:hidden">Past</span>
                        <Badge className={cn(
                            "ml-1 border-none h-3.5 sm:h-4 min-w-[1rem] sm:min-w-[1.25rem] px-1 text-[8px] sm:text-[9px] font-bold flex items-center justify-center",
                            activeTab === 'history' ? "bg-indigo-100 text-indigo-600" : "bg-muted text-muted-foreground/60"
                        )}>
                            {historyCount}
                        </Badge>
                    </Button>
                </div>

                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                    <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        <span className="hidden xs:inline">QA RECEPTION • </span>{format(new Date(), 'HH:mm')}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {filteredCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-muted/5 border-2 border-dashed border-border/40 rounded-[2rem] text-center animate-in fade-in zoom-in duration-500 h-[300px]">
                        <div className="w-16 h-16 bg-muted/10 rounded-2xl flex items-center justify-center mb-6 border border-border/20 shadow-inner">
                            {activeTab === 'active' ? (
                                <LayoutDashboard className="w-8 h-8 text-muted-foreground/30" />
                            ) : (
                                <HistoryIcon className="w-8 h-8 text-muted-foreground/30" />
                            )}
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/70">
                            {activeTab === 'active' ? 'Queue is Clear' : 'No History Found'}
                        </h3>
                        <p className="text-[10px] text-muted-foreground/60 mt-2 max-w-[200px] leading-relaxed uppercase tracking-tight">
                            {activeTab === 'active'
                                ? 'All studies have been successfully triaged and processed.'
                                : 'Finalized or rejected cases will appear in this audit log.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-10">
                        {filteredCases.map((c) => (
                            <div
                                key={c._id}
                                onClick={() => { if (c.studyInstanceUID) onViewStudy(c._id); }}
                                className={cn(
                                    "group relative bg-card/40 backdrop-blur-sm rounded-2xl border border-border/50 p-4 sm:p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between shadow-sm hover:shadow-xl hover:bg-card transition-all duration-300 cursor-pointer overflow-hidden mb-3",
                                    c.urgency === 'STAT' || c.isEmergency ? "row-stat" : "row-routine",
                                    chattingCaseId === c._id && "ring-2 ring-indigo-500/20 border-indigo-500/40 bg-card"
                                )}
                            >
                                {/* Left Accent Bar Glow */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1",
                                    c.urgency === 'STAT' || c.isEmergency ? "bg-red-500 shadow-[2px_0_10px_rgba(239,68,68,0.3)]" : "bg-emerald-500 shadow-[2px_0_10px_rgba(16,185,129,0.3)]"
                                )} />

                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 z-10 w-full md:w-auto">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 border hidden md:flex",
                                        c.isEmergency || c.urgency === 'STAT'
                                            ? "bg-red-500/10 border-red-500/20 text-red-600"
                                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600"
                                    )}>
                                        <Activity className="w-6 h-6" />
                                    </div>

                                    <div className="space-y-1.5 w-full md:w-auto">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-sm font-bold tracking-tight text-foreground/90 uppercase truncate max-w-[140px] sm:max-w-[200px]">
                                                {c.patientName}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] font-black h-5 uppercase tracking-widest bg-muted/30 border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                                    {c.modality}
                                                </Badge>
                                                {getUrgencyIndicator(c.urgency, c.isEmergency)}
                                                {getStatusBadge(c.status)}
                                            </div>

                                            {c.integrityResults && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <div className={cn(
                                                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter transition-all",
                                                                c.integrityResults.status === 'Pass' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                                    c.integrityResults.status === 'Warning' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                                        c.integrityResults.status === 'Fail' ? "bg-red-500/10 text-red-600 border-red-500/20 font-bold" :
                                                                            "bg-muted text-muted-foreground/60 border-border/50"
                                                            )}>
                                                                <ShieldCheck className="w-3 h-3" />
                                                                {c.integrityResults.score}%
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest">AI Integrity Score: {c.integrityResults.status}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5">
                                                <Hash className="w-3.5 h-3.5 opacity-70" />
                                                {c.patientId}
                                            </span>
                                            <span className="hidden xs:inline w-1 h-1 rounded-full bg-border/60" />
                                            <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                                                <Hospital className="w-3.5 h-3.5 opacity-70" />
                                                {c.sourceHospital}
                                            </span>
                                            <span className="hidden xs:inline w-1 h-1 rounded-full bg-border/60" />
                                            <span className="flex items-center gap-1.5">
                                                <CalendarDays className="w-3.5 h-3.5 opacity-70" />
                                                {formatDistanceToNow(new Date(c.receivedAt))} ago
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-8 z-10 w-full xl:w-auto mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0 border-border/40">
                                    <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-start gap-4 xl:gap-1 w-full xl:w-auto">
                                        <div className="flex flex-col items-start xl:items-end order-2 xl:order-1">
                                            <span className="text-[10px] font-bold text-foreground/80 flex items-center gap-1.5 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                <Layers className="w-3.5 h-3.5" />
                                                {c.seriesCount}S / {c.imageCount}I
                                            </span>
                                        </div>
                                        <div className="hidden xl:block h-8 w-[1px] bg-border/40 mx-1 order-1 xl:order-2" />
                                        <div className="order-1 xl:order-3">
                                            {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-start mt-2 xl:mt-0">
                                        <div className="flex flex-wrap items-center gap-1.5 transition-all">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-9 w-9 rounded-xl transition-all",
                                                                chattingCaseId === c._id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "hover:bg-indigo-500/10 hover:text-indigo-600"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setChattingCaseId(chattingCaseId === c._id ? null : c._id);
                                                            }}
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px] uppercase font-bold tracking-widest">Chat</p></TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-600 transition-all"
                                                            onClick={(e) => { e.stopPropagation(); onTimeline(c._id); }}
                                                        >
                                                            <HistoryIcon className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px] uppercase font-bold tracking-widest">Timeline</p></TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl hover:bg-orange-500/10 hover:text-orange-600 transition-all"
                                                            onClick={(e) => { e.stopPropagation(); onEditDetails(c._id); }}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px] uppercase font-bold tracking-widest">Edit Details</p></TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl hover:bg-blue-500/10 hover:text-blue-600 transition-all"
                                                            onClick={(e) => { e.stopPropagation(); handleExport(c); }}
                                                        >
                                                            <FolderArchive className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px] uppercase font-bold tracking-widest">Export Case</p></TooltipContent>
                                                </Tooltip>

                                                <DropdownMenu>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600 transition-all">
                                                                    <FileDownIcon className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p className="text-[10px] uppercase font-bold tracking-widest">Download Report</p></TooltipContent>
                                                    </Tooltip>
                                                    <DropdownMenuContent align="end" className="w-52 rounded-xl">
                                                        <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 mb-1">Formats</div>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownloadReport(c._id, 'docx', false, c.patientName); }} className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer">
                                                            <FileDown className="w-4 h-4 mr-2 text-indigo-500" />
                                                            DOCX (Full Banner)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownloadReport(c._id, 'pdf', false, c.patientName); }} className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer">
                                                            <FileDown className="w-4 h-4 mr-2 text-red-500" />
                                                            PDF (Full Banner)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-border/40" />
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownloadReport(c._id, 'docx', true, c.patientName); }} className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer text-muted-foreground italic">
                                                            <FileDown className="w-4 h-4 mr-2" />
                                                            DOCX (Draft - No Banner)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownloadReport(c._id, 'pdf', true, c.patientName); }} className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer text-muted-foreground italic">
                                                            <FileDown className="w-4 h-4 mr-2" />
                                                            PDF (Draft - No Banner)
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TooltipProvider>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {c.status === 'Rejected' && (
                                                <Badge variant="outline" className="h-9 px-4 rounded-xl bg-red-500/5 text-red-500 border-red-500/20 text-[10px] uppercase font-bold tracking-[0.15em] gap-2">
                                                    <XCircle className="w-4 h-4" />
                                                    Rejected
                                                </Badge>
                                            )}

                                            {c.status === 'Rep_Correction' && onResolve && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); onResolve(c._id); }}
                                                    className="h-9 px-4 rounded-xl border-orange-500/30 bg-orange-500/10 text-orange-600 hover:bg-orange-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm"
                                                >
                                                    <Wrench className="w-4 h-4" />
                                                    Fix Case
                                                </Button>
                                            )}

                                            {onAccept && !['Assigned', 'In_Progress', 'Rejected', 'Finalized', 'QA_Audit', 'Rep_Correction', 'QA_Review'].includes(c.status) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); onAccept(c._id); }}
                                                    className="h-9 px-5 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest gap-2"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Accept
                                                </Button>
                                            )}

                                            {onAssign && !['Finalized', 'Rejected'].includes(c.status) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); onAssign(c._id); }}
                                                    className="h-9 px-5 rounded-xl border-indigo-500/30 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm"
                                                >
                                                    <Briefcase className="w-4 h-4" />
                                                    Manage
                                                </Button>
                                            )}

                                            {onReject && !['Assigned', 'In_Progress', 'Rejected', 'Finalized', 'QA_Audit', 'Rep_Correction', 'QA_Review'].includes(c.status) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); onReject(c._id); }}
                                                    className="h-9 px-4 rounded-xl border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </Button>
                                            )}

                                            {onReviewReport && ['QA_Review', 'QA_Audit', 'Finalized'].includes(c.status) && (
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); onReviewReport(c._id); }}
                                                    className="h-9 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Review
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, isOpen: open }))}
                title={confirmModal.title}
                description={confirmModal.description}
                onConfirm={confirmModal.onConfirm}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
            />
        </div>
    );
}








