import { useState, useEffect } from 'react';
import {
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle,
    Download,
    FileText,
    ExternalLink,
    Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { BillingService } from '../../admin/services/BillingService';
import { Invoice } from '../../admin/types/billing';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function BillingView() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMyInvoices = async () => {
            try {
                const data = await BillingService.getMyInvoices();
                setInvoices(data);
            } catch (error) {
                toast.error("Failed to load billing information");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyInvoices();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'partial': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const stats = {
        totalDue: invoices.filter(i => i.status !== 'paid').reduce((acc, curr) => acc + curr.amount, 0),
        totalCases: invoices.reduce((acc, curr) => acc + curr.caseCount, 0),
        pendingInvoices: invoices.filter(i => i.status !== 'paid').length
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-background border border-border rounded-3xl p-6 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <CreditCard className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Outstanding Dues</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-muted-foreground">₹</span>
                        <h4 className="text-3xl font-black text-foreground">{stats.totalDue.toLocaleString()}</h4>
                    </div>
                </div>

                <div className="bg-background border border-border rounded-3xl p-6 shadow-sm group transition-all hover:shadow-md">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Total Cases Processed</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-3xl font-black text-foreground">{stats.totalCases}</h4>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cumulative</span>
                    </div>
                </div>

                <div className="bg-background border border-border rounded-3xl p-6 shadow-sm border-l-4 border-l-amber-500 group transition-all hover:shadow-md">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Unpaid Invoices</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-3xl font-black text-foreground">{stats.pendingInvoices}</h4>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Awaiting Payment</span>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Financial History</h3>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Monthly Invoicing & Records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                placeholder="Search INV#"
                                className="pl-9 pr-4 h-9 bg-muted/30 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none w-48 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-muted/10">
                        <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 px-6">Invoice</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Period</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Volume</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Amount</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Status</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="animate-pulse space-y-3 flex flex-col items-center">
                                        <div className="h-10 w-10 bg-muted rounded-full"></div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Records...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <CreditCard className="w-12 h-12 mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">No financial records found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow key={inv._id} className="hover:bg-muted/30 transition-colors border-border group">
                                    <TableCell className="px-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-indigo-600 font-mono tracking-tighter">{inv.invoiceId}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Generated {format(new Date(inv.createdAt), 'MMM dd, yyyy')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs font-bold uppercase tracking-tight">
                                                {format(new Date(inv.period.year, inv.period.month - 1), 'MMMM yyyy')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black">{inv.caseCount}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Finalized Cases</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-base font-black text-foreground">
                                            ₹{inv.amount.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-black uppercase text-[9px] h-6 px-3 border-none", getStatusColor(inv.status))}>
                                            {inv.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1.5" /> :
                                                inv.status === 'pending' ? <AlertCircle className="w-3 h-3 mr-1.5" /> :
                                                    <CreditCard className="w-3 h-3 mr-1.5" />}
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 bg-background border-border"
                                                onClick={() => BillingService.downloadInvoice(inv._id)}
                                            >
                                                <Download className="w-3 h-3" />
                                                Download PDF
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-indigo-50 text-indigo-600">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>


        </div>
    );
}
