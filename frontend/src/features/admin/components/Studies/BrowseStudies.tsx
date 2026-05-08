import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Settings,
  User as UserIcon,
  RefreshCw,
  X,
  MessageSquare,
  History,
  Files,
  UserMinus,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Database,
  LayoutGrid,
  HardDrive
} from "lucide-react";
import { StudyTable } from "../../../technician/components/StudyTable";
import { StudyFilterBar } from "../../../technician/components/StudyFilterBar";
import { CaseCreationModal } from "../../../technician/components/CaseCreationModal";
import { CaseChatHub } from "../../../qa/components/communication/CaseChatHub";
import { CaseDetailsModal } from "../../../technician/components/CaseDetailsModal";
import { AssignRadiologistModal } from "../../../technician/components/AssignRadiologistModal";
import { TimelineModal } from "@/components/timeline/TimelineModal";
import {
  Case,
  CasePriority,
  ReportStatus,
} from "../../../technician/types/technician";
import { CaseService } from "../../../technician/services/CaseService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { endOfDay, isWithinInterval, startOfDay, subDays } from "date-fns";
import { StorageManager } from "./StorageManager";

type DateRangeFilter = "all" | "today" | "yesterday" | "last7";
type ViewMode = "list" | "grid";
type StatusFilter = "all" | ReportStatus;
type UrgencyFilter = "all" | CasePriority;
type ModalityFilter = "all" | "CT" | "MRI" | "X-Ray" | "US";
type ActiveTab = "studies" | "storage";

export function BrowseStudies() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChatCaseId, setActiveChatCaseId] = useState<string | null>(null);
  const [viewingCaseId, setViewingCaseId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [timelineCaseId, setTimelineCaseId] = useState<string | null>(null);
  const [assigningCaseId, setAssigningCaseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("studies");

  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      toast.error("Failed to fetch global study directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
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
    setDateRangeFilter("all");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setViewMode("list");
  };

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return cases.filter((c) => {
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
    cases,
    dateRangeFilter,
    modalityFilter,
    searchQuery,
    statusFilter,
    urgencyFilter,
  ]);

  const handleViewImage = async (id: string) => {
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

  const handleOpenAssign = (id: string) => {
    setAssigningCaseId(id);
  };

  const handleCreateCase = (result: any) => {
    setIsCreateModalOpen(false);
    fetchCases();
  };

  const handleDeleteCase = async (id: string) => {
    if (!confirm("ADMIN ACTION: Are you sure you want to permanently delete this case?")) return;
    try {
      await CaseService.deleteCase(id);
      toast.success("Case study deleted successfully (Admin Oversight)");
      fetchCases();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete case");
    }
  };

  const handleResolveCase = async (id: string) => {
    try {
      await CaseService.resolveRejection(id);
      toast.success("Case resolved and returned to workflow");
      fetchCases();
    } catch (err) {
      toast.error("Failed to resolve rejection");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Master Study Directory
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
            Unrestricted Administrative Domain
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex items-center bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("studies")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                activeTab === "studies" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Database className="w-3.5 h-3.5 inline mr-1.5" />
              Studies
            </button>
            <button
              onClick={() => setActiveTab("storage")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                activeTab === "storage" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HardDrive className="w-3.5 h-3.5 inline mr-1.5" />
              Storage
            </button>
          </div>

          {activeTab === "studies" && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCases}
              className={cn("gap-2 h-9 rounded-xl border-indigo-100 text-indigo-600 hover:bg-indigo-500")}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh Index
            </Button>
          )}
        </div>
      </div>

      {activeTab === "storage" ? (
        <StorageManager />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Global Studies", value: stats.total, icon: Files, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "New Uploads", value: stats.unassigned, icon: UserMinus, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Urgent/STAT", value: stats.slaRisk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
              { label: "Rejections", value: stats.rejected, icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-50" }
            ].map((stat, i) => (
              <div key={i} className="bg-background border border-border p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                  <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                </div>
              </div>
            ))}
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

          <div className={cn(
            "flex gap-6",
            activeChatCaseId ? "flex-col lg:flex-row" : "flex-col"
          )}>
            <div className={cn(
              "transition-all duration-500",
              activeChatCaseId ? "w-full lg:w-[70%]" : "w-full"
            )}>
              <StudyTable
                cases={filteredCases}
                viewMode={viewMode}
                onViewImage={handleViewImage}
                onOpenChat={handleOpenChat}
                onOpenTimeline={handleOpenTimeline}
                onDelete={handleDeleteCase}
                onEdit={handleEditCase}
                onResolve={handleResolveCase}
                onAssign={handleOpenAssign}
                activeChatCaseId={activeChatCaseId}
                userRole={user?.role}
              />
            </div>

            {activeChatCaseId && selectedChatCase && (
              <div className="w-full lg:w-[30%] h-[600px] lg:h-auto border border-border bg-card rounded-2xl flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-right duration-500">
                <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Admin Oversight</div>
                      <div className="text-xs font-bold text-foreground truncate">{selectedChatCase.patientName}</div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setActiveChatCaseId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden pt-4">
                  <CaseChatHub
                    caseId={activeChatCaseId}
                    patientName={selectedChatCase.patientName}
                    radiologistName={selectedChatCase.assignedRadiologist?.name}
                    technicianName="System Admin"
                    qaName={selectedChatCase.qaDetails?.name || "QA Department"}
                    readonly={user?.role?.toLowerCase() === 'admin'}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <CaseCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCase(null);
        }}
        onSubmit={handleCreateCase}
        editCase={editingCase}
      />

      <TimelineModal
        caseId={timelineCaseId}
        isOpen={!!timelineCaseId}
        onClose={() => setTimelineCaseId(null)}
      />

      <AssignRadiologistModal
        isOpen={!!assigningCaseId}
        caseId={assigningCaseId}
        onClose={() => setAssigningCaseId(null)}
        onAssigned={() => {
          fetchCases();
          setAssigningCaseId(null);
        }}
      />
    </div>
  );
}
