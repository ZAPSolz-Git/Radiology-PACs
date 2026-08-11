import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search,
    Filter,
    LayoutGrid,
    List,
    Calendar,
    Activity,
    X
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ReportStatus, CasePriority } from '../types/technician';

type DateRangeFilter = "all" | "today" | "yesterday" | "last7";
type ViewMode = "list" | "grid";
type StatusFilter = "all" | ReportStatus;
type UrgencyFilter = "all" | CasePriority;
type ModalityFilter = "all" | "CT" | "MRI" | "X-Ray" | "US";

interface StudyFilterBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    modality: ModalityFilter;
    onModalityChange: (value: ModalityFilter) => void;
    dateRange: DateRangeFilter;
    onDateRangeChange: (value: DateRangeFilter) => void;
    viewMode: ViewMode;
    onViewModeChange: (value: ViewMode) => void;
    statusFilter: StatusFilter;
    onStatusFilterChange: (value: StatusFilter) => void;
    urgencyFilter: UrgencyFilter;
    onUrgencyFilterChange: (value: UrgencyFilter) => void;
    onResetFilters: () => void;
}

export function StudyFilterBar({
    searchQuery,
    onSearchChange,
    modality,
    onModalityChange,
    dateRange,
    onDateRangeChange,
    viewMode,
    onViewModeChange,
    statusFilter,
    onStatusFilterChange,
    urgencyFilter,
    onUrgencyFilterChange,
    onResetFilters,
}: StudyFilterBarProps) {
    const hasAdvancedFilters = statusFilter !== "all" || urgencyFilter !== "all";
    return (
        <div className="space-y-3">
            <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between">
                <div className="flex flex-wrap sm:flex-nowrap flex-1 items-center gap-2 w-full xl:max-w-2xl">
                    <div className="relative flex-1 w-full min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search patients, ID, or accession..."
                            className="pl-10 h-10 rounded-lg bg-muted/20 border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 truncate text-xs sm:text-sm"
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2 h-10 px-3 sm:px-4 rounded-lg border-border/80 font-semibold text-[11px] shrink-0"
                        onClick={onResetFilters}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Reset</span>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2.5 w-full xl:w-auto">
                    <div className="flex flex-1 sm:flex-none items-center gap-2.5">
                        <Select value={modality} onValueChange={(v) => onModalityChange(v as ModalityFilter)}>
                            <SelectTrigger className="flex-1 sm:w-[130px] sm:flex-none h-10 rounded-lg bg-muted/20 border-border/80 text-[11px] sm:text-[12px] font-medium min-w-[110px]">
                                <Activity className="w-3.5 h-3.5 mr-1.5 sm:mr-2 opacity-60" />
                                <SelectValue placeholder="Modality" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Modalities</SelectItem>
                                <SelectItem value="CT">CT Scan</SelectItem>
                                <SelectItem value="MRI">MRI Scan</SelectItem>
                                <SelectItem value="X-Ray">X-Ray</SelectItem>
                                <SelectItem value="US">Ultrasound</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangeFilter)}>
                            <SelectTrigger className="flex-1 sm:w-[130px] sm:flex-none h-10 rounded-lg bg-muted/20 border-border/80 text-[11px] sm:text-[12px] font-medium min-w-[110px]">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 sm:mr-2 opacity-60" />
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="last7">Last 7 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="hidden sm:block h-8 w-px bg-border mx-0.5" />

                    <div className="flex flex-shrink-0 items-center bg-muted/20 rounded-lg p-1 border border-border/80 w-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewModeChange("list")}
                            className={`h-7.5 w-7.5 rounded-md ${viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewModeChange("grid")}
                            className={`h-7.5 w-7.5 rounded-md ${viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 xl:pt-0 mt-3 xl:mt-0 xl:border-none border-t border-border/40">
                <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
                    <SelectTrigger className="flex-1 sm:w-[170px] sm:flex-none h-9 rounded-lg bg-muted/20 border-border/80 text-[11px] sm:text-[12px] font-medium min-w-[130px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Uploaded">Uploaded</SelectItem>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="In_Progress">In Progress</SelectItem>
                        <SelectItem value="QA_Pending">QA Pending</SelectItem>
                        <SelectItem value="QA_Review">QA Review</SelectItem>
                        <SelectItem value="QA_Audit">QA Audit</SelectItem>
                        <SelectItem value="Rep_Correction">Correction</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Finalized">Finalized</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={urgencyFilter} onValueChange={(v) => onUrgencyFilterChange(v as UrgencyFilter)}>
                    <SelectTrigger className="flex-1 sm:w-[150px] sm:flex-none h-9 rounded-lg bg-muted/20 border-border/80 text-[11px] sm:text-[12px] font-medium min-w-[110px]">
                        <SelectValue placeholder="Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="Routine">Routine</SelectItem>
                        <SelectItem value="STAT">STAT</SelectItem>
                    </SelectContent>
                </Select>

                {hasAdvancedFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-[10px] sm:text-[11px] font-semibold rounded-lg shrink-0 mt-2 sm:mt-0 w-full sm:w-auto justify-center"
                        onClick={onResetFilters}
                    >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Clear Active Filters
                    </Button>
                )}
            </div>
        </div>
    );
}
