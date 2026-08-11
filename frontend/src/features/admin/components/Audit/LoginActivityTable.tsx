import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, Clock, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginActivityTable() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchActivity();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, searchQuery]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            const response = await AdminService.getLoginActivity({
                page,
                limit: 10,
                search: searchQuery || undefined
            });
            setActivities(response.logs || []);
            setTotalPages(response.pagination?.totalPages || 1);
            setTotalLogs(response.pagination?.totalLogs || 0);
        } catch (err) {
            console.error("Failed to fetch login activity:", err);
            toast.error("Failed to fetch login activity");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (totalLogs === 0) return;

        const toastId = toast.loading("Preparing full session export...");
        try {
            const response = await AdminService.getLoginActivity({
                limit: Math.min(totalLogs, 5000),
                search: searchQuery || undefined
            });

            const allActivities = response.logs || [];

            const escape = (val: any) => {
                if (val === null || val === undefined) return "";
                const str = String(val);
                return `"${str.replace(/"/g, '""')}"`;
            };

            const headers = ["Auth Timestamp", "User", "Role", "IP Address", "Device Agent", "Status"];
            const csvRows = [
                headers.join(","),
                ...allActivities.map(act => [
                    // Force Excel to treat as text literal to avoid ####### issues
                    `"=""${act.timestamp ? format(new Date(act.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}"""`,
                    escape(act.userName || act.user?.name || 'Unknown'),
                    escape(act.role || act.user?.role || 'Guest'),
                    escape(act.ipAddress || 'Internal'),
                    escape(act.userAgent || 'System Process'),
                    escape(act.status)
                ].join(","))
            ];

            const csvContent = csvRows.join("\n");
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `login_activity_full_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Exported ${allActivities.length} session records`, { id: toastId });
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to export full session records", { id: toastId });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 bg-background p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search sessions (user, IP, browser)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-muted/30 border-none rounded-xl"
                    />
                </div>
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
            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden min-h-[300px]">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 px-6">Auth Timestamp</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">User Identifier</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">IP Address</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Device Agent</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right px-6">Result</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5} className="h-16 animate-pulse bg-muted/10"></TableCell>
                                </TableRow>
                            ))
                        ) : activities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-[200px] text-center text-muted-foreground font-medium uppercase tracking-widest text-xs">
                                    No recent login activity
                                </TableCell>
                            </TableRow>
                        ) : activities.map((act) => (
                            <TableRow key={act._id} className="hover:bg-muted/50 transition-colors group">
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {act.timestamp ? format(new Date(act.timestamp), 'MMM dd, HH:mm:ss') : 'N/A'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-foreground text-sm">{act.userName || act.user?.name || 'Unknown'}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{act.role || act.user?.role || 'Guest'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-mono font-medium text-muted-foreground">{act.ipAddress || 'Internal'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                        {act.userAgent?.includes('Mobi') ? <Smartphone className="w-3.5 h-3.5 text-muted-foreground" /> : <Monitor className="w-3.5 h-3.5 text-muted-foreground" />}
                                        <span className="text-[10px] text-muted-foreground truncate font-medium" title={act.userAgent}>
                                            {act.userAgent || 'System Process'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-4 px-6">
                                    {act.status === 'Success' ? (
                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 gap-1 text-[10px] font-bold uppercase tracking-widest">
                                            <ShieldCheck className="w-3 h-3" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100 gap-1 text-[10px] font-bold uppercase tracking-widest">
                                            <ShieldAlert className="w-3 h-3" />
                                            Blocked
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                    Showing {activities.length} of {totalLogs} entries
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
        </div>
    );
}
