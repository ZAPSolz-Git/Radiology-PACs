import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminService } from "../../services/AdminService";
import { CaseService } from "../../../technician/services/CaseService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    HardDrive,
    Search,
    Trash2,
    RefreshCw,
    Database,
    Files,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    X,
    FileWarning,
    Download
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────
function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

function getStatusColor(status: string) {
    const map: Record<string, string> = {
        Uploaded: "bg-blue-100 text-blue-700",
        QA_Pending: "bg-amber-100 text-amber-700",
        Assigned: "bg-indigo-100 text-indigo-700",
        In_Progress: "bg-violet-100 text-violet-700",
        Finalized: "bg-emerald-100 text-emerald-700",
        Rejected: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-gray-100 text-gray-700";
}

// ─── Types ───────────────────────────────────────────────────
interface StorageStats {
    totalCases: number;
    totalDiskUsage: number;
    totalDicomFiles: number;
    averageCaseSize: number;
    largestCase: { id: string; patientName: string; modality: string; size: number } | null;
    storageByModality: Record<string, number>;
    totalDiskSpace: number;
    freeDiskSpace: number;
}

interface StorageCase {
    _id: string;
    patientName: string;
    patientId: string;
    modality: string;
    studyDate: string;
    status: string;
    institution: string;
    dicomFileCount: number;
    attachmentCount: number;
    diskUsage: number;
}

// ─── Component ───────────────────────────────────────────────
export function StorageManager() {

    // Overview stats
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Case table
    const [cases, setCases] = useState<StorageCase[]>([]);
    const [casesLoading, setCasesLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState("date");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1, limit: 15 });

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState<StorageCase | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteImpact, setDeleteImpact] = useState<any>(null);
    const [impactLoading, setImpactLoading] = useState(false);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const data = await AdminService.getStorageStats();
            setStats(data);
        } catch {
            toast.error("Failed to load storage stats");
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Fetch cases
    const fetchCases = useCallback(async () => {
        setCasesLoading(true);
        try {
            const data = await AdminService.getStorageCases({
                page,
                limit: 15,
                search: debouncedSearch || undefined,
                sortBy,
            });
            setCases(data.cases);
            setPagination(data.pagination);
        } catch {
            toast.error("Failed to load storage cases");
        } finally {
            setCasesLoading(false);
        }
    }, [page, debouncedSearch, sortBy]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchCases(); }, [fetchCases]);

    // Handle export
    const handleExport = (caseItem: StorageCase) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const url = `${baseUrl}/cases/${caseItem._id}/export`;

        toast.info(`Preparing ZIP for "${caseItem.patientName}"...`);
        fetch(url, {
            credentials: 'include'
        })
            .then(res => {
                if (!res.ok) throw new Error('Export failed');
                return res.blob();
            })
            .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                const safeName = caseItem.patientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                a.download = `${safeName}_${caseItem.modality}.zip`;
                a.click();
                URL.revokeObjectURL(a.href);
                toast.success(`Downloaded "${caseItem.patientName}" as ZIP`);
            })
            .catch(() => toast.error('Failed to export case'));
    };

    // Open delete modal & fetch impact preview
    const openDeleteModal = async (c: StorageCase) => {
        setDeleteTarget(c);
        setDeleteConfirmText("");
        setDeleteImpact(null);
        setImpactLoading(true);
        try {
            const impact = await CaseService.getDeleteImpact(c._id);
            setDeleteImpact(impact);
        } catch {
            toast.error("Failed to load deletion impact preview");
        } finally {
            setImpactLoading(false);
        }
    };

    const closeDeleteModal = () => {
        setDeleteTarget(null);
        setDeleteConfirmText("");
        setDeleteImpact(null);
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deleteTarget || deleteConfirmText !== "DELETE") return;
        setIsDeleting(true);
        try {
            await CaseService.deleteCase(deleteTarget._id);
            toast.success(`Case "${deleteTarget.patientName}" and all related data permanently deleted`);
            closeDeleteModal();
            fetchStats();
            fetchCases();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to delete case");
        } finally {
            setIsDeleting(false);
        }
    };

    // Total storage used as percentage of real system disk
    const usagePercent = (stats && stats.totalDiskSpace > 0)
        ? Math.min((stats.totalDiskUsage / stats.totalDiskSpace) * 100, 100)
        : 0;

    const modalityColors: Record<string, string> = {
        CT: "bg-blue-500",
        MRI: "bg-violet-500",
        "X-Ray": "bg-amber-500",
        US: "bg-emerald-500",
        XRAY: "bg-amber-500",
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ─── OVERVIEW CARDS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-background border border-border p-5 rounded-2xl shadow-sm col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <HardDrive className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Disk Usage</div>
                                <div className="text-2xl font-bold tabular-nums">
                                    {statsLoading ? "—" : formatBytes(stats?.totalDiskUsage || 0)}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold">
                            {usagePercent.toFixed(1)}% of {statsLoading ? "—" : formatBytes(stats?.totalDiskSpace || 0)}
                        </div>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-muted-foreground flex justify-between">
                        <span>USED: {statsLoading ? "—" : formatBytes(stats?.totalDiskUsage || 0)}</span>
                        <span>AVAILABLE: {statsLoading ? "—" : formatBytes(stats?.freeDiskSpace || 0)}</span>
                    </div>
                    {stats?.storageByModality && Object.keys(stats.storageByModality).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {Object.entries(stats.storageByModality).map(([mod, size]) => (
                                <span key={mod} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-muted text-foreground">
                                    <span className={cn("w-2 h-2 rounded-full", modalityColors[mod] || "bg-gray-500")} />
                                    {mod}: {formatBytes(size as number)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-background border border-border p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Database className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Cases</div>
                            <div className="text-2xl font-bold tabular-nums">{statsLoading ? "—" : stats?.totalCases || 0}</div>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium mt-1">
                        Avg. {statsLoading ? "—" : formatBytes(stats?.averageCaseSize || 0)}/case
                    </div>
                </div>

                <div className="bg-background border border-border p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Files className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DICOM Files</div>
                            <div className="text-2xl font-bold tabular-nums">{statsLoading ? "—" : (stats?.totalDicomFiles || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    {stats?.largestCase && (
                        <div className="text-xs text-muted-foreground font-medium mt-1">
                            Largest: {stats.largestCase.patientName} ({formatBytes(stats.largestCase.size)})
                        </div>
                    )}
                </div>
            </div>

            {/* ─── SEARCH + SORT CONTROLS ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by patient, ID, institution..."
                        className="pl-9 h-10 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                        <option value="date">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="size">Largest First</option>
                        <option value="name">Name A-Z</option>
                        <option value="modality">Modality</option>
                        <option value="status">Status</option>
                    </select>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => { fetchStats(); fetchCases(); }}>
                        <RefreshCw className={cn("w-4 h-4", (statsLoading || casesLoading) && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* ─── CASE TABLE ─── */}
            <div className="bg-background border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Patient</th>
                                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Modality</th>
                                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hidden md:table-cell">Institution</th>
                                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Status</th>
                                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Files</th>
                                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Disk Size</th>
                                <th className="text-center px-4 py-3 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {casesLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                                        Loading cases...
                                    </td>
                                </tr>
                            ) : cases.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                                        No cases found
                                    </td>
                                </tr>
                            ) : (
                                cases.map((c) => (
                                    <tr key={c._id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-foreground">{c.patientName}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{c.patientId}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-bold">{c.modality}</span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{c.institution || "—"}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold", getStatusColor(c.status))}>
                                                {c.status.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                            <div>{c.dicomFileCount} DICOM</div>
                                            {c.attachmentCount > 0 && <div className="text-xs">{c.attachmentCount} attach.</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                                            {formatBytes(c.diskUsage)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                    onClick={() => handleExport(c)}
                                                    title="Export as ZIP"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg",
                                                        c.status === "Finalized"
                                                            ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                            : "text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    )}
                                                    onClick={() => openDeleteModal(c)}
                                                    title="Delete case permanently"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <div className="text-xs text-muted-foreground font-medium">
                            Showing {Math.min((page - 1) * pagination.limit + 1, pagination.total)} – {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <Button
                                        key={p}
                                        variant={p === page ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-xs"
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </Button>
                                );
                            })}
                            {pagination.pages > 5 && <span className="px-1 text-muted-foreground">…</span>}
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── DELETE IMPACT MODAL ─── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                <FileWarning className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-foreground">Permanent Deletion</h3>
                                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                            </div>
                            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-full" onClick={closeDeleteModal}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Finalized Warning Banner */}
                        {deleteTarget.status === "Finalized" && (
                            <div className="flex items-start gap-2 mb-4 text-sm text-red-800 bg-red-100 border border-red-300 rounded-xl p-3">
                                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                                <div>
                                    <div className="font-bold"> FINALIZED CASE</div>
                                    <div className="text-xs mt-0.5">This case has been medico-legally locked. Deleting it will destroy billing records, payout references, and finalized reports.</div>
                                </div>
                            </div>
                        )}

                        {impactLoading ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                                Analyzing impact...
                            </div>
                        ) : deleteImpact ? (
                            <div className="space-y-3 mb-4">
                                {/* Case Info */}
                                <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Case Details</div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Patient</span><span className="font-bold">{deleteImpact.case.patientName}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Modality</span><span className="font-bold">{deleteImpact.case.modality}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className={cn("font-bold px-2 py-0.5 rounded-md text-xs", getStatusColor(deleteImpact.case.status))}>{deleteImpact.case.status}</span></div>
                                </div>

                                {/* Files to be deleted */}
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">🗂️ Files (Disk)</div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">DICOM Files</span><span className="font-bold text-red-600">{deleteImpact.files.dicomFiles} files</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Attachments</span><span className="font-bold text-red-600">{deleteImpact.files.attachments} files</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Disk Space</span><span className="font-bold text-red-600">{formatBytes(deleteImpact.files.diskUsage)}</span></div>
                                </div>

                                {/* Related Records */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">🗃️ Related Records (Database)</div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Comments</span><span className="font-bold text-red-600">{deleteImpact.relatedRecords.comments}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Chat Messages</span><span className="font-bold text-red-600">{deleteImpact.relatedRecords.messages}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Notifications</span><span className="font-bold text-red-600">{deleteImpact.relatedRecords.notifications}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Timeline Entries</span><span className="font-bold text-red-600">{deleteImpact.relatedRecords.timelineEntries}</span></div>
                                </div>

                                {/* Billing Info */}
                                {deleteImpact.billing && (
                                    <div className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-1.5">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-2">💰 Billing & Financial Data</div>
                                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Revenue</span><span className="font-bold text-red-700">₹{deleteImpact.billing.total?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base Price</span><span className="font-bold">₹{deleteImpact.billing.basePrice?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Radiologist Earning</span><span className="font-bold">₹{deleteImpact.billing.radiologistEarning?.toLocaleString()}</span></div>
                                        {deleteImpact.billing.invoiceId && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Invoice Reference</span><span className="font-bold text-red-600">Will be orphaned</span></div>}
                                        {deleteImpact.billing.payoutId && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payout Reference</span><span className="font-bold text-red-600">Will be orphaned</span></div>}
                                    </div>
                                )}

                                {/* Report */}
                                {deleteImpact.report && (
                                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-1.5">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-2">📄 Report Data</div>
                                        <div className="flex justify-between text-sm"><span className="text-muted-foreground ">Report Status</span><span className="font-bold text-red-600">{deleteImpact.report.status}</span></div>
                                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Version</span><span className="font-bold text-red-600">v{deleteImpact.report.version}</span></div>
                                        {deleteImpact.report.hasDocx && <div className="flex justify-between text-sm"><span className="text-muted-foreground">DOCX Report</span><span className="font-bold text-red-600">Will be deleted</span></div>}
                                        {deleteImpact.report.finalizedAt && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Finalized At</span><span className="font-bold text-red-600">{new Date(deleteImpact.report.finalizedAt).toLocaleDateString()}</span></div>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Patient</span><span className="font-bold">{deleteTarget.patientName}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Disk Size</span><span className="font-bold text-red-600">{formatBytes(deleteTarget.diskUsage)}</span></div>
                            </div>
                        )}

                        <div className="flex items-start gap-2 mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>All data listed above will be <strong>permanently destroyed</strong>. This action is irreversible.</span>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                                Type "DELETE" to confirm
                            </label>
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="rounded-xl font-mono tracking-widest text-center"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={closeDeleteModal}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl gap-2"
                                disabled={deleteConfirmText !== "DELETE" || isDeleting || impactLoading}
                                onClick={handleDelete}
                            >
                                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {isDeleting ? "Deleting..." : "Delete Permanently"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
