import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    ArrowUpRight,
    Calendar,
    Search,
    History,
    Loader2,
    Download,
    CheckCircle2,
    Clock,
    FileImage
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PerformanceService } from '../services/PerformanceService';
import { BillingService } from '../../admin/services/BillingService';
import { toast } from 'sonner';

export function EarningsHistory() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['performance-stats'], // MUST match PerformanceAnalytics key exactly — shares cache
        queryFn: () => PerformanceService.getStats(),
        staleTime: 1000 * 60 * 5,
    });

    const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
        queryKey: ['my-payouts'],
        queryFn: () => BillingService.getMyPayouts(),
        staleTime: 1000 * 60 * 5,
    });

    const isLoading = statsLoading || payoutsLoading;

    // Pagination
    const [payoutsPage, setPayoutsPage] = useState(1);
    const [earningsPage, setEarningsPage] = useState(1);
    const itemsPerPage = 5;

    const handleDownloadInvoice = async (payoutId: string) => {
        try {
            await BillingService.downloadPayoutInvoice(payoutId);
        } catch (error) {
            toast.error('Failed to download invoice');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Auditing Revenue Records...</p>
            </div>
        );
    }

    const earnings = stats?.recentEarnings || [];
    const serverUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

    // Calculate Pagination
    const totalPayoutPages = Math.ceil(payouts.length / itemsPerPage);
    const paginatedPayouts = payouts.slice((payoutsPage - 1) * itemsPerPage, payoutsPage * itemsPerPage);

    const filteredEarnings = earnings; // Could add search filtering here later
    const totalEarningsPages = Math.ceil(filteredEarnings.length / itemsPerPage);
    const paginatedEarnings = filteredEarnings.slice((earningsPage - 1) * itemsPerPage, earningsPage * itemsPerPage);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header section with Stats */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-lg font-black tracking-tight text-foreground uppercase">Revenue Ledger</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Detailed breakdown of clinical payouts</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Unbilled Earning</span>
                        <span className="text-xl font-black text-emerald-700">₹{earnings.reduce((sum, e) => sum + e.total, 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Monthly Payout Statements */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Monthly Payout Statements</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aggregated billing cycles and payment proofs</p>
                </div>
                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b-border">
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 pl-8">Period / Processed</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Amount</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right pr-8">Documents</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-xs font-bold uppercase text-muted-foreground tracking-widest">
                                        No payout statements available yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPayouts.map((pay) => (
                                    <TableRow key={pay._id} className="hover:bg-muted/50 transition-colors group">
                                        <TableCell className="pl-8">
                                            <div className="text-xs font-black text-foreground">{pay.period}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold">
                                                Generated: {format(new Date(pay.createdAt), 'dd MMM yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-black text-indigo-700">₹{pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">{pay.caseCount} Cases</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "font-black uppercase text-[9px] px-2.5 h-6 border-none",
                                                pay.status === 'Paid' ? "bg-emerald-50 text-emerald-700" :
                                                    "bg-amber-50 text-amber-700"
                                            )}>
                                                {pay.status === 'Paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                {pay.status}
                                            </Badge>
                                            {pay.paidAt && (
                                                <div className="text-[9px] text-muted-foreground mt-1 font-bold">On: {format(new Date(pay.paidAt), 'dd/MM/yy')}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {(pay.attachments && pay.attachments.length > 0) ? (
                                                        pay.attachments.map((att, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={`${serverUrl}${att.url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center justify-center h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                                title={att.name}
                                                            >
                                                                <FileImage className="w-3 h-3" />
                                                                Receipt {pay.attachments!.length > 1 ? idx + 1 : ''}
                                                            </a>
                                                        ))
                                                    ) : (pay.status === 'Paid' && pay.attachmentUrl) && (
                                                        <a
                                                            href={`${serverUrl}${pay.attachmentUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                        >
                                                            <FileImage className="w-3 h-3" />
                                                            Receipt
                                                        </a>
                                                    )}

                                                    <Button
                                                        onClick={() => handleDownloadInvoice(pay._id)}
                                                        variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest gap-1 text-indigo-600 hover:bg-indigo-50">
                                                        <Download className="w-3 h-3" />
                                                        Invoice
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {totalPayoutPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Page {payoutsPage} of {totalPayoutPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPayoutsPage(p => Math.max(1, p - 1))}
                                    disabled={payoutsPage === 1}
                                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPayoutsPage(p => Math.min(totalPayoutPages, p + 1))}
                                    disabled={payoutsPage === totalPayoutPages}
                                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Individual Earnings */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search individual cases..."
                            className="pl-10 h-10 bg-muted/30 border-none rounded-xl text-xs font-bold"
                        />
                    </div>
                </div>

                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b-border">
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-5 pl-8">Finalized Date</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-5">Case Info</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-5">Surcharge</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-5 text-right pr-8">Earning Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {earnings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-[300px] text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <History className="w-12 h-12 text-muted-foreground opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No unbilled case activity recorded yet</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedEarnings.map((entry) => (
                                    <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors group border-b-border/50">
                                        <TableCell className="pl-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-foreground">
                                                        {format(new Date(entry.date), 'dd MMM yyyy')}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                                                        {format(new Date(entry.date), 'hh:mm a')}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-foreground transition-colors group-hover:text-indigo-600">
                                                    {entry.patientName}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 h-4 bg-muted/50 border-none">
                                                        {entry.modality}
                                                    </Badge>
                                                    <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[150px]">
                                                        {entry.studyType}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {entry.surcharge > 0 ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase">
                                                    <ArrowUpRight className="w-3 h-3" />
                                                    ₹{entry.surcharge}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-muted-foreground/40">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50/50 group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-700 font-black text-sm">
                                                ₹{entry.total}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {totalEarningsPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Page {earningsPage} of {totalEarningsPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEarningsPage(p => Math.max(1, p - 1))}
                                    disabled={earningsPage === 1}
                                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEarningsPage(p => Math.min(totalEarningsPages, p + 1))}
                                    disabled={earningsPage === totalEarningsPages}
                                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 bg-indigo-900 rounded-3xl text-white relative overflow-hidden group">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Earnings Compliance</h4>
                        <p className="text-sm font-bold max-w-md leading-relaxed text-indigo-50">
                            Earnings are snapshotted at the point of finalization. Monthly payouts are generated automatically and typically processed between the 1st and 5th of every month.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
