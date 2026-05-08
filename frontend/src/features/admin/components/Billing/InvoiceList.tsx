import { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    Filter,
    CreditCard,
    DollarSign,
    MoreVertical,
    RefreshCw,
    Loader2
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Invoice } from '../../types/billing';
import { BillingService } from '../../services/BillingService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';

export function InvoiceList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Manage Details Modal State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const fetchInvoices = async () => {
        try {
            setIsLoading(true);
            const data = await BillingService.getInvoices();
            setInvoices(data);
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
            toast.error('Failed to load invoices');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleGenerateRun = async () => {
        // For now, generate for current month. In production, add a picker.
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        try {
            setIsGenerating(true);
            const data = await BillingService.generateInvoices(month, year);
            if (data.length === 0) {
                toast.info('No new finalized cases to bill for this period');
            } else {
                toast.success(`Generated ${data.length} new invoices`);
                fetchInvoices();
            }
        } catch (err) {
            console.error('Failed to generate invoices:', err);
            toast.error('Failed to generate monthly invoice run');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'pending' ? 'paid' : 'pending';
        try {
            await BillingService.updateInvoiceStatus(id, nextStatus);
            toast.success(`Invoice marked as ${nextStatus}`);
            fetchInvoices();
        } catch (err) {
            console.error('Failed to update status:', err);
            toast.error('Failed to update invoice status');
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.institutionName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        receivable: invoices.reduce((acc, inv) => inv.status !== 'paid' ? acc + inv.amount : acc, 0),
        totalCases: invoices.reduce((acc, inv) => acc + inv.caseCount, 0),
        paidCount: invoices.filter(inv => inv.status === 'paid').length,
        pendingCount: invoices.filter(inv => inv.status !== 'paid').length
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 bg-background p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search Invoices (ID, Hospital)..."
                        className="pl-10 h-10 bg-muted/30 border-none rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl"
                        onClick={fetchInvoices}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button
                        onClick={handleGenerateRun}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 gap-2"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Generate Monthly Run
                    </Button>
                </div>
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Loading Invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                        <FileText className="w-12 h-12 text-muted-foreground opacity-20" />
                        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">No invoices found</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Invoice ID</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Hospital / Client</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Total Amount</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Period</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Payment Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.map((inv) => (
                                <TableRow key={inv._id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-black text-indigo-600 font-mono">{inv.invoiceId}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-sm">{inv.institutionName}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{inv.caseCount} Cumulative Cases</div>
                                    </TableCell>
                                    <TableCell className="font-black text-foreground text-lg">₹{inv.amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <div className="text-xs font-medium">{format(new Date(inv.period.year, inv.period.month - 1), 'MMMM yyyy')}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                "font-black uppercase text-[9px] px-3 h-6 border-none cursor-pointer hover:opacity-80 transition-opacity",
                                                inv.status === 'paid' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                            )}
                                            onClick={() => handleUpdateStatus(inv._id, inv.status)}
                                        >
                                            {inv.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1.5" /> : <Clock className="w-3 h-3 mr-1.5" />}
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 rounded-lg font-bold text-[9px] uppercase tracking-widest gap-1 border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                                                onClick={() => BillingService.downloadInvoice(inv._id)}
                                            >
                                                <Download className="w-3 h-3" />
                                                PDF
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-3 rounded-lg font-bold text-[9px] uppercase tracking-widest gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                onClick={() => {
                                                    setSelectedInvoiceId(inv._id);
                                                    setIsDetailsModalOpen(true);
                                                }}
                                            >
                                                <FileText className="w-3 h-3" />
                                                View Details
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-background border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Accounts Receivable</p>
                        <h4 className="text-2xl font-black text-red-600">₹{stats.receivable.toLocaleString()}</h4>
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-background border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm border-l-4 border-l-indigo-500">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cumulative Cases Billed</p>
                        <h4 className="text-2xl font-black">{stats.totalCases}</h4>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-background border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Payment Status (Pending/Total)</p>
                        <h4 className="text-2xl font-black">{stats.pendingCount} / {invoices.length}</h4>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <InvoiceDetailsModal 
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedInvoiceId(null);
                }}
                invoiceId={selectedInvoiceId}
            />
        </div>
    );
}
