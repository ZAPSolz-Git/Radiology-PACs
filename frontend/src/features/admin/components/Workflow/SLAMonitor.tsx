import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Clock,
    Search,
    Filter,
    AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SLAMetrics } from '../../types/workflow';
import { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { format } from 'date-fns';

export function SLAMonitor() {
    const [slaData, setSlaData] = useState<SLAMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSLA();
        const interval = setInterval(fetchSLA, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchSLA = async () => {
        try {
            const data = await AdminService.getSLAMetrics();
            setSlaData(data);
        } catch (err) {
            console.error("Failed to fetch SLA data:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = slaData.filter(d =>
        d.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const breachCount = slaData.filter(d => d.status === 'breached').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 bg-background p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search cases by ID or patient..."
                        className="pl-10 h-10 bg-muted/30 border-none rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl gap-2 font-bold uppercase text-[9px] tracking-widest outline-none ring-0">
                        <Filter className="w-3.5 h-3.5" />
                        Live Filter
                    </Button>
                    {breachCount > 0 && (
                        <Badge className="bg-red-50 text-red-600 border-red-100 flex gap-2 h-10 px-4 items-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="font-black uppercase text-[9px] tracking-widest">{breachCount} Breaches Detected</span>
                        </Badge>
                    )}
                </div>
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 px-6">Case Details</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Workflow</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Integrity</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Wait Time</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right px-6">SLA Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5} className="h-16 animate-pulse bg-muted/5"></TableCell>
                                </TableRow>
                            ))
                        ) : filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-[300px] text-center text-muted-foreground font-black uppercase tracking-widest text-xs">
                                    No cases matching criteria
                                </TableCell>
                            </TableRow>
                        ) : filteredData.map((caseItem) => (
                            <TableRow key={caseItem.id} className="hover:bg-muted/50 transition-colors group">
                                <TableCell className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="font-bold flex items-center gap-2">
                                            <span className="font-mono text-xs text-indigo-600">{caseItem.caseId}</span>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[8px] font-black h-4 px-1",
                                                caseItem.priority === 'emergency' ? "border-red-200 bg-red-50 text-red-700" :
                                                    caseItem.priority === 'urgent' ? "border-amber-200 bg-amber-50 text-amber-700" :
                                                        "border-blue-200 bg-blue-50 text-blue-700"
                                            )}>
                                                {caseItem.priority}
                                            </Badge>
                                        </div>
                                        <div className="font-semibold text-sm">{caseItem.patientName}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{caseItem.modality} Scan</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <Badge variant="secondary" className="w-fit text-[9px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-700 border-indigo-100">
                                            {caseItem.workflowStatus.replace('_', ' ')}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-medium italic">
                                            {caseItem.assignedTo}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                caseItem.integrityStatus === 'Pass' ? "bg-emerald-500" :
                                                    caseItem.integrityStatus === 'Warning' ? "bg-amber-500" : "bg-red-500"
                                            )} />
                                            <span className="text-[10px] font-black">{caseItem.integrityScore}% Health</span>
                                        </div>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                            {caseItem.integrityStatus}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        <div className="text-xs font-medium text-muted-foreground">
                                            {format(new Date(caseItem.uploadedAt), 'HH:mm')}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex items-center justify-end gap-3">
                                        <div className="text-right">
                                            <div className={cn(
                                                "text-xs font-black",
                                                caseItem.status === 'warning' ? "text-amber-500" :
                                                    caseItem.status === 'breached' ? "text-red-500 font-bold" :
                                                        "text-emerald-500"
                                            )}>
                                                {caseItem.remainingTime < 0 ? `Late: ${Math.abs(caseItem.remainingTime)}m` : `Ends in ${caseItem.remainingTime}m`}
                                            </div>
                                            <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        caseItem.status === 'warning' ? "bg-amber-500" :
                                                            caseItem.status === 'breached' ? "bg-red-500" :
                                                                "bg-emerald-500"
                                                    )}
                                                    style={{ width: `${Math.max(5, Math.min(100, (caseItem.remainingTime / 60) * 100))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
