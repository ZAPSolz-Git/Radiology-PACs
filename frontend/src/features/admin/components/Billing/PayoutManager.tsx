import { useState, useEffect } from 'react';
import {
    Download,
    CheckCircle2,
    Clock,
    TrendingUp,
    BadgePercent,
    Wallet,
    ArrowUpRight,
    Loader2,
    Calendar,
    FileImage,
    Layers,
    ListFilter,
    ChevronDown,
    ChevronRight,
    Search,
    IndianRupee,
    SquareCheck,
    Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Payout } from '../../types/billing';
import { BillingService } from '../../services/BillingService';
import { format } from 'date-fns';

export function PayoutManager() {
    const { toast } = useToast();
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [unbilled, setUnbilled] = useState<any[]>([]); // Grouped by radiologist
    const [loading, setLoading] = useState(true);
    const [unbilledLoading, setUnbilledLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    // Tabs state
    const [activeTab, setActiveTab] = useState('history');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Generate Batch Modal
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
    const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
    
    // Pay Modal
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [paying, setPaying] = useState(false);
    
    // Selection state
    const [selectedCases, setSelectedCases] = useState<Record<string, string[]>>({}); // radId -> [caseIds]
    const [generatingSelection, setGeneratingSelection] = useState<string | null>(null); // radId
    const [periodLabel, setPeriodLabel] = useState<Record<string, string>>({}); // radId -> label

    useEffect(() => {
        if (activeTab === 'history') {
            fetchPayouts();
        } else {
            fetchUnbilled();
        }
    }, [activeTab]);

    const fetchUnbilled = async () => {
        try {
            setUnbilledLoading(true);
            const data = await BillingService.getUnbilledCases();
            setUnbilled(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load unbilled cases',
                variant: 'destructive',
            });
        } finally {
            setUnbilledLoading(false);
        }
    };

    const fetchPayouts = async () => {
        try {
            setLoading(true);
            const data = await BillingService.getPayouts();
            setPayouts(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load payouts',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const now = new Date();
            // Defaulting to generating for current month. In a real scenario, you'd pick a month.
            await BillingService.generatePayouts(generateMonth, generateYear);
            toast({
                title: 'Success',
                description: 'Payouts generated successfully',
            });
            fetchPayouts();
            setGenerateModalOpen(false);
        } catch (error: any) {
            toast({
                title: 'Generation Failed',
                description: error.response?.data?.message || 'Failed to generate payouts',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const openPayModal = (payout: Payout) => {
        setSelectedPayout(payout);
        setReceiptFile(null);
        setPayModalOpen(true);
    };

    const handlePay = async () => {
        if (!selectedPayout) return;
        try {
            setPaying(true);
            await BillingService.markPayoutAsPaid(selectedPayout._id, receiptFile || undefined);
            toast({
                title: 'Success',
                description: 'Payout marked as paid',
            });
            setPayModalOpen(false);
            fetchPayouts();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to mark as paid',
                variant: 'destructive',
            });
        } finally {
            setPaying(false);
        }
    };

    const handleDownloadInvoice = async (payoutId: string) => {
        try {
            await BillingService.downloadPayoutInvoice(payoutId);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to download invoice',
                variant: 'destructive',
            });
        }
    };

    const toggleCase = (radId: string, caseId: string) => {
        setSelectedCases(prev => {
            const current = prev[radId] || [];
            if (current.includes(caseId)) {
                return { ...prev, [radId]: current.filter(id => id !== caseId) };
            } else {
                return { ...prev, [radId]: [...current, caseId] };
            }
        });
    };

    const toggleAllForDoctor = (radId: string, caseIds: string[]) => {
        setSelectedCases(prev => {
            const current = prev[radId] || [];
            if (current.length === caseIds.length) {
                return { ...prev, [radId]: [] };
            } else {
                return { ...prev, [radId]: caseIds };
            }
        });
    };

    const generateLabel = (cases: any[]) => {
        if (!cases.length) return '';
        const dates = cases.map(c => new Date(c.studyDate || c.createdAt).getTime());
        const earliest = new Date(Math.min(...dates));
        const latest = new Date(Math.max(...dates));
        return `${format(earliest, 'dd/MM/yyyy')} - ${format(latest, 'dd/MM/yyyy')}`;
    };

    const handleGenerateSelected = async (radId: string) => {
        const cases = selectedCases[radId] || [];
        const label = periodLabel[radId] || generateLabel(unbilled.find(u => u._id === radId)?.cases.filter((c: any) => cases.includes(c._id)) || []);
        
        if (!cases.length) return;

        try {
            setGeneratingSelection(radId);
            await BillingService.generateSelectedPayout(radId, cases, label);
            toast({
                title: 'Payout Generated',
                description: `Successfully created payout for ${cases.length} cases.`,
            });
            // Refresh
            fetchUnbilled();
            fetchPayouts();
            setSelectedCases(prev => ({ ...prev, [radId]: [] }));
        } catch (error: any) {
            toast({
                title: 'Generation Failed',
                description: error.response?.data?.message || 'Failed to generate payout',
                variant: 'destructive',
            });
        } finally {
            setGeneratingSelection(null);
        }
    };

    // Calculate Stats
    const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payouts.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const uniqueDoctors = new Set(payouts.map(p => p.radiologist._id)).size;

    // Paginate Payouts
    const totalPages = Math.ceil(payouts.length / itemsPerPage);
    const paginatedPayouts = payouts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Payouts', value: `₹${totalPayouts.toLocaleString()}`, delta: 'All Time', icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Paid Out', value: `₹${paidAmount.toLocaleString()}`, delta: `${uniqueDoctors} Doctors`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Pending Payout', value: `₹${pendingAmount.toLocaleString()}`, delta: 'Needs Attention', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Total Batches', value: payouts.length, delta: 'Generated', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-background p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                <stat.icon className={cn("w-5 h-5", stat.color)} />
                            </div>
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{stat.delta}</div>
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <h4 className="text-2xl font-black">{stat.value}</h4>
                    </div>
                ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2 text-xs font-bold uppercase tracking-widest">
                            Payout History
                        </TabsTrigger>
                        <TabsTrigger value="unbilled" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2 text-xs font-bold uppercase tracking-widest">
                            Unbilled Revenue
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'history' && (
                        <Button 
                            onClick={() => setGenerateModalOpen(true)}
                            disabled={generating}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 gap-2"
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                            Bulk Monthly Batch
                        </Button>
                    )}
                </div>

                <TabsContent value="history" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight">Physician Earnings</h3>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Processed payout statements and history</p>
                        </div>
                    </div>

                <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Physician</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Period / Generated</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Earnings / Cases</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading payouts...
                                    </TableCell>
                                </TableRow>
                            ) : payouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No payouts generated yet.
                                    </TableCell>
                                </TableRow>
                            ) : paginatedPayouts.map((pay) => (
                                <TableRow key={pay._id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="font-bold text-sm">Dr. {pay.radiologist.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{pay.payoutId}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {pay.period}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(pay.createdAt), 'dd MMM yyyy')}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-black text-foreground">₹{pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{pay.caseCount} Studies</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-black uppercase text-[9px] px-2.5 h-6 border-none",
                                            pay.status === 'Paid' ? "bg-emerald-50 text-emerald-700" :
                                                "bg-amber-50 text-amber-700"
                                        )}>
                                            {pay.status}
                                        </Badge>
                                        {pay.paidAt && (
                                           <div className="text-[9px] text-muted-foreground mt-1">On: {format(new Date(pay.paidAt), 'dd/MM/yy')}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                onClick={() => openPayModal(pay)}
                                                variant="secondary" size="sm" className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {pay.status === 'Paid' ? 'Add Receipt' : 'Mark Paid'}
                                            </Button>
                                            <Button 
                                                onClick={() => handleDownloadInvoice(pay._id)}
                                                variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest gap-1 text-indigo-600 hover:bg-indigo-50">
                                                <Download className="w-3 h-3" />
                                                Invoice
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                </TabsContent>

                <TabsContent value="unbilled" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight">Unbilled Revenue</h3>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Select finalized cases to bundle into a payout statement</p>
                        </div>
                    </div>

                    {unbilledLoading ? (
                        <div className="flex items-center justify-center py-20 bg-background rounded-2xl border border-dashed border-border">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aggregating pending cases...</p>
                            </div>
                        </div>
                    ) : unbilled.length === 0 ? (
                        <div className="flex items-center justify-center py-20 bg-background rounded-2xl border border-dashed border-border">
                            <div className="text-center max-w-md">
                                <div className="p-4 bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                    <BadgePercent className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h4 className="text-sm font-bold uppercase tracking-tight">No Unbilled Cases Found</h4>
                                <p className="text-xs text-muted-foreground mt-2">All finalized cases have been assigned to payouts. New cases will appear here as soon as they are finalized by radiologists.</p>
                            </div>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="space-y-4">
                            {unbilled.map((group) => {
                                const docId = group._id;
                                const doctor = group.radiologist;
                                const casesIds = group.cases.map((c: any) => c._id);
                                const selected = selectedCases[docId] || [];
                                const isAllSelected = selected.length === group.cases.length;
                                const selectedAmount = group.cases
                                    .filter((c: any) => selected.includes(c._id))
                                    .reduce((sum: number, c: any) => sum + (c.billingInfo?.radiologistEarning || 0), 0);
                                
                                return (
                                    <AccordionItem key={docId} value={docId} className="border border-border bg-background rounded-2xl overflow-hidden px-6 transition-all data-[state=open]:shadow-md">
                                        <AccordionTrigger className="hover:no-underline py-6">
                                            <div className="flex items-center justify-between w-full pr-4 text-left">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">
                                                        {doctor.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-sm uppercase">Dr. {doctor.name}</div>
                                                        <div className="text-[10px] text-muted-foreground font-medium">{group.caseCount} Pending Studies</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-black text-indigo-600">₹{group.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Unbilled</div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-6">
                                            <div className="space-y-6 pt-4 border-t border-border">
                                                {/* Sticky Header for Group */}
                                                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox 
                                                                checked={isAllSelected}
                                                                onCheckedChange={() => toggleAllForDoctor(docId, casesIds)}
                                                            />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Select All</span>
                                                        </div>
                                                        <div className="h-4 w-px bg-border mx-2" />
                                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                            {selected.length} of {group.cases.length} Selected
                                                        </div>
                                                    </div>

                                                    {selected.length > 0 && (
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-xs font-black text-emerald-600">₹{selectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                                <div className="text-[8px] text-muted-foreground uppercase font-black">Selection Total</div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Input 
                                                                    placeholder="Period Label"
                                                                    value={periodLabel[docId] || ''}
                                                                    onChange={(e) => setPeriodLabel(p => ({...p, [docId]: e.target.value}))}
                                                                    className="h-8 text-[10px] w-40 bg-background"
                                                                />
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => handleGenerateSelected(docId)}
                                                                    disabled={generatingSelection === docId}
                                                                    className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest px-4"
                                                                >
                                                                    {generatingSelection === docId ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                                                                    Generate Statement
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border border-border rounded-xl overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-muted/30">
                                                            <TableRow>
                                                                <TableHead className="w-12 py-3 px-4"></TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Patient / Study</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-center">Modality</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-3 text-right">Earning</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {group.cases.map((kase: any) => (
                                                                <TableRow key={kase._id} className="hover:bg-muted/20 transition-colors">
                                                                    <TableCell className="py-3 px-4">
                                                                        <Checkbox 
                                                                            checked={selected.includes(kase._id)}
                                                                            onCheckedChange={() => toggleCase(docId, kase._id)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="py-3">
                                                                        <div className="text-xs font-bold">{kase.patientName}</div>
                                                                        <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                                            <Calendar className="w-2.5 h-2.5" />
                                                                            {format(new Date(kase.studyDate), 'dd MMM yyyy')} | {kase.bodyPart}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-3 text-center">
                                                                        <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0 h-5 bg-indigo-50 text-indigo-700 border-none">
                                                                            {kase.modality}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="py-3 text-right font-black text-xs">
                                                                        ₹{kase.billingInfo?.radiologistEarning?.toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </TabsContent>
            </Tabs>

            {/* Payment Modal */}
            <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Payout</DialogTitle>
                        <DialogDescription>
                            Confirm payment for Dr. {selectedPayout?.radiologist.name} for the period {selectedPayout?.period}.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Total Payable Amount</span>
                                <span className="text-xl font-black text-emerald-600">₹{selectedPayout?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Cases Included</span>
                                <span className="font-bold">{selectedPayout?.caseCount}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedPayout?.attachments && selectedPayout.attachments.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Existing Receipts</Label>
                                    <div className="space-y-2">
                                        {selectedPayout.attachments.map((att, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileImage className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="text-xs font-medium truncate">{att.name || `Receipt ${idx + 1}`}</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground px-2 whitespace-nowrap">
                                                    {format(new Date(att.uploadedAt), 'dd MMM yyyy')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="receipt">Upload New Receipt / Proof</Label>
                                <Input 
                                    id="receipt" 
                                    type="file" 
                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer file:bg-muted file:border-0 file:rounded-lg file:font-semibold file:text-indigo-600 file:mr-4 file:px-4 file:py-1 hover:file:bg-indigo-50"
                                />
                                <p className="text-[10px] text-muted-foreground">You can upload a screenshot of the bank transfer, PDF receipt, or any image proof. You can add multiple receipts over time.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handlePay} 
                            disabled={paying || (selectedPayout?.status === 'Paid' && !receiptFile)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold"
                        >
                            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {selectedPayout?.status === 'Paid' ? 'Upload Additional Receipt' : 'Confirm Payment & Mark Paid'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Batch Modal */}
            <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Monthly Batch</DialogTitle>
                        <DialogDescription>
                            Select the month and year to aggregate finalized cases into payout statements. Only unbilled cases completed within this specific month will be included.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <select 
                                value={generateMonth}
                                onChange={(e) => setGenerateMonth(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Year</Label>
                            <select 
                                value={generateYear}
                                onChange={(e) => setGenerateYear(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handleGenerate} 
                            disabled={generating}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                        >
                            {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                            Generate Batch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
