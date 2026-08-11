import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Eye, ShieldAlert, AlertTriangle, Info, CheckCircle2, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { AdminService, AuditLogItem, PaginatedResponse } from '../../services/AdminService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export function AuditLogTable() {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [page, searchQuery]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await AdminService.getSecurityLogs({
                page,
                limit: 10,
                search: searchQuery || undefined
            });
            setLogs(response.logs || []);
            setTotalPages(response.pagination?.totalPages || 1);
            setTotalLogs(response.pagination?.totalLogs || 0);
        } catch (err) {
            toast.error("Failed to fetch audit logs");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (totalLogs === 0) return;

        const toastId = toast.loading("Preparing full audit trail export...");
        try {
            const response = await AdminService.getSecurityLogs({
                limit: Math.min(totalLogs, 5000),
                search: searchQuery || undefined
            });

            const allLogs = response.logs || [];

            const escape = (val: any) => {
                if (val === null || val === undefined) return "";
                const str = String(val);
                return `"${str.replace(/"/g, '""')}"`;
            };

            const headers = ["Timestamp", "Category", "Action", "Actor", "IP", "Status", "Details"];
            const csvRows = [
                headers.join(","),
                ...allLogs.map(log => [
                    // Force Excel to treat as text literal to avoid ####### issues
                    `"=""${log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}"""`,
                    escape(log.category),
                    escape(log.action),
                    escape(log.userName || log.user?.name || "System"),
                    escape(log.ipAddress || "N/A"),
                    escape(log.status),
                    escape(log.details)
                ].join(","))
            ];

            const csvContent = csvRows.join("\n");
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `audit_trail_full_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Exported ${allLogs.length} audit entries`, { id: toastId });
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to export full audit trail", { id: toastId });
        }
    };

    const getCategoryBadge = (cat: string) => {
        const styles: Record<string, string> = {
            AUTH: "bg-indigo-50 text-indigo-600 border-indigo-100",
            USER_MGMT: "bg-blue-50 text-blue-600 border-blue-100",
            CASE_WORKFLOW: "bg-emerald-50 text-emerald-600 border-emerald-100",
            SECURITY_CONFIG: "bg-red-50 text-red-600 border-red-100",
            DATA_ACCESS: "bg-amber-50 text-amber-600 border-amber-100",
            FINANCIAL: "bg-purple-50 text-purple-600 border-purple-100",
            SYSTEM: "bg-muted text-muted-foreground border-border"
        };
        return <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest", styles[cat])}>{cat}</Badge>;
    };

    const getStatusIcon = (status: string, severity: string) => {
        if (severity === 'Critical' || status === 'Critical') return <ShieldAlert className="w-4 h-4 text-red-600" />;
        if (status === 'Failure') return <AlertTriangle className="w-4 h-4 text-amber-600" />;
        if (status === 'Success') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
        return <Info className="w-4 h-4 text-blue-600" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 bg-background p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search system actions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-muted/30 border-none rounded-xl"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="h-10 px-4 rounded-xl gap-2 font-bold uppercase text-[9px] tracking-widest text-indigo-600 border-indigo-100 bg-indigo-50/80"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Event</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Category</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Actor</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Resource</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Severity</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6} className="h-16 animate-pulse bg-muted/10"></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-[300px] text-center text-muted-foreground font-medium uppercase tracking-widest text-xs">
                                    No audit entries found
                                </TableCell>
                            </TableRow>
                        ) : logs.map((log) => (
                            <TableRow key={log._id} className="hover:bg-muted/50 transition-colors group">
                                <TableCell>
                                    <div className="flex gap-3 items-center">
                                        <div className="p-2 rounded-lg bg-muted group-hover:bg-background transition-colors">
                                            {getStatusIcon(log.status, log.severity)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm tracking-tight">{log.action}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium">{format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{getCategoryBadge(log.category)}</TableCell>
                                <TableCell>
                                    <div className="text-sm font-bold">{log.userName || log.user?.name || "System"}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{log.ipAddress || 'IP: internally'}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs font-semibold">{log.resourceType || 'N/A'}</div>
                                    <div className="text-[9px] text-muted-foreground font-mono truncate max-w-[100px]">{log.resourceId || '-'}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={cn("text-[8px] font-black uppercase tracking-tighter px-2",
                                            log.severity === 'Critical' ? "bg-red-600 text-white border-red-600" :
                                                log.severity === 'High' ? "bg-red-50 text-red-600 border-red-100" :
                                                    log.severity === 'Medium' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        "bg-blue-50 text-blue-600 border-blue-100"
                                        )}
                                    >
                                        {log.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[10px] text-muted-foreground font-medium max-w-[150px] truncate">{log.details}</span>
                                        {log.diff && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLog(log);
                                                    setIsDiffModalOpen(true);
                                                }}
                                                className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                    Showing {logs.length} of {totalLogs} entries
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 w-8 p-0 rounded-lg"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center px-4 bg-muted/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {page} / {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 w-8 p-0 rounded-lg"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Data Diff Viewer Modal */}
            <Dialog open={isDiffModalOpen} onOpenChange={setIsDiffModalOpen}>
                <DialogContent className="max-w-2xl bg-background border-border rounded-3xl overflow-hidden p-0 shadow-2xl">
                    <DialogHeader className="p-8 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-3 mb-1">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            <DialogTitle className="text-lg font-bold uppercase tracking-tight">Audit Event Explorer</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            {selectedLog?.action} • {selectedLog && format(new Date(selectedLog.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="p-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-2">State Before</h4>
                            <ScrollArea className="h-[300px] w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap">
                                    {selectedLog?.diff?.before ? JSON.stringify(selectedLog.diff.before, null, 2) : "No changes recorded"}
                                </pre>
                            </ScrollArea>
                        </div>
                        <div className="p-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-2">State After</h4>
                            <ScrollArea className="h-[300px] w-full bg-indigo-50/30 rounded-xl p-4 border border-indigo-100">
                                <pre className="text-[10px] font-mono text-indigo-900 whitespace-pre-wrap">
                                    {selectedLog?.diff?.after ? JSON.stringify(selectedLog.diff.after, null, 2) : "No changes recorded"}
                                </pre>
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center">
                        <div className="flex gap-4">
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Actor</div>
                                <div className="text-xs font-bold">{selectedLog?.userName || selectedLog?.user?.name || "System"}</div>
                            </div>
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">IP Address</div>
                                <div className="text-xs font-mono">{selectedLog?.ipAddress || 'Internal'}</div>
                            </div>
                        </div>
                        <Button onClick={() => setIsDiffModalOpen(false)} className="bg-foreground text-background h-10 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest">
                            Close Viewer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
