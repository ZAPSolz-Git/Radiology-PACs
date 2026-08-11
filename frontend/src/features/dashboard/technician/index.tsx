import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Settings,
  User as UserIcon,
  LogOut,
  LayoutGrid,
  Activity,
  RefreshCw,
  X,
  MessageSquare,
  History,
  Files,
  UserMinus,
  AlertTriangle,
  ShieldAlert,
  ArrowDown,
} from "lucide-react";
import { StudyTable } from "../../technician/components/StudyTable";
import { StudyFilterBar } from "../../technician/components/StudyFilterBar";
import { CaseCreationModal } from "../../technician/components/CaseCreationModal";
import { CaseChatHub } from "../../qa/components/communication/CaseChatHub";
import { CaseDetailsModal } from "../../technician/components/CaseDetailsModal";
import { NotificationCenter } from "../../technician/components/NotificationCenter";
import { ConfirmationModal } from "../../technician/components/ConfirmationModal";
import { TimelineModal } from "@/components/timeline/TimelineModal";
import {
  Case,
  CasePriority,
  ReportStatus,
} from "../../technician/types/technician";
import { CaseService } from "../../technician/services/CaseService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SyncStatusBadge } from "../../technician/components/SyncStatusBadge";
import { useOfflineSync } from "../../technician/hooks/useOfflineSync";
import { PacsSettings } from "../../technician/components/PacsSettings";
import { BackgroundTasksWidget } from "@/components/common/BackgroundTasksWidget";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { endOfDay, isWithinInterval, startOfDay, subDays } from "date-fns";
import { useSocketContext } from "@/contexts/SocketContext";

type DateRangeFilter = "all" | "today" | "yesterday" | "last7";
type ViewMode = "list" | "grid";
type StatusFilter = "all" | ReportStatus;
type UrgencyFilter = "all" | CasePriority;
type ModalityFilter = "all" | "CT" | "MRI" | "X-Ray" | "US";

export default function TechnicianDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  useOfflineSync(); // Enable background sync orchestration
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChatCaseId, setActiveChatCaseId] = useState<string | null>(null);
  const [viewingCaseId, setViewingCaseId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [timelineCaseId, setTimelineCaseId] = useState<string | null>(null);
  const [isPacsModalOpen, setIsPacsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<
    "active" | "finalized"
  >(() => (searchParams.get("tab") as any) || "active");

  const setActiveTab = (tab: "active" | "finalized") => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] =
    useState<DateRangeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [caseToDelete, setCaseToDelete] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studyProgress, setStudyProgress] = useState<Record<string, { received: number, total: number | null }>>({});

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const selectedChatCase = useMemo(
    () => cases.find((c) => c._id === activeChatCaseId),
    [cases, activeChatCaseId],
  );

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await CaseService.getCases();
      setCases(data);
    } catch (err) {
      toast.error("Failed to fetch study queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    if (activeChatCaseId) {
      chatPanelRef.current?.expand();
    } else {
      chatPanelRef.current?.collapse();
    }
  }, [activeChatCaseId]);

  // Socket Listeners for data refresh
  const { socket } = useSocketContext();
  useEffect(() => {
    if (!socket) return;

    const handleIngested = (data: { studyInstanceUID: string }) => {
      // Immediately refresh list to show real data when a study is successfully ingested
      fetchCases();
    };

    socket.on('study:ingested', handleIngested);

    return () => {
      socket.off('study:ingested', handleIngested);
    };
  }, [fetchCases]);

  const stats = useMemo(() => {
    return {
      total: cases.length,
      unassigned: cases.filter((c) => c.status === "Uploaded").length,
      slaRisk: cases.filter(
        (c) => c.tatRemainingSeconds > 0 && c.tatRemainingSeconds < 1800,
      ).length,
      rejected: cases.filter((c) => c.status === "Rejected").length,
    };
  }, [cases]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setModalityFilter("all");
    setDateRangeFilter("today");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setViewMode("list");
  };

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const base =
      activeTab === "active"
        ? cases.filter((c) => c.status !== "Finalized")
        : cases.filter((c) => c.status === "Finalized");

    return base.filter((c) => {
      const caseDate = new Date(c.studyDate);
      const now = new Date();
      const todayStart = startOfDay(now);

      const matchesDate =
        dateRangeFilter === "all"
          ? true
          : dateRangeFilter === "today"
            ? isWithinInterval(caseDate, {
              start: todayStart,
              end: endOfDay(now),
            })
            : dateRangeFilter === "yesterday"
              ? isWithinInterval(caseDate, {
                start: subDays(todayStart, 1),
                end: endOfDay(subDays(now, 1)),
              })
              : isWithinInterval(caseDate, {
                start: subDays(todayStart, 6),
                end: endOfDay(now),
              });

      const matchesModality =
        modalityFilter === "all" || c.modality === modalityFilter;
      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;
      const matchesUrgency =
        urgencyFilter === "all" || c.urgency === urgencyFilter;
      const matchesSearch =
        query.length === 0 ||
        c.patientName.toLowerCase().includes(query) ||
        c.patientId?.toLowerCase().includes(query) ||
        c.accessionNumber?.toLowerCase().includes(query) ||
        c._id.toLowerCase().includes(query);

      return (
        matchesDate &&
        matchesModality &&
        matchesStatus &&
        matchesUrgency &&
        matchesSearch
      );
    });
  }, [
    activeTab,
    cases,
    dateRangeFilter,
    modalityFilter,
    searchQuery,
    statusFilter,
    urgencyFilter,
  ]);

  const handleViewImage = async (id: string) => {
    // Open OHIF Viewer with the DICOM Study Instance UID
    const caseData = cases.find(c => c._id === id);
    if (caseData?.studyInstanceUID) {
      window.open(`${import.meta.env.VITE_OHIF_URL || 'http://localhost:3000'}/basic?StudyInstanceUIDs=${caseData.studyInstanceUID}`, '_blank');
    } else {
      toast.error("Study Instance UID not found for this case");
    }
  };

  const handleEditCase = (study: Case) => {
    setEditingCase(study);
    setIsCreateModalOpen(true);
  };

  const handleOpenChat = (id: string) => {
    setActiveChatCaseId(activeChatCaseId === id ? null : id);
  };

  const handleOpenTimeline = (id: string) => {
    setTimelineCaseId(id);
  };

  const handleUpdateCase = async (updatedCase: Case) => {
    try {
      await CaseService.updateCase(updatedCase._id, updatedCase);
      setCases((prev) =>
        prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
      );
      toast.success("Case updated successfully");
    } catch (err) {
      toast.error("Failed to update case");
    }
  };

  const handleCreateCase = (result: any) => {
    setIsCreateModalOpen(false);
    handleResetFilters(); // Clear all filters (search, date, etc.) to ensure the new case is visible
    fetchCases(); // Refresh list
  };

  const handleEnrich = (caseData: Case) => {
    // Close creation modal, then re-open in edit mode with the received case
    setEditingCase(caseData);
    setIsCreateModalOpen(true);
  };

  const handleDeleteCase = async (id: string) => {
    setCaseToDelete({ isOpen: true, id });
  };

  const confirmDeleteCase = async () => {
    if (!caseToDelete.id) return;
    try {
      await CaseService.deleteCase(caseToDelete.id);
      toast.success("Case study deleted successfully");
      fetchCases();
      setCaseToDelete({ isOpen: false, id: null }); // B3: close modal after deletion
    } catch (err: any) {
      console.error("Failed to delete case:", err);
      const errorMessage = err?.response?.data?.message || "Failed to delete case";
      if (err?.response?.status === 403) {
        toast.error(errorMessage, {
          duration: 6000,
          description: "This case is protected due to financial audit requirements.",
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleResolveCase = async (id: string) => {
    try {
      await CaseService.resolveRejection(id);
      toast.success("Case resolved. Radiologist can now review it again.");
      fetchCases(); // Refresh list to see updated status
    } catch (err) {
      console.error("Failed to resolve case:", err);
      toast.error("Failed to mark case as fixed");
    }
  };

  return (
    <div className="h-screen bg-muted/30 flex overflow-hidden">
      {/* Navigation Sidebar (Mini) */}
      <aside className="fixed left-0 top-0 z-30 w-14 sm:w-16 h-screen bg-background border-r border-border flex flex-col items-center py-5 sm:py-6 gap-6 sm:gap-8">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg sm:text-xl">
          R
        </div>
        <nav className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 bg-muted text-primary rounded-xl"
          >
            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground transition-colors rounded-xl"
            onClick={() => setIsPacsModalOpen(true)}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-red-500 rounded-xl"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-14 sm:ml-16 flex-1 min-w-0 h-screen flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
        {/* Dashboard Header */}
        <header className="min-h-16 py-3 sm:py-0 sm:h-[70px] bg-background/95 border-b border-border px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20">
          <div className="w-full sm:w-auto flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate uppercase">
                Technician Dashboard
              </h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-[0.16em]">
                Ingestion & Orchestration
              </p>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="scale-90 sm:scale-100 origin-center flex items-center">
                <NotificationCenter />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchCases}
                className={cn(
                  "h-9 w-9 rounded-xl border-border/70 bg-background",
                  isLoading && "animate-spin",
                )}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <div className="scale-90 sm:scale-100 origin-center flex items-center">
                <BackgroundTasksWidget />
              </div>
            </div>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 px-3 sm:px-4 h-9 rounded-xl bg-foreground hover:bg-foreground/90 text-background border-0 font-semibold text-[10px] uppercase tracking-[0.1em]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Case Study</span>
              <span className="sm:hidden">New Case</span>
            </Button>

            <div className="hidden sm:block h-7 w-px bg-border mx-1 sm:mx-2" />
            <div className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-1">
              <div className="text-right hidden sm:block md:block">
                <div className="text-sm font-medium leading-tight">
                  {user?.name}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                  {user?.role}
                </div>
              </div>
              <div className="w-9 h-9 bg-muted border border-border rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 custom-scrollbar scroll-smooth">
          {isMobile ? (
            /* Mobile: Show either table OR chat full-screen */
            activeChatCaseId && selectedChatCase ? (
              <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
                <div className="h-16 px-6 border-b border-border flex items-center gap-3 bg-muted/5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-muted/80 transition-all"
                    onClick={() => setActiveChatCaseId(null)}
                  >
                    <ArrowDown className="w-4 h-4 rotate-90" />
                  </Button>
                  <span className="text-sm font-semibold">Back to Cases</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CaseChatHub
                    caseId={activeChatCaseId}
                    patientName={selectedChatCase.patientName}
                    radiologistName={
                      selectedChatCase.assignedRadiologist?.name
                    }
                    technicianName={user?.name}
                    qaName={
                      selectedChatCase.qaDetails?.name || "QA Department"
                    }
                    isSidePanel={true}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto pt-6 pb-8 pr-1 sm:pr-6 custom-scrollbar">
                <div className="flex gap-6 h-full flex-col">
                  {/* Left Side: Stats and Table */}
                  <div className="w-full flex transition-all duration-500 ease-in-out flex-col gap-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-1">
                      {[
                        {
                          label: "Total Queue",
                          value: stats.total,
                          accent: null,
                          textColor: "text-slate-600",
                          icon: Files,
                          chip: "All Studies",
                          iconBg: "bg-slate-100",
                          iconColor: "text-slate-600",
                        },
                        {
                          label: "Unassigned",
                          value: stats.unassigned,
                          accent: "border-l-indigo-500",
                          textColor: "text-indigo-500",
                          icon: UserMinus,
                          chip: "Needs Assignment",
                          iconBg: "bg-indigo-100",
                          iconColor: "text-indigo-600",
                        },
                        {
                          label: "Urgent (SLA)",
                          value: stats.slaRisk,
                          accent: "border-l-red-500",
                          textColor: "text-red-500",
                          icon: AlertTriangle,
                          chip: "Action Soon",
                          iconBg: "bg-red-100",
                          iconColor: "text-red-600",
                        },
                        {
                          label: "QC Rejections",
                          value: stats.rejected,
                          accent: "border-l-orange-500",
                          textColor: "text-orange-500",
                          icon: ShieldAlert,
                          chip: "Needs Fix",
                          iconBg: "bg-orange-100",
                          iconColor: "text-orange-600",
                        },
                      ].map(
                        (
                          {
                            label,
                            value,
                            accent,
                            textColor,
                            icon: Icon,
                            chip,
                            iconBg,
                            iconColor,
                          },
                          i,
                        ) => (
                          <div
                            key={label}
                            style={{ animationDelay: `${i * 60}ms` }}
                            className={`
              group relative overflow-hidden bg-background/95 p-3.5 sm:p-5 rounded-2xl border border-border shadow-sm
              animate-in fade-in slide-in-from-bottom-2 duration-300
              hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 hover:border-border/80 transition-all ease-out
              ${accent ? `border-l-[3px] ${accent}` : ""}
            `}
                          >
                            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/0 via-white/0 to-foreground/[0.03]" />
                            <div className="flex items-start justify-between gap-2 sm:gap-3">
                              <div className="min-w-0">
                                <div
                                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] mb-1 sm:mb-2 ${textColor} truncate max-w-[80px] sm:max-w-none`}
                                >
                                  {label}
                                </div>
                                <div className="text-xl sm:text-[32px] leading-none font-bold text-foreground tabular-nums">
                                  {value}
                                </div>
                                <div className="hidden sm:inline-flex mt-3 items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                  {label === "Urgent (SLA)" && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                  )}
                                  {chip}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "mt-0 sm:mt-0.5 h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 shrink-0",
                                  iconBg,
                                )}
                              >
                                <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", iconColor)} />
                              </div>
                            </div>
                            <div
                              className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full rounded-b-2xl transition-all duration-300 ease-out opacity-30 ${accent ? accent.replace("border-l-", "bg-") : "bg-foreground"}`}
                            />
                          </div>
                        ),
                      )}

                      <div
                        style={{ animationDelay: `240ms` }}
                        className="bg-background/95 p-5 rounded-2xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-md hover:-translate-y-0.5 transition-all ease-out flex items-start"
                      >
                        <SyncStatusBadge />
                      </div>
                    </div>

                    <StudyFilterBar
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      modality={modalityFilter}
                      onModalityChange={setModalityFilter}
                      dateRange={dateRangeFilter}
                      onDateRangeChange={setDateRangeFilter}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      urgencyFilter={urgencyFilter}
                      onUrgencyFilterChange={setUrgencyFilter}
                      onResetFilters={handleResetFilters}
                    />

                    {/* Tab Switcher */}
                    <div className="flex w-full sm:w-fit bg-muted/20 p-1 rounded-xl border border-border/70 mt-1 sm:mt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("active")}
                        className={cn(
                          "flex-1 sm:flex-none h-9 px-2 sm:px-5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] transition-all",
                          activeTab === "active"
                            ? "bg-background text-indigo-600 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                        )}
                      >
                        <Activity className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                        <span className="truncate">Active<span className="hidden sm:inline"> Cases</span></span>
                        <span
                          className={cn(
                            "ml-1.5 sm:ml-2 h-4 px-1.5 text-[8px] rounded-md border-none flex-shrink-0 flex items-center justify-center",
                            activeTab === "active"
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {cases.filter((c) => c.status !== "Finalized").length}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("finalized")}
                        className={cn(
                          "flex-1 sm:flex-none h-9 px-2 sm:px-5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] transition-all",
                          activeTab === "finalized"
                            ? "bg-background text-emerald-600 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                        )}
                      >
                        <History className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                        <span className="truncate">Finalized<span className="hidden sm:inline"> Cases</span></span>
                        <span
                          className={cn(
                            "ml-1.5 sm:ml-2 h-4 px-1.5 text-[8px] rounded-md border-none flex-shrink-0 flex items-center justify-center",
                            activeTab === "finalized"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {cases.filter((c) => c.status === "Finalized").length}
                        </span>
                      </Button>
                    </div>

                    <div className="space-y-4 mt-5 h-full flex flex-col">
                      <div className="flex items-center justify-between shrink-0">
                        <h2 className="text-lg font-semibold uppercase tracking-tight flex items-center gap-2">
                          <Activity className="w-5 h-5 text-indigo-600" />
                          {activeTab === "active"
                            ? "Active Study Pipeline"
                            : "Finalized Records"}
                        </h2>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] bg-muted px-2.5 py-1 rounded-md border border-border/70">
                          Total:{" "}
                          {filteredCases.length}{" "}
                          Studies
                        </span>
                      </div>
                      <div className="flex-1">
                        <StudyTable
                          cases={filteredCases}
                          viewMode={viewMode}
                          onViewImage={handleViewImage}
                          onOpenChat={handleOpenChat}
                          onOpenTimeline={handleOpenTimeline}
                          onDelete={handleDeleteCase}
                          onEdit={handleEditCase}
                          onResolve={handleResolveCase}
                          activeChatCaseId={activeChatCaseId}
                          studyProgress={studyProgress}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Desktop: Show ResizablePanelGroup with both panels */
            <ResizablePanelGroup direction="horizontal" className="h-full items-stretch">
              <ResizablePanel defaultSize={70} minSize={60}>
                <div className="h-full overflow-y-auto pt-6 pb-8 pr-1 sm:pr-6 custom-scrollbar">
                  <div className="flex gap-6 h-full flex-col">
                    {/* Left Side: Stats and Table */}
                    <div className="w-full flex transition-all duration-500 ease-in-out flex-col gap-6">
                      {/* Stats Overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-1">
                        {[
                          {
                            label: "Total Queue",
                            value: stats.total,
                            accent: null,
                            textColor: "text-slate-600",
                            icon: Files,
                            chip: "All Studies",
                            iconBg: "bg-slate-100",
                            iconColor: "text-slate-600",
                          },
                          {
                            label: "Unassigned",
                            value: stats.unassigned,
                            accent: "border-l-indigo-500",
                            textColor: "text-indigo-500",
                            icon: UserMinus,
                            chip: "Needs Assignment",
                            iconBg: "bg-indigo-100",
                            iconColor: "text-indigo-600",
                          },
                          {
                            label: "Urgent (SLA)",
                            value: stats.slaRisk,
                            accent: "border-l-red-500",
                            textColor: "text-red-500",
                            icon: AlertTriangle,
                            chip: "Action Soon",
                            iconBg: "bg-red-100",
                            iconColor: "text-red-600",
                          },
                          {
                            label: "QC Rejections",
                            value: stats.rejected,
                            accent: "border-l-orange-500",
                            textColor: "text-orange-500",
                            icon: ShieldAlert,
                            chip: "Needs Fix",
                            iconBg: "bg-orange-100",
                            iconColor: "text-orange-600",
                          },
                        ].map(
                          (
                            {
                              label,
                              value,
                              accent,
                              textColor,
                              icon: Icon,
                              chip,
                              iconBg,
                              iconColor,
                            },
                            i,
                          ) => (
                            <div
                              key={label}
                              style={{ animationDelay: `${i * 60}ms` }}
                              className={`
              group relative overflow-hidden bg-background/95 p-3.5 sm:p-5 rounded-2xl border border-border shadow-sm
              animate-in fade-in slide-in-from-bottom-2 duration-300
              hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 hover:border-border/80 transition-all ease-out
              ${accent ? `border-l-[3px] ${accent}` : ""}
            `}
                            >
                              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/0 via-white/0 to-foreground/[0.03]" />
                              <div className="flex items-start justify-between gap-2 sm:gap-3">
                                <div className="min-w-0">
                                  <div
                                    className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] mb-1 sm:mb-2 ${textColor} truncate max-w-[80px] sm:max-w-none`}
                                  >
                                    {label}
                                  </div>
                                  <div className="text-xl sm:text-[32px] leading-none font-bold text-foreground tabular-nums">
                                    {value}
                                  </div>
                                  <div className="hidden sm:inline-flex mt-3 items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                    {label === "Urgent (SLA)" && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                    {chip}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "mt-0 sm:mt-0.5 h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 shrink-0",
                                    iconBg,
                                  )}
                                >
                                  <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", iconColor)} />
                                </div>
                              </div>
                              <div
                                className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full rounded-b-2xl transition-all duration-300 ease-out opacity-30 ${accent ? accent.replace("border-l-", "bg-") : "bg-foreground"}`}
                              />
                            </div>
                          ),
                        )}

                        <div
                          style={{ animationDelay: `240ms` }}
                          className="bg-background/95 p-5 rounded-2xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-md hover:-translate-y-0.5 transition-all ease-out flex items-start"
                        >
                          <SyncStatusBadge />
                        </div>
                      </div>

                      <StudyFilterBar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        modality={modalityFilter}
                        onModalityChange={setModalityFilter}
                        dateRange={dateRangeFilter}
                        onDateRangeChange={setDateRangeFilter}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        urgencyFilter={urgencyFilter}
                        onUrgencyFilterChange={setUrgencyFilter}
                        onResetFilters={handleResetFilters}
                      />

                      {/* Tab Switcher */}
                      <div className="flex w-full sm:w-fit bg-muted/20 p-1 rounded-xl border border-border/70 mt-1 sm:mt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("active")}
                          className={cn(
                            "flex-1 sm:flex-none h-9 px-2 sm:px-5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] transition-all",
                            activeTab === "active"
                              ? "bg-background text-indigo-600 shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                          )}
                        >
                          <Activity className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                          <span className="truncate">Active<span className="hidden sm:inline"> Cases</span></span>
                          <span
                            className={cn(
                              "ml-1.5 sm:ml-2 h-4 px-1.5 text-[8px] rounded-md border-none flex-shrink-0 flex items-center justify-center",
                              activeTab === "active"
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {cases.filter((c) => c.status !== "Finalized").length}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("finalized")}
                          className={cn(
                            "flex-1 sm:flex-none h-9 px-2 sm:px-5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] transition-all",
                            activeTab === "finalized"
                              ? "bg-background text-emerald-600 shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                          )}
                        >
                          <History className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                          <span className="truncate">Finalized<span className="hidden sm:inline"> Cases</span></span>
                          <span
                            className={cn(
                              "ml-1.5 sm:ml-2 h-4 px-1.5 text-[8px] rounded-md border-none flex-shrink-0 flex items-center justify-center",
                              activeTab === "finalized"
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {cases.filter((c) => c.status === "Finalized").length}
                          </span>
                        </Button>
                      </div>

                      <div className="space-y-4 mt-5 h-full flex flex-col">
                        <div className="flex items-center justify-between shrink-0">
                          <h2 className="text-lg font-semibold uppercase tracking-tight flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            {activeTab === "active"
                              ? "Active Study Pipeline"
                              : "Finalized Records"}
                          </h2>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] bg-muted px-2.5 py-1 rounded-md border border-border/70">
                            Total:{" "}
                            {filteredCases.length}{" "}
                            Studies
                          </span>
                        </div>
                        <div className="flex-1">
                          <StudyTable
                            cases={filteredCases}
                            viewMode={viewMode}
                            onViewImage={handleViewImage}
                            onOpenChat={handleOpenChat}
                            onOpenTimeline={handleOpenTimeline}
                            onDelete={handleDeleteCase}
                            onEdit={handleEditCase}
                            onResolve={handleResolveCase}
                            activeChatCaseId={activeChatCaseId}
                            studyProgress={studyProgress}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-border/50 hover:bg-indigo-500/30 transition-colors w-2" />

              {/* Chat Sidebar Panel */}
              <ResizablePanel
                ref={chatPanelRef}
                defaultSize={isMobile ? 60 : 30}
                minSize={0}
                maxSize={isMobile ? 100 : 40}
                collapsible={true}
                onCollapse={() => setActiveChatCaseId(null)}
                className="transition-all duration-300 ease-in-out"
              >
                <div className="h-full border-l border-border bg-card shadow-2xl overflow-hidden flex flex-col">
                  {activeChatCaseId && selectedChatCase ? (
                    <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
                      <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/5 shrink-0">

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-muted/80 transition-all"
                          onClick={() => setActiveChatCaseId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-hidden relative">
                        <CaseChatHub
                          caseId={activeChatCaseId}
                          patientName={selectedChatCase.patientName}
                          radiologistName={
                            selectedChatCase.assignedRadiologist?.name
                          }
                          technicianName={user?.name}
                          qaName={
                            selectedChatCase.qaDetails?.name || "QA Department"
                          }
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

      <CaseCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCase(null);
        }}
        onSubmit={handleCreateCase}
        editCase={editingCase}
        onEnrich={handleEnrich}
      />

      <CaseDetailsModal
        isOpen={!!viewingCaseId}
        caseData={cases.find((c) => c._id === viewingCaseId) || null}
        onClose={() => setViewingCaseId(null)}
        onUpdate={handleUpdateCase}
      />

      <TimelineModal
        caseId={timelineCaseId}
        isOpen={!!timelineCaseId}
        onClose={() => setTimelineCaseId(null)}
      />

      <Dialog open={isPacsModalOpen} onOpenChange={setIsPacsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              System Configuration
            </DialogTitle>
          </DialogHeader>
          <PacsSettings />
        </DialogContent>
      </Dialog>
      <ConfirmationModal
        isOpen={caseToDelete.isOpen}
        onOpenChange={(open) => setCaseToDelete(prev => ({ ...prev, isOpen: open }))}
        title="Delete Case Study?"
        description="Are you sure you want to permanently delete this case and all associated files? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteCase}
      />
    </div >
  );
}
