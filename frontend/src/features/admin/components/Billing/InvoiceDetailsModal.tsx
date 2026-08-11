import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Hospital, CalendarClock, Download, FileText, AlertCircle } from 'lucide-react';
import { BillingService } from '../../services/BillingService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InvoiceDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string | null;
}

export function InvoiceDetailsModal({ isOpen, onClose, invoiceId }: InvoiceDetailsModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!invoiceId || !isOpen) return;

            setIsLoading(true);
            try {
                const data = await BillingService.getInvoiceDetails(invoiceId);
                setDetails(data);
            } catch (err) {
                console.error("Failed to fetch invoice details:", err);
                toast.error("Could not load invoice breakdown");
                onClose();
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [invoiceId, isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col bg-white">

                {/* Header */}
                <DialogHeader className="p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Hospital className="w-48 h-48" />
                    </div>

                    <div className="relative z-10">
                        <DialogTitle className="text-3xl font-black flex items-center gap-3">
                            <FileText className="w-8 h-8 text-indigo-400" />
                            {details ? details.invoiceId : 'Loading Invoice...'}
                        </DialogTitle>

                        <DialogDescription className="text-indigo-200 text-sm mt-2">
                            Detailed breakdown of studies uploaded by associated technical staff
                        </DialogDescription>

                        {details && (
                            <div className="flex gap-6 mt-6">
                                <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                                    <Hospital className="w-5 h-5 text-indigo-300" />
                                    <div>
                                        <p className="text-xs text-indigo-300">Institution</p>
                                        <p className="font-semibold">{details.institutionName}</p>
                                    </div>
                                </div>

                                <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                                    <CalendarClock className="w-5 h-5 text-emerald-300" />
                                    <div>
                                        <p className="text-xs text-emerald-300">Period</p>
                                        <p className="font-semibold">
                                            {format(new Date(details.period.year, details.period.month - 1), 'MMMM yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-6">

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                            <p className="text-sm text-slate-500">Loading data...</p>
                        </div>
                    ) : details?.technicianBreakdown?.length > 0 ? (

                        <Accordion type="single" collapsible className="space-y-4">

                            {details.technicianBreakdown.map((techGroup: any, index: number) => (

                                <AccordionItem
                                    key={techGroup.technician.id}
                                    value={`item-${index}`}
                                    className="bg-white border border-slate-200 rounded-xl shadow-sm"
                                >

                                    <AccordionTrigger className="px-6 py-4 hover:bg-slate-50">

                                        <div className="flex justify-between w-full">

                                            <div className="flex gap-4 items-center">
                                                <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                                                    {techGroup.technician.name.substring(0, 2).toUpperCase()}
                                                </div>

                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {techGroup.technician.name}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {techGroup.technician.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <Badge className="bg-indigo-100 text-indigo-700 font-semibold">
                                                {techGroup.totalCases} Cases
                                            </Badge>

                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="bg-white border-t">

                                        <Table>

                                            <TableHeader className="bg-slate-200">
                                                <TableRow>
                                                    <TableHead className="pl-6 text-slate-700 font-semibold">Patient</TableHead>
                                                    <TableHead className="text-slate-700 font-semibold">Modality</TableHead>
                                                    <TableHead className="text-slate-700 font-semibold">Study Date</TableHead>
                                                    <TableHead className="text-slate-700 font-semibold">Urgency</TableHead>
                                                    <TableHead className="text-right pr-6 text-slate-700 font-semibold">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>

                                                {techGroup.cases.map((study: any) => (

                                                    <TableRow key={study._id} className="hover:bg-slate-50">

                                                        <TableCell className="pl-6 font-medium text-slate-900">
                                                            {study.patientName}
                                                        </TableCell>

                                                        <TableCell>
                                                            <Badge className="bg-slate-100 text-slate-800">
                                                                {study.modality}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell className="text-slate-600">
                                                            {format(new Date(study.studyDate), 'MMM d, yyyy')}
                                                        </TableCell>

                                                        <TableCell>
                                                            <span className={cn(
                                                                "px-2 py-1 rounded text-xs font-semibold",
                                                                study.urgency === 'STAT'
                                                                    ? "bg-red-100 text-red-700"
                                                                    : study.urgency === 'Urgent'
                                                                        ? "bg-yellow-100 text-yellow-700"
                                                                        : "bg-green-100 text-green-700"
                                                            )}>
                                                                {study.urgency}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell className="text-right pr-6 font-semibold text-slate-900">
                                                            ₹{study.totalEarnings.toLocaleString()}
                                                        </TableCell>

                                                    </TableRow>

                                                ))}

                                            </TableBody>
                                        </Table>

                                    </AccordionContent>

                                </AccordionItem>

                            ))}

                        </Accordion>

                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <AlertCircle className="w-12 h-12 mb-2" />
                            No technician breakdown available
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>

                    {details && (
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                            onClick={() => BillingService.downloadInvoice(invoiceId!)}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Invoice
                        </Button>
                    )}
                </div>

            </DialogContent>
        </Dialog>
    );
}