import { Case, ReportStatus, CasePriority } from '../types/technician';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Eye,
    MessageSquare,
    History,
    Clock,
    AlertCircle,
    UserPlus,
    Search,
    Trash2,
    FileDown,
    Share2,
    CheckCircle2,
    Pencil,
    Activity,
    BadgeCheck,
    CalendarDays,
    Microscope,
    Stethoscope,
    Hourglass,
    Zap,
    CircleDot,
    UserCircle2,
    Hash,
    User,
    FolderArchive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ReportService } from '../services/ReportService';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmationModal } from './ConfirmationModal';
import { ShareModal } from './ShareModal';
import { useState } from 'react';

interface StudyTableProps {
    cases: Case[];
    viewMode?: 'list' | 'grid';
    onViewImage: (caseId: string) => void;
    onOpenChat: (caseId: string) => void;
    onOpenTimeline: (caseId: string) => void;
    onAssign?: (caseId: string) => void;
    onDelete: (caseId: string) => void;
    onEdit: (study: Case) => void;
    onResolve: (caseId: string) => void;
    activeChatCaseId?: string | null;
    userRole?: string;
    studyProgress?: Record<string, { received: number, total: number | null }>;
}

export function StudyTable({ cases, viewMode = 'list', onViewImage, onOpenChat, onOpenTimeline, onAssign, onDelete, onEdit, onResolve, activeChatCaseId, userRole, studyProgress }: StudyTableProps) {
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

    const [shareModal, setShareModal] = useState<{
        isOpen: boolean;
        caseId: string;
        patientName: string;
    }>({
        isOpen: false,
        caseId: '',
        patientName: ''
    });

    // ─── Status Badge ────────────────────────────────────────────────────────────
    const getStatusBadge = (status: ReportStatus, studyInstanceUID?: string, reason?: string) => {
        if (studyInstanceUID && studyProgress?.[studyInstanceUID] !== undefined) {
            const prog = studyProgress[studyInstanceUID];
            const progressText = prog.total
                ? `${prog.received} / ${prog.total} files`
                : `${prog.received} files`;

            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-[0.07em] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block" />
                    Receiving — {progressText}
                </span>
            );
        }

        const cfg: Record<string, { dot: string; label: string; cls: string }> = {
            Uploaded: { dot: 'bg-sky-400', label: 'Uploaded', cls: 'bg-sky-500/8 text-sky-700 border-sky-400/25 dark:text-sky-300' },
            QA_Pending: { dot: 'bg-amber-400', label: 'QA Pending', cls: 'bg-amber-500/8 text-amber-700 border-amber-400/25 dark:text-amber-300' },
            QA_Review: { dot: 'bg-violet-400', label: 'QA Review', cls: 'bg-violet-500/8 text-violet-700 border-violet-400/25 dark:text-violet-300' },
            Assigned: { dot: 'bg-blue-400', label: 'Assigned', cls: 'bg-blue-500/8 text-blue-700 border-blue-400/25 dark:text-blue-300' },
            In_Progress: { dot: 'bg-cyan-400 animate-pulse', label: 'In Progress', cls: 'bg-cyan-500/8 text-cyan-700 border-cyan-400/25 dark:text-cyan-300' },
            Rep_Correction: { dot: 'bg-orange-400', label: 'Correction', cls: 'bg-orange-500/8 text-orange-700 border-orange-400/25 dark:text-orange-300' },
            QA_Audit: { dot: 'bg-teal-400', label: 'QA Audit', cls: 'bg-teal-500/8 text-teal-700 border-teal-400/25 dark:text-teal-300' },
            Finalized: { dot: 'bg-emerald-400', label: 'Finalized', cls: 'bg-emerald-500/8 text-emerald-700 border-emerald-400/25 dark:text-emerald-300' },
            Incomplete: { dot: 'bg-red-400', label: 'Incomplete', cls: 'bg-red-500/8 text-red-700 border-red-400/25 dark:text-red-300' },
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
    const getUrgencyIndicator = (urgency: CasePriority) => {
        if (urgency === 'STAT') {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                    <Zap className="w-3 h-3 fill-current animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]">STAT</span>
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
    const formatTAT = (seconds: number | undefined, urgency: CasePriority, status: string) => {
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

    // ─── Export Handler ───────────────────────────────────────────────────────────
    const handleExport = (c: Case) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const url = `${baseUrl}/cases/${c._id}/export`;

        setConfirmModal({
            isOpen: true,
            title: `Export "${c.patientName}"?`,
            description: "A ZIP file containing all DICOM studies and reports will be prepared for download.",
            confirmLabel: "Export Study",
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

    // ─── Action Buttons ───────────────────────────────────────────────────────────
    const renderActionButtons = (c: Case, compact = false) => {
        const isReceiving = c.studyInstanceUID && studyProgress?.[c.studyInstanceUID] !== undefined;

        if (c.status === 'Incomplete') {
            return (
                <div className={cn("flex items-center justify-end gap-3", compact && "justify-start")}>
                    <span className="text-[9px] font-bold uppercase tracking-tight text-red-500/70 animate-pulse">
                        Please re-upload with a stable connection
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-[5px] text-red-500 hover:text-red-600 hover:bg-red-500/8 transition-colors shrink-0"
                        onClick={() => onDelete(c._id)}
                        title="Delete Study"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            );
        }

        // shared icon-button base classes
        const iconBtn = "h-7 w-7 rounded-[5px] border border-border/40 bg-transparent hover:bg-muted/60 hover:border-border/70 hover:-translate-y-px transition-all duration-150";

        return (
            <div className={cn(
                "flex items-center justify-end gap-1",
                compact && "justify-start flex-wrap",
                isReceiving && "opacity-40 pointer-events-none grayscale"
            )}>
                {/* View */}
                <Button
                    variant="outline"
                    size="icon"
                    disabled={isReceiving}
                    className={cn(iconBtn, "hover:text-foreground")}
                    onClick={() => onViewImage(c._id)}
                    title="View Study"
                >
                    <Eye className="w-3.5 h-3.5" />
                </Button>

                {/* Export ZIP */}
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(iconBtn, "hover:border-indigo-400/40 hover:text-indigo-500 hover:bg-indigo-500/6")}
                    onClick={() => handleExport(c)}
                    title="Download Study (ZIP)"
                >
                    <FolderArchive className="w-3.5 h-3.5" />
                </Button>

                {/* Edit */}
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(iconBtn, "hover:border-indigo-400/40 hover:text-indigo-500 hover:bg-indigo-500/6")}
                    onClick={() => onEdit(c)}
                    title="Edit Details"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </Button>

                {/* Chat */}
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        iconBtn,
                        "relative",
                        activeChatCaseId === c._id
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-600"
                            : cn(
                                "hover:border-indigo-400/40 hover:text-indigo-500 hover:bg-indigo-500/6",
                                c.hasNewChat && "after:absolute after:top-[3px] after:right-[3px] after:w-[5px] after:h-[5px] after:bg-red-500 after:rounded-full after:border after:border-background"
                            )
                    )}
                    onClick={() => onOpenChat(c._id)}
                    title="Communication"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                </Button>

                {/* Timeline */}
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(iconBtn, "hover:text-foreground")}
                    onClick={() => onOpenTimeline(c._id)}
                    title="Timeline"
                >
                    <History className="w-3.5 h-3.5" />
                </Button>

                {/* Fix Case (Rejected) */}
                {c.status === 'Rejected' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setConfirmModal({
                                isOpen: true,
                                title: "Confirm Case Resolution",
                                description: "Are you sure you have fixed all the issues reported by the radiologist/QA?",
                                confirmLabel: "Mark as Fixed",
                                onConfirm: () => onResolve(c._id)
                            });
                        }}
                        className="h-7 px-2.5 rounded-[5px] border border-emerald-500/30 bg-emerald-500/6 text-emerald-700 hover:bg-emerald-500/12 text-[10px] font-semibold uppercase tracking-[0.07em] gap-1.5 ml-0.5 dark:text-emerald-400 transition-all animate-in fade-in zoom-in duration-200"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        Fix Case
                    </Button>
                )}

                {/* Download Report + Share (QA_Audit / Finalized / admin) */}
                {(c.status === 'QA_Audit' || c.status === 'Finalized' || userRole === 'admin') && (
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={cn(iconBtn, "hover:border-emerald-400/40 hover:text-emerald-600 hover:bg-emerald-500/6")}
                                    title="Download Report"
                                >
                                    <FileDown className="w-3.5 h-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl">
                                <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 mb-1">Formats</div>
                                <DropdownMenuItem 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await ReportService.downloadReport(c._id, 'docx', false, c.patientName);
                                            toast.success('Report downloaded successfully');
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to download report');
                                        }
                                    }} 
                                    className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer"
                                >
                                    <FileDown className="w-4 h-4 mr-2 text-indigo-500" />
                                    DOCX (Full Banner)
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await ReportService.downloadReport(c._id, 'pdf', false, c.patientName);
                                            toast.success('Report downloaded successfully');
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to download report');
                                        }
                                    }} 
                                    className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer"
                                >
                                    <FileDown className="w-4 h-4 mr-2 text-red-500" />
                                    PDF (Full Banner)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border/40" />
                                <DropdownMenuItem 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await ReportService.downloadReport(c._id, 'docx', true, c.patientName);
                                            toast.success('Report downloaded successfully');
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to download report');
                                        }
                                    }} 
                                    className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer text-muted-foreground italic"
                                >
                                    <FileDown className="w-4 h-4 mr-2" />
                                    DOCX (Draft - No Banner)
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await ReportService.downloadReport(c._id, 'pdf', true, c.patientName);
                                            toast.success('Report downloaded successfully');
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to download report');
                                        }
                                    }} 
                                    className="text-[11px] font-bold uppercase tracking-tight py-2.5 rounded-lg cursor-pointer text-muted-foreground italic"
                                >
                                    <FileDown className="w-4 h-4 mr-2" />
                                    PDF (Draft - No Banner)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(iconBtn, "hover:border-indigo-400/40 hover:text-indigo-500 hover:bg-indigo-500/6")}
                            onClick={() => setShareModal({ isOpen: true, caseId: c._id, patientName: c.patientName })}
                            title="Secure Sharing"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                        </Button>
                    </>
                )}

                {!compact && <div className="w-px h-3.5 bg-border/60 mx-0.5" />}

                {/* Delete */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-[5px] text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/8 transition-all duration-150"
                    onClick={() => onDelete(c._id)}
                    title="Delete Study"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────────
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
                    opacity: 0.45;
                    border-radius: 0 2px 2px 0;
                    position: absolute;
                    top: 0; left: 0;
                }
                tr.row-routine td:first-child { position: relative; }

                /* Subtle row reveal */
                tbody tr { transition: background 0.1s; }
            `}</style>

            {/* ── Grid View ──────────────────────────────────────────────────────── */}
            {viewMode === 'grid' ? (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cases.map((c) => (
                        <div
                            key={c._id}
                            className={cn(
                                "group relative rounded-xl border overflow-hidden transition-all duration-200",
                                c.status === 'Incomplete'
                                    ? "border-red-300/50 bg-red-50/30 dark:bg-red-900/10 cursor-default"
                                    : "border-border/50 bg-card hover:bg-card hover:border-border hover:shadow-md hover:shadow-black/5 cursor-pointer"
                            )}
                            onClick={() => { if (c.status !== 'Incomplete') onViewImage(c._id); }}
                        >
                            {/* Urgency accent top bar */}
                            <div className={cn(
                                "h-[3px] w-full",
                                c.urgency === 'STAT' ? "bg-red-500" : "bg-emerald-500/50"
                            )} />

                            {/* Receiving sweep */}
                            {studyProgress?.[c.studyInstanceUID] !== undefined && (
                                <div className="absolute inset-x-0 bottom-0 h-[2px] pointer-events-none overflow-hidden">
                                    <div className="h-full w-full bg-indigo-500/15" />
                                    <div className="h-full w-1/3 bg-indigo-500/50 animate-sweep absolute top-0" />
                                </div>
                            )}

                            <div className="p-4 space-y-3">
                                {/* Header: patient + urgency */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="font-semibold text-[13px] text-foreground truncate flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                            {c.patientName}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.07em] font-medium">
                                            MRN: {c.patientId} · {c.patient?.age || c.age}Y · {c.patient?.gender || c.gender}
                                        </div>
                                    </div>
                                    {getUrgencyIndicator(c.urgency)}
                                </div>

                                {/* Modality + date */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-[0.08em] bg-primary/8 text-primary border border-primary/20">
                                            {c.modality}
                                        </span>
                                        {c.bodyPart && (
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">{c.bodyPart}</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                        {format(new Date(c.studyDate), 'MMM dd, HH:mm')}
                                    </span>
                                </div>

                                {/* Status + TAT */}
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                    {getStatusBadge(c.status, c.studyInstanceUID, c.rejectionReason)}
                                    {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                </div>

                                {/* Actions */}
                                <div className="pt-1 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                                    {renderActionButtons(c, true)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ── List / Table View ───────────────────────────────────────────── */
                <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
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
                                            Study
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
                                            <Stethoscope className="w-3 h-3 opacity-60" />
                                            Radiologist
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
                                {cases.map((c) => (
                                    <tr
                                        key={c._id}
                                        className={cn(
                                            "group relative hover:bg-muted/20 transition-colors",
                                            c.urgency === 'STAT' ? "row-stat" : "row-routine"
                                        )}
                                    >
                                        <td className="p-0 w-[3px] relative z-10" />
                                        <td className="px-4 py-3.5 relative z-10">
                                            {getUrgencyIndicator(c.urgency)}
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-[13px] text-foreground flex items-center gap-1.5 leading-tight">
                                                    <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
                                                    {c.patientName}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.07em] font-medium pl-5">
                                                    <span>MRN: {c.patientId}</span>
                                                    <span className="opacity-30">·</span>
                                                    <span>{c.patient?.age || c.age}Y</span>
                                                    <span className="opacity-30">·</span>
                                                    <span>{c.patient?.gender || c.gender}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            <div className="min-w-[180px] space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-[0.09em] bg-primary/8 text-primary border border-primary/20">
                                                        {c.modality}
                                                    </span>
                                                    {c.accessionNumber && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border border-border/50 bg-muted/30 text-[9px] text-muted-foreground font-medium uppercase tracking-[0.07em]">
                                                            <Hash className="w-2.5 h-2.5" />
                                                            {c.accessionNumber.slice(-8)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-foreground/80 tabular-nums font-medium">
                                                    <CalendarDays className="w-3 h-3 opacity-50 flex-shrink-0" />
                                                    {format(new Date(c.studyDate), 'MMM dd, HH:mm')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            {getStatusBadge(c.status, c.studyInstanceUID, c.rejectionReason)}
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            {c.assignedRadiologist ? (
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                                                        {c.assignedRadiologist.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <Stethoscope className="w-3 h-3 text-indigo-500/70 flex-shrink-0" />
                                                            <span className="text-[11px] font-semibold text-foreground truncate max-w-[110px]">
                                                                {c.assignedRadiologist.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                onAssign && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onAssign(c._id)}
                                                        className="h-7 px-2.5 rounded-[5px] text-[10px] font-semibold uppercase tracking-[0.07em] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/8 border border-dashed border-border/60 hover:border-indigo-400/50 transition-all"
                                                    >
                                                        <UserPlus className="w-3 h-3 mr-1.5" />
                                                        Assign
                                                    </Button>
                                                )
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                        </td>
                                        <td className="px-4 py-3.5 relative z-10">
                                            {renderActionButtons(c)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="md:hidden divide-y divide-border/40">
                        {cases.map((c) => {
                            const isEmergency = c.urgency === 'STAT';
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
                                        {getUrgencyIndicator(c.urgency)}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 border-y border-border/40 text-[10px] text-muted-foreground/60 tabular-nums uppercase font-bold tracking-widest">
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

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                                        <div className="flex flex-col gap-2">
                                            {getStatusBadge(c.status, c.studyInstanceUID, c.rejectionReason)}
                                            {formatTAT(c.tatRemainingSeconds, c.urgency, c.status)}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40">
                                            {renderActionButtons(c, true)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Empty State ───────────────────────────────────────────────────── */}
            {cases.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 border-t border-border/50 animate-in fade-in duration-300">
                    <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center mb-4 opacity-50">
                        <Search className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground/70">No active studies found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Adjust your filters or upload a new study to get started.</p>
                </div>
            )}

            {/* ── Confirmation Modal ────────────────────────────────────────────── */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, isOpen: open }))}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                variant={confirmModal.variant}
                onConfirm={confirmModal.onConfirm}
            />

            <ShareModal
                isOpen={shareModal.isOpen}
                onClose={() => setShareModal(prev => ({ ...prev, isOpen: false }))}
                caseId={shareModal.caseId}
                patientName={shareModal.patientName}
            />
        </div>
    );
}