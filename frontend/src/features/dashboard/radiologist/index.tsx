import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import {
    Activity,
    LogOut,
    User as UserIcon,
    RefreshCw,
    Cpu,
    Grid3X3,
    BarChart3,
    History,
    X,
    MessageSquare,
    ChevronLeft,
    Wallet
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorklist } from '../../radiologist/hooks/useWorklist';
import { WorklistTable } from '../../radiologist/components/WorklistTable';
import { WorklistFilters } from '../../radiologist/components/WorklistFilters';
import { ProductivityStats } from '../../radiologist/components/ProductivityStats';
import { RejectionModal } from '../../radiologist/components/RejectionModal';
import { ReportingEditor } from '../../radiologist/components/ReportingEditor';
import { PerformanceAnalytics } from '../../radiologist/components/PerformanceAnalytics';
import { EarningsHistory } from '../../radiologist/components/EarningsHistory';
import { RadiologistService } from '../../radiologist/services/RadiologistService';
import { NotificationCenter } from '../../technician/components/NotificationCenter';
import { CaseChatHub } from '../../qa/components/communication/CaseChatHub';
import { RadiologistCaseDetailsModal } from '../../radiologist/components/RadiologistCaseDetailsModal';
import { TimelineModal } from '@/components/timeline/TimelineModal';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { type ImperativePanelHandle } from "react-resizable-panels";

export default function RadiologistDashboard() {
    const { user, logout } = useAuthStore();
    const {
        cases,
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
        refresh
    } = useWorklist();

    const [rejectionCaseId, setRejectionCaseId] = useState<string | null>(null);
    const [reportingCaseId, setReportingCaseId] = useState<string | null>(null);
    const [viewingCaseDetailsId, setViewingCaseDetailsId] = useState<string | null>(null);
    const [timelineCaseId, setTimelineCaseId] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeView, setActiveViewState] = useState<'worklist' | 'analytics' | 'earnings'>(
        () => (searchParams.get('view') as any) || 'worklist'
    );
    const [activeTab, setActiveTabState] = useState<'active' | 'history'>(
        () => (searchParams.get('tab') as any) || 'active'
    );

    const setActiveView = (view: 'worklist' | 'analytics' | 'earnings') => {
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
    const [chattingCaseId, setChattingCaseId] = useState<string | null>(null);

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

    const handleViewCase = (id: string) => {
        // For Phase 2, we open the reporting editor.
        // In Phase 3, we will link this to the DICOM viewer.
        setReportingCaseId(id);
    };

    const handleViewStudy = useCallback((id: string) => {
        // Open OHIF Viewer with the DICOM Study Instance UID
        const caseData = cases.find(c => c._id === id);
        if (caseData?.studyInstanceUID) {
            window.open(`${import.meta.env.VITE_OHIF_URL || 'http://localhost:3000'}/basic?StudyInstanceUIDs=${caseData.studyInstanceUID}`, '_blank');
        }
    }, [cases]);

    const handleOpenCaseDetails = useCallback((id: string) => {
        setViewingCaseDetailsId(id);
    }, []);

    const handleOpenTimeline = useCallback((id: string) => {
        setTimelineCaseId(id);
    }, []);

    const handleSaveReport = async (report: any) => {
        try {
            await RadiologistService.saveDraft(reportingCaseId!, report);
            toast.success("Progress saved successfully.");
            refresh(); // Sync worklist so that 'Resume' shows latest data immediately
        } catch (err) {
            toast.error("Failed to save progress");
        }
    };

    const handleFinalizeReport = async (report: any) => {
        try {
            await RadiologistService.submitReport(reportingCaseId!, report);
            toast.success("Report finalized and submitted to QA.");
            setReportingCaseId(null);
            refresh(); // Refresh worklist to reflect status change
        } catch (err) {
            toast.error("Failed to finalize report");
        }
    };

    const handleConfirmReject = (reasonId: string, comment: string) => {
        if (rejectionCaseId) {
            handleReject(rejectionCaseId, reasonId, comment);
            setRejectionCaseId(null);
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            {/* Left Micro-Sidebar (Role Consistent) */}
            <aside className="fixed left-0 top-0 z-30 w-14 sm:w-16 h-screen border-r border-border bg-card/50 flex flex-col items-center py-8 flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-indigo-600/20">
                    <Activity className="w-6 h-6 text-white" />
                </div>

                <nav className="flex flex-col gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView('worklist')}
                        className={cn("h-10 w-10 rounded-xl", activeView === 'worklist' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
                    >
                        <Grid3X3 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView('analytics')}
                        className={cn("h-10 w-10 rounded-xl", activeView === 'analytics' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
                    >
                        <BarChart3 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView('earnings')}
                        className={cn("h-10 w-10 rounded-xl", activeView === 'earnings' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
                    >
                        <Wallet className="w-5 h-5" />
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
                <header className="h-16 bg-background/95 border-b border-border px-4 sm:px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Diagnostic Worklist</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Radiologist Professional Station</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationCenter />

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={refresh}
                            className={cn("h-10 w-10 rounded-xl", isLoading && "animate-spin")}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>

                        <div className="h-8 w-px bg-border mx-2" />

                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-black leading-tight">{user?.name}</div>
                                <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">Radiologist</div>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Cpu className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 relative flex flex-col min-h-0">
                    <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="h-full items-stretch">
                        <ResizablePanel defaultSize={70} minSize={60}>
                            <div className={cn(
                                "h-full flex flex-col min-h-0",
                                !reportingCaseId && "overflow-y-auto custom-scrollbar px-4 sm:px-8 py-8"
                            )}>
                                <div className={cn(
                                    "w-full flex-1 flex flex-col min-h-0",
                                    reportingCaseId && "p-0 pt-2 pb-0 sm:px-2"
                                )}>
                                    {reportingCaseId ? (
                                        <div className="flex-1 flex gap-6 animate-in fade-in slide-in-from-bottom-4 min-h-0">
                                            <div className="flex-1 flex flex-col space-y-2 min-h-0">
                                                <div className="flex items-center justify-between flex-shrink-0 px-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setReportingCaseId(null)}
                                                        className="gap-2 text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                        Back to Worklist
                                                    </Button>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black italic text-indigo-900 border-b-2 border-indigo-100">
                                                            Patient: {cases.find(c => c._id === reportingCaseId)?.patientName}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-h-0 relative">
                                                    <div className="absolute inset-0">
                                                        <ReportingEditor
                                                            caseData={cases.find(c => c._id === reportingCaseId)!}
                                                            onSave={handleSaveReport}
                                                            onFinalize={handleFinalizeReport}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        activeView === 'analytics' ? (
                                            <PerformanceAnalytics />
                                        ) : activeView === 'earnings' ? (
                                            <EarningsHistory />
                                        ) : (
                                            <div className="flex flex-col gap-6 h-full">
                                                <ProductivityStats stats={stats} />
                                                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-2xl w-fit">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setActiveTab('active')}
                                                        className={cn(
                                                            "h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            activeTab === 'active'
                                                                ? "bg-white text-indigo-600 shadow-sm"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                                        )}
                                                    >
                                                        <Activity className="w-3.5 h-3.5 mr-2" />
                                                        Active Worklist
                                                        <Badge className="ml-2 bg-indigo-100 text-indigo-600 border-none h-4 px-1.5 text-[8px]">
                                                            {cases.filter(c => c.status !== 'Finalized').length}
                                                        </Badge>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setActiveTab('history')}
                                                        className={cn(
                                                            "h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            activeTab === 'history'
                                                                ? "bg-white text-emerald-600 shadow-sm"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                                                        )}
                                                    >
                                                        <History className="w-3.5 h-3.5 mr-2" />
                                                        Completed History
                                                        <Badge className="ml-2 bg-emerald-100 text-emerald-600 border-none h-4 px-1.5 text-[8px]">
                                                            {cases.filter(c => c.status === 'Finalized').length}
                                                        </Badge>
                                                    </Button>
                                                </div>
                                                <div className="space-y-4">
                                                    <WorklistFilters
                                                        onSearchChange={setSearchQuery}
                                                        onModalityChange={setFilterModality}
                                                        onStatusChange={setFilterStatus}
                                                        onUrgencyChange={setFilterUrgency}
                                                        searchQuery={searchQuery}
                                                        filterModality={filterModality}
                                                        filterStatus={filterStatus}
                                                        filterUrgency={filterUrgency}
                                                    />
                                                    <WorklistTable
                                                        cases={cases.filter(c => {
                                                            if (activeTab === 'active') return c.status !== 'Finalized';
                                                            return c.status === 'Finalized';
                                                        })}
                                                        onAccept={handleAccept}
                                                        onReject={(id) => setRejectionCaseId(id)}
                                                        onView={handleViewCase}
                                                        onViewStudy={handleViewStudy}
                                                        onOpenDetails={handleOpenCaseDetails}
                                                        onOpenTimeline={handleOpenTimeline}
                                                        chattingCaseId={chattingCaseId}
                                                        setChattingCaseId={setChattingCaseId}
                                                    />
                                                </div>
                                            </div>
                                        )
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
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Case Chat</div>
                                                    <div className="text-xs font-bold text-foreground truncate max-w-[150px]">{selectedChatCase.patientName}</div>
                                                </div>
                                            </div>
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
                                                radiologistName={selectedChatCase.assignedRadiologist?.name || user?.name || 'Dr. Self'}
                                                technicianName={selectedChatCase.uploadedBy?.name || 'Clinical Site'}
                                                qaName={selectedChatCase.qaVerification?.verifiedBy?.name || 'QA Department'}
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
                </div>
            </main>

            {/* Rejection Modal Logic */}
            <RejectionModal
                isOpen={!!rejectionCaseId}
                onClose={() => setRejectionCaseId(null)}
                onConfirm={handleConfirmReject}
                patientName={cases.find(c => c._id === rejectionCaseId)?.patientName || ''}
            />

            <RadiologistCaseDetailsModal
                isOpen={!!viewingCaseDetailsId}
                caseData={cases.find(c => c._id === viewingCaseDetailsId) || null}
                onClose={() => setViewingCaseDetailsId(null)}
            />

            <TimelineModal
                caseId={timelineCaseId}
                isOpen={!!timelineCaseId}
                onClose={() => setTimelineCaseId(null)}
            />
        </div>
    );
}
