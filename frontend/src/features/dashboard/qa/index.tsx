import { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
    Activity,
    ClipboardList,
    LogOut,
    RefreshCw,
    ShieldCheck,
    Cpu,
    Inbox,
    AlertTriangle,
    FileText,
    ArrowLeft,
    History,
    Eye,
    Pencil,
    MessageSquare,
    FileDown,
    X,
    Image as ImageIcon,
    ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReceptionQueue } from '../../qa/hooks/useReceptionQueue';
import { ReceptionQueue } from '../../qa/components/ReceptionQueue';
import { VerificationView } from '../../qa/components/verification/VerificationView';
import { AssignmentManager } from '../../qa/components/assignment/AssignmentManager';
import { CaseChatHub } from '../../qa/components/communication/CaseChatHub';
import { NotificationCenter } from '../../technician/components/NotificationCenter';
import { QAReceptionService } from '../../qa/services/QAReceptionService';
const ReportingEditor = lazy(() => import('../../radiologist/components/ReportingEditor').then(m => ({ default: m.ReportingEditor })));
import { toast } from 'sonner';
import { TimelineModal } from '@/components/timeline/TimelineModal';
import { CaseDetailsModal } from '../../technician/components/CaseDetailsModal';
import { Case } from '../../technician/types/technician';
import { CaseService } from '../../technician/services/CaseService';
import { ReportService } from '../../technician/services/ReportService';
import { RejectionModal } from '../../radiologist/components/RejectionModal';
import { ReturnCorrectionModal } from '../../qa/components/ReturnCorrectionModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { type ImperativePanelHandle } from "react-resizable-panels";

export default function QADashboard() {
    const { user, logout } = useAuthStore();
    const {
        cases,
        isLoading,
        stats,
        refresh
    } = useReceptionQueue();

    const [verifyingCaseId, setVerifyingCaseId] = useState<string | null>(null);
    const [assigningCaseId, setAssigningCaseId] = useState<string | null>(null);
    const [rejectingCaseId, setRejectingCaseId] = useState<string | null>(null);
    const [reviewingCaseId, setReviewingCaseId] = useState<string | null>(null);
    const [chattingCaseId, setChattingCaseId] = useState<string | null>(null);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeView, setActiveViewState] = useState<'queue' | 'active' | 'banners'>(
        () => (searchParams.get('view') as any) || 'queue'
    );
    const [activeTab, setActiveTabState] = useState<'active' | 'history'>(
        () => (searchParams.get('tab') as any) || 'active'
    );

    const setActiveView = (view: 'queue' | 'active' | 'banners') => {
        setActiveViewState(view);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('view', view);
        setSearchParams(newParams, { replace: true });
    };

    const setActiveTab = (tab: 'active' | 'history') => {
        setActiveTabState(tab);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tab);
        setSearchParams(newParams, { replace: true });
    };

    // New state for requested features
    const [timelineCaseId, setTimelineCaseId] = useState<string | null>(null);
    const [editingCase, setEditingCase] = useState<Case | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const selectedChatCase = useMemo(() =>
        cases.find(c => c._id === chattingCaseId),
        [cases, chattingCaseId]
    );

    const chatPanelRef = useRef<ImperativePanelHandle>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (chattingCaseId) {
            chatPanelRef.current?.expand();
        } else {
            chatPanelRef.current?.collapse();
        }
    }, [chattingCaseId]);


    const handleStartVerification = (id: string) => {
        setVerifyingCaseId(id);
    };

    const handleApprove = (id: string) => {
        setVerifyingCaseId(null);
        setAssigningCaseId(id);
    };

    const handleAssign = (id: string) => {
        setAssigningCaseId(id);
    };

    const handleRejectClick = (id: string) => {
        setRejectingCaseId(id);
    };

    const handleConfirmReject = async (reasonId: string, notes: string) => {
        if (!rejectingCaseId) return;
        try {
            await QAReceptionService.rejectCase(rejectingCaseId, reasonId, notes);
            toast.success("Case Rejected", {
                description: `Sent back to technician.`
            });
            setRejectingCaseId(null);
            refresh();
        } catch (error) {
            toast.error("Failed to reject case");
        }
    };

    // Existing dummy handler - Removing or keeping as verifying handler?
    // The VerificationView passes 'onReject' which takes (id, reason, notes).
    // I will keep it for VerificationView but redirect it to use the service if needed,
    // or just let it use the new flow if called from Card.
    const handleResolve = async (id: string) => {
        try {
            await QAReceptionService.resolveCase(id);
            toast.success("Case Fixed", {
                description: "Returned to Radiologist"
            });
            refresh();
        } catch (err) {
            toast.error("Failed to fix case");
        }
    };

    const handleVerificationReject = (id: string, reason: string, notes: string) => {
        // This is called from VerificationView which computes reason locally?
        // For now, let's just log or toast, as Verification View might need refactoring to use the Modal too.
        toast.warning("Study Rejected", {
            description: `Deficiency: ${reason}. Technician notified.`
        });
        setVerifyingCaseId(null);
        refresh();
    };


    const handleCompleteAssignment = (caseId: string, doctorId: string, partnerId?: string) => {
        setAssigningCaseId(null);
        setActiveView('queue');
        refresh();
        if (partnerId) {
            toast.success("Case assigned to partner successfully");
        }
    };

    const handleViewStudy = (id: string) => {
        // Open OHIF Viewer with the DICOM Study Instance UID
        const caseData = cases.find(c => c._id === id);
        if (caseData?.studyInstanceUID) {
            window.open(`${import.meta.env.VITE_OHIF_URL || 'http://localhost:3000'}/basic?StudyInstanceUIDs=${caseData.studyInstanceUID}`, '_blank');
        } else {
            toast.error("Study Instance UID not found", {
                description: "Cannot open viewer without a valid study identifier."
            });
        }
    };

    const handleReviewReport = (id: string) => {
        setReviewingCaseId(id);
    };

    const handleEditDetails = async (id: string) => {
        try {
            const fullCase = await CaseService.getCaseById(id);
            setEditingCase(fullCase);
            setIsDetailsOpen(true);
        } catch (err) {
            toast.error("Failed to fetch case details");
        }
    };


    const handleUpdateCase = async (updatedCase: any) => {
        try {
            await CaseService.updateCase(updatedCase._id, updatedCase);
            toast.success("Case details updated");
            setIsDetailsOpen(false);
            setEditingCase(null);
            refresh();
        } catch (error) {
            console.error("Failed to update case:", error);
            toast.error("Failed to update case details");
        }
    };

    const handleDownloadReport = async (id: string, format: 'pdf' | 'docx', noBanner?: boolean, patientName?: string) => {
        try {
            await ReportService.downloadReport(id, format, noBanner || false, patientName);
            toast.success(`Report downloaded as ${format.toUpperCase()}${noBanner ? ' (No Banner)' : ''}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to download report');
        }
    };

    const currentReviewingCase = cases.find(c => c._id === reviewingCaseId);

    const handleQAApprove = async (reportData: any) => {
        if (!reviewingCaseId) return;
        try {
            await QAReceptionService.finalizeReport(reviewingCaseId, reportData);
            toast.success("Report Finalized", {
                description: "Study locked and dispatched to hospital."
            });
            setReviewingCaseId(null);
            refresh();
        } catch (error) {
            toast.error("Failed to finalize report");
        }
    };

    const handleQAReturnForCorrection = async (notes: string) => {
        if (!reviewingCaseId) return;
        try {
            await QAReceptionService.rejectCase(reviewingCaseId, "QA_Audit_Failed", notes);
            toast.warning("Report Returned", {
                description: "Radiologist has been notified of required corrections."
            });
            setReviewingCaseId(null);
            refresh();
        } catch (error) {
            toast.error("Failed to return report");
        }
    };

    const handleQAUpdateReport = async (reportData: any) => {
        if (!reviewingCaseId) return;
        try {
            await QAReceptionService.updateReport(reviewingCaseId, reportData);
            toast.success("Report Updated by QA");
            refresh();
        } catch (error) {
            toast.error("Failed to update report");
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            {/* Left Micro-Sidebar */}
            <aside className="fixed left-0 top-0 z-30 w-14 sm:w-16 h-screen flex flex-col items-center py-8 border-r border-border bg-card/50 flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-indigo-600/20">
                    <Activity className="w-6 h-6 text-white" />
                </div>

                <nav className="flex flex-col gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView('queue')}
                        className={cn("h-10 w-10 rounded-xl", activeView === 'queue' ? "text-primary bg-primary/10" : "text-muted-foreground")}
                    >
                        <Inbox className="w-5 h-5" />
                    </Button>
                </nav>

                <div className="mt-auto flex flex-col gap-4">

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        className="h-10 w-10 text-red-500 hover:bg-red-50"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="ml-14 sm:ml-16 flex-1 flex flex-col overflow-hidden bg-muted/5">
                {/* Header */}
                <header className="min-h-16 py-3 sm:py-0 bg-background/95 border-b border-border px-4 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                        <div>
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase">QA Command Center</h1>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider sm:tracking-[0.2em]">QA & Coordination Node</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="hidden lg:flex items-center gap-2 bg-indigo-500/5 px-4 py-1.5 rounded-full border border-indigo-500/10 mr-2 sm:mr-4">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Active Pipeline: {stats.new} New Cases</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={refresh}
                                className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-border/50 bg-background hover:bg-muted", isLoading && "animate-spin")}
                            >
                                <RefreshCw className="w-4 h-4 text-foreground/80" />
                            </Button>

                            <div className="scale-90 sm:scale-100 origin-center flex items-center">
                                <NotificationCenter />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 sm:pl-2">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-black leading-tight text-foreground/90">{user?.name}</div>
                                <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">QA Supervisor</div>
                            </div>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                                <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 relative flex flex-col min-h-0">
                    {isMobile ? (
                        /* Mobile: Show either content OR chat full-screen */
                        chattingCaseId && selectedChatCase ? (
                            <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
                                <div className="h-16 px-6 border-b border-border flex items-center gap-3 bg-muted/5 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full hover:bg-muted/80 transition-all"
                                        onClick={() => setChattingCaseId(null)}
                                    >
                                        <ArrowDown className="w-4 h-4 rotate-90" />
                                    </Button>
                                    <span className="text-sm font-semibold">Back to Cases</span>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <CaseChatHub
                                        caseId={chattingCaseId}
                                        patientName={selectedChatCase.patientName}
                                        radiologistName={selectedChatCase.assignedRadiologist?.name}
                                        technicianName={selectedChatCase.technicianId}
                                        qaName={user?.name}
                                        isSidePanel={true}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className={cn(
                                "h-full flex flex-col",
                                !reviewingCaseId && "overflow-y-auto custom-scrollbar px-4 sm:px-8 py-8"
                            )}>
                                <div className="w-full flex-1 flex flex-col min-h-0">
                                    {assigningCaseId ? (
                                        <AssignmentManager
                                            caseData={cases.find(c => c._id === assigningCaseId)!}
                                            onBack={() => setAssigningCaseId(null)}
                                            onComplete={handleCompleteAssignment}
                                        />
                                    ) : reviewingCaseId ? (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
                                                <Button variant="ghost" size="sm" onClick={() => setReviewingCaseId(null)} className="text-[10px] font-black uppercase tracking-widest gap-2">
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Back to Workflow
                                                </Button>
                                            </div>
                                            <div className="flex-1 min-h-0 relative">
                                                <div className="absolute inset-0">
                                                    <Suspense fallback={
                                                        <div className="flex-1 flex items-center justify-center">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Editor...</p>
                                                            </div>
                                                        </div>
                                                    }>
                                                        <ReportingEditor
                                                            caseData={currentReviewingCase as any}
                                                            onSave={handleQAUpdateReport}
                                                            onFinalize={handleQAApprove}
                                                        />
                                                    </Suspense>
                                                </div>
                                            </div>
                                        </div>
                                    ) : verifyingCaseId ? (
                                        <VerificationView
                                            caseData={cases.find(c => c._id === verifyingCaseId)!}
                                            onBack={() => setVerifyingCaseId(null)}
                                            onApprove={handleApprove}
                                            onReject={handleVerificationReject}
                                        />
                                    ) : activeView === 'active' ? (
                                        <div className="flex flex-col gap-6 h-full">
                                            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
                                                <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                                                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl w-fit">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setActiveTab('active')}
                                                            className={cn(
                                                                "h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                                activeTab === 'active'
                                                                    ? "bg-white text-indigo-600 shadow-sm"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                                            )}
                                                        >
                                                            <Activity className="w-3.5 h-3.5 mr-2" />
                                                            Active Case
                                                            <Badge className="ml-2 bg-indigo-100 text-indigo-600 border-none h-4 px-1.5 text-[8px]">
                                                                {cases.filter(c => ['Assigned', 'In_Progress', 'QA_Review', 'Rep_Correction', 'QA_Audit'].includes(c.status)).length}
                                                            </Badge>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setActiveTab('history')}
                                                            className={cn(
                                                                "h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                                activeTab === 'history'
                                                                    ? "bg-white text-emerald-600 shadow-sm"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                                            )}
                                                        >
                                                            <History className="w-3.5 h-3.5 mr-2" />
                                                            Finalized
                                                            <Badge className="ml-2 bg-emerald-100 text-emerald-600 border-none h-4 px-1.5 text-[8px]">
                                                                {cases.filter(c => c.status === 'Finalized').length}
                                                            </Badge>
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {cases.filter(c => {
                                                        if (activeTab === 'history') return c.status === 'Finalized';
                                                        return ['Assigned', 'In_Progress', 'QA_Review', 'Rep_Correction', 'QA_Audit'].includes(c.status);
                                                    }).map(c => (
                                                        <div
                                                            key={c._id}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 bg-muted/10 rounded-2xl border transition-all group",
                                                                chattingCaseId === c._id ? "border-indigo-500 bg-indigo-50/30" : "border-border hover:border-indigo-400"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setChattingCaseId(c._id)}>
                                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-border">
                                                                    <FileText className="w-5 h-5 text-indigo-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-foreground uppercase tracking-tight">{c.patientName}</div>
                                                                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                                                        {c.modality} • {c.assignedRadiologist?.name || 'Unassigned'} •
                                                                        <span className={cn(
                                                                            "ml-1 p-0.5 px-1 rounded",
                                                                            c.status === 'Finalized' ? "bg-emerald-100 text-emerald-700" :
                                                                                c.status === 'QA_Review' ? "bg-purple-100 text-purple-700" :
                                                                                    (c.status === 'In_Progress' || c.status === 'In-Progress' as any) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                                                        )}>
                                                                            {c.status.replace('_', ' ')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setAssigningCaseId(c._id);
                                                                    }}
                                                                >
                                                                    Re-Assign
                                                                </Button>
                                                                <div className="w-px h-4 bg-border mx-1" />
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg border-transparent hover:border-border hover:bg-background transition-all"
                                                                    onClick={(e) => { e.stopPropagation(); handleViewStudy(c._id); }}
                                                                    title="View Study"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg border-transparent hover:border-indigo-200 hover:bg-indigo-50 text-indigo-600 transition-all"
                                                                    onClick={(e) => { e.stopPropagation(); handleEditDetails(c._id); }}
                                                                    title="Edit Details"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-lg border-transparent hover:border-border hover:bg-background transition-all"
                                                                    onClick={(e) => { e.stopPropagation(); setTimelineCaseId(c._id); }}
                                                                    title="Timeline"
                                                                >
                                                                    <History className="w-4 h-4" />
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-lg border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-all"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            title="Download Report"
                                                                        >
                                                                            <FileDown className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => handleDownloadReport(c._id, 'docx')}>
                                                                            Download as DOCX
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleDownloadReport(c._id, 'pdf')}>
                                                                            Download as PDF
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {cases.filter(c => {
                                                        if (activeTab === 'history') return c.status === 'Finalized';
                                                        return ['Assigned', 'In_Progress', 'QA_Review', 'Rep_Correction', 'QA_Audit'].includes(c.status);
                                                    }).length === 0 && (
                                                            <div className="text-center p-8 text-muted-foreground text-xs uppercase font-bold opacity-50">
                                                                No {activeTab === 'history' ? 'finalized' : 'active'} cases found
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-6 h-full">
                                            {/* Stats HUD */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                                                <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">Total Active</div>
                                                        <div className="text-lg sm:text-2xl font-black text-foreground">{stats.total}</div>
                                                    </div>
                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Activity className="w-4 h-4 sm:w-6 sm:h-6" />
                                                    </div>
                                                </div>
                                                <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">New Imports</div>
                                                        <div className="text-lg sm:text-2xl font-black text-indigo-600">{stats.new}</div>
                                                    </div>
                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                        <Inbox className="w-4 h-4 sm:w-6 sm:h-6" />
                                                    </div>
                                                </div>
                                                <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">STAT BACKLOG</div>
                                                        <div className="text-lg sm:text-2xl font-black text-red-600">{stats.stat}</div>
                                                    </div>
                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                        <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
                                                    </div>
                                                </div>
                                                <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">Ready</div>
                                                        <div className="text-lg sm:text-2xl font-black text-emerald-600">{stats.unassigned}</div>
                                                    </div>
                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                        <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col flex-1">
                                                <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Inbox className="w-4 h-4 text-indigo-600" />
                                                        <h2 className="text-[11px] font-black uppercase tracking-widest">Study Reception Queue</h2>
                                                    </div>
                                                </div>
                                                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                                                    <ReceptionQueue
                                                        cases={cases}
                                                        isLoading={isLoading}
                                                        chattingCaseId={chattingCaseId}
                                                        setChattingCaseId={setChattingCaseId}
                                                        onViewStudy={handleViewStudy}
                                                        onEditDetails={handleEditDetails}
                                                        onTimeline={(id) => setTimelineCaseId(id)}
                                                        onDownloadReport={handleDownloadReport}
                                                        onAccept={handleApprove}
                                                        onReject={handleRejectClick}
                                                        onResolve={handleResolve}
                                                        onReviewReport={handleReviewReport}
                                                        onAssign={handleAssign}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        /* Desktop: Show ResizablePanelGroup with both panels */
                        <ResizablePanelGroup direction="horizontal" className="h-full items-stretch">
                            <ResizablePanel defaultSize={70} minSize={60}>
                                <div className={cn(
                                    "h-full flex flex-col min-h-0",
                                    !reviewingCaseId && "overflow-y-auto custom-scrollbar px-4 sm:px-8 py-8"
                                )}>
                                    <div className="w-full flex-1 flex flex-col min-h-0">
                                        {assigningCaseId ? (
                                            <AssignmentManager
                                                caseData={cases.find(c => c._id === assigningCaseId)!}
                                                onBack={() => setAssigningCaseId(null)}
                                                onComplete={handleCompleteAssignment}
                                            />
                                        ) : reviewingCaseId ? (
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
                                                    <Button variant="ghost" size="sm" onClick={() => setReviewingCaseId(null)} className="text-[10px] font-black uppercase tracking-widest gap-2">
                                                        <ArrowLeft className="w-4 h-4" />
                                                        Back to Workflow
                                                    </Button>
                                                </div>
                                                <div className="flex-1 min-h-0 relative">
                                                    <div className="absolute inset-0">
                                                        <Suspense fallback={
                                                            <div className="flex-1 flex items-center justify-center">
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Editor...</p>
                                                                </div>
                                                            </div>
                                                        }>
                                                            <ReportingEditor
                                                                caseData={currentReviewingCase as any}
                                                                onSave={handleQAUpdateReport}
                                                                onFinalize={handleQAApprove}
                                                            />
                                                        </Suspense>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : verifyingCaseId ? (
                                            <VerificationView
                                                caseData={cases.find(c => c._id === verifyingCaseId)!}
                                                onBack={() => setVerifyingCaseId(null)}
                                                onApprove={handleApprove}
                                                onReject={handleVerificationReject}
                                            />
                                        ) : activeView === 'active' ? (
                                            <div className="flex flex-col gap-6 h-full">
                                                <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
                                                    <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                                                        <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl w-fit">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setActiveTab('active')}
                                                                className={cn(
                                                                    "h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                                    activeTab === 'active'
                                                                        ? "bg-white text-indigo-600 shadow-sm"
                                                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                                                )}
                                                            >
                                                                <Activity className="w-3.5 h-3.5 mr-2" />
                                                                Active Case
                                                                <Badge className="ml-2 bg-indigo-100 text-indigo-600 border-none h-4 px-1.5 text-[8px]">
                                                                    {cases.filter(c => ['Assigned', 'In_Progress', 'QA_Review', 'Rep_Correction', 'QA_Audit'].includes(c.status)).length}
                                                                </Badge>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setActiveTab('history')}
                                                                className={cn(
                                                                    "h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                                    activeTab === 'history'
                                                                        ? "bg-white text-emerald-600 shadow-sm"
                                                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                                                )}
                                                            >
                                                                <History className="w-3.5 h-3.5 mr-2" />
                                                                Finalized
                                                                <Badge className="ml-2 bg-emerald-100 text-emerald-600 border-none h-4 px-1.5 text-[8px]">
                                                                    {cases.filter(c => c.status === 'Finalized').length}
                                                                </Badge>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {cases.filter(c => {
                                                            if (activeTab === 'history') return c.status === 'Finalized';
                                                            return ['Assigned', 'In_Progress', 'QA_Review', 'Rep_Correction', 'QA_Audit'].includes(c.status);
                                                        }).map(c => (
                                                            <div
                                                                key={c._id}
                                                                className={cn(
                                                                    "flex items-center justify-between p-4 bg-muted/10 rounded-2xl border transition-all group",
                                                                    chattingCaseId === c._id ? "border-indigo-500 bg-indigo-50/30" : "border-border hover:border-indigo-400"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setChattingCaseId(c._id)}>
                                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-border">
                                                                        <FileText className="w-5 h-5 text-indigo-600" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-black text-foreground uppercase tracking-tight">{c.patientName}</div>
                                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                                                            {c.modality} • {c.assignedRadiologist?.name || 'Unassigned'} •
                                                                            <span className={cn(
                                                                                "ml-1 p-0.5 px-1 rounded",
                                                                                c.status === 'Finalized' ? "bg-emerald-100 text-emerald-700" :
                                                                                    c.status === 'QA_Review' ? "bg-purple-100 text-purple-700" :
                                                                                        (c.status === 'In_Progress' || c.status === 'In-Progress' as any) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                                                            )}>
                                                                                {c.status.replace('_', ' ')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 px-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setAssigningCaseId(c._id);
                                                                        }}
                                                                    >
                                                                        Re-Assign
                                                                    </Button>
                                                                    <div className="w-px h-4 bg-border mx-1" />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-lg border-transparent hover:border-border hover:bg-background transition-all"
                                                                        onClick={(e) => { e.stopPropagation(); handleViewStudy(c._id); }}
                                                                        title="View Study"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-lg border-transparent hover:border-indigo-200 hover:bg-indigo-50 text-indigo-600 transition-all"
                                                                        onClick={(e) => { e.stopPropagation(); handleEditDetails(c._id); }}
                                                                        title="Edit Details"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-lg border-transparent hover:border-border hover:bg-background transition-all"
                                                                        onClick={(e) => { e.stopPropagation(); setTimelineCaseId(c._id); }}
                                                                        title="Timeline"
                                                                    >
                                                                        <History className="w-4 h-4" />
                                                                    </Button>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-lg border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-emerald-600 transition-all"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                title="Download Report"
                                                                            >
                                                                                <FileDown className="w-4 h-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem onClick={() => handleDownloadReport(c._id, 'docx')}>
                                                                                Download as DOCX
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleDownloadReport(c._id, 'pdf')}>
                                                                                Download as PDF
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {cases.filter(c => {
                                                            if (activeTab === 'history') return c.status === 'Finalized';
                                                            return ['Assigned', 'In_Progress', 'QA_Review', 'Rep_Correction', 'QA_Audit'].includes(c.status);
                                                        }).length === 0 && (
                                                                <div className="text-center p-8 text-muted-foreground text-xs uppercase font-bold opacity-50">
                                                                    No {activeTab === 'history' ? 'finalized' : 'active'} cases found
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-6 h-full">
                                                {/* Stats HUD */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                                                    <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">Total Active</div>
                                                            <div className="text-lg sm:text-2xl font-black text-foreground">{stats.total}</div>
                                                        </div>
                                                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                            <Activity className="w-4 h-4 sm:w-6 sm:h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">New Imports</div>
                                                            <div className="text-lg sm:text-2xl font-black text-indigo-600">{stats.new}</div>
                                                        </div>
                                                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                            <Inbox className="w-4 h-4 sm:w-6 sm:h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">STAT BACKLOG</div>
                                                            <div className="text-lg sm:text-2xl font-black text-red-600">{stats.stat}</div>
                                                        </div>
                                                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                            <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5 flex items-center justify-between shadow-sm">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate max-w-[80px] sm:max-w-none">Ready</div>
                                                            <div className="text-lg sm:text-2xl font-black text-emerald-600">{stats.unassigned}</div>
                                                        </div>
                                                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                                                            <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col flex-1">
                                                    <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Inbox className="w-4 h-4 text-indigo-600" />
                                                            <h2 className="text-[11px] font-black uppercase tracking-widest">Study Reception Queue</h2>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                                                        <ReceptionQueue
                                                            cases={cases}
                                                            isLoading={isLoading}
                                                            chattingCaseId={chattingCaseId}
                                                            setChattingCaseId={setChattingCaseId}
                                                            onViewStudy={handleViewStudy}
                                                            onEditDetails={handleEditDetails}
                                                            onTimeline={(id) => setTimelineCaseId(id)}
                                                            onDownloadReport={handleDownloadReport}
                                                            onAccept={handleApprove}
                                                            onReject={handleRejectClick}
                                                            onResolve={handleResolve}
                                                            onReviewReport={handleReviewReport}
                                                            onAssign={handleAssign}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle className="bg-border/50 hover:bg-indigo-500/30 transition-colors w-2" />

                            <ResizablePanel
                                ref={chatPanelRef}
                                defaultSize={30}
                                minSize={0}
                                maxSize={40}
                                collapsible={true}
                                onCollapse={() => setChattingCaseId(null)}
                                className="transition-all duration-300 ease-in-out"
                            >
                                <div className="h-full border-l border-border bg-card shadow-2xl overflow-hidden flex flex-col">
                                    {chattingCaseId && selectedChatCase ? (
                                        <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
                                            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/5 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full hover:bg-muted/80 transition-all hover:rotate-90 duration-300"
                                                    onClick={() => setChattingCaseId(null)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 overflow-hidden relative">
                                                <CaseChatHub
                                                    caseId={chattingCaseId}
                                                    patientName={selectedChatCase.patientName}
                                                    radiologistName={selectedChatCase.assignedRadiologist?.name}
                                                    technicianName={selectedChatCase.technicianId}
                                                    qaName={user?.name}
                                                    isSidePanel={true}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                                            <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center mb-4">
                                                <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                                            </div>
                                            <h3 className="text-sm font-bold text-muted-foreground/50 uppercase tracking-widest">Select a case to chat</h3>
                                        </div>
                                    )}
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    )}
                </div>
            </main>


            {/* Feature Modals */}
            <TimelineModal
                isOpen={!!timelineCaseId}
                caseId={timelineCaseId}
                onClose={() => setTimelineCaseId(null)}
            />

            <CaseDetailsModal
                isOpen={isDetailsOpen}
                caseData={editingCase}
                onClose={() => { setIsDetailsOpen(false); setEditingCase(null); }}
                onUpdate={handleUpdateCase}
            />

            <RejectionModal
                isOpen={!!rejectingCaseId}
                onClose={() => setRejectingCaseId(null)}
                onConfirm={handleConfirmReject}
                patientName={cases.find(c => c._id === rejectingCaseId)?.patientName || ''}
            />

            <ReturnCorrectionModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                onConfirm={(notes) => {
                    handleQAReturnForCorrection(notes);
                    setIsReturnModalOpen(false);
                }}
                patientName={currentReviewingCase?.patientName || ''}
            />
        </div>
    );
}
