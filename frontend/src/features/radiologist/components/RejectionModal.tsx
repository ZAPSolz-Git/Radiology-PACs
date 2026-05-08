import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    XCircle,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Search
} from 'lucide-react';
import { REJECTION_REASONS } from '../constants/rejectionReasons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reasonId: string, comment: string) => void;
    patientName: string;
}

export function RejectionModal({ isOpen, onClose, onConfirm, patientName }: RejectionModalProps) {
    const [selectedReasonId, setSelectedReasonId] = useState<string>('');
    const [comment, setComment] = useState('');

    const handleConfirm = () => {
        if (!selectedReasonId) {
            toast.error("Please select a primary rejection reason");
            return;
        }
        onConfirm(selectedReasonId, comment);
        setSelectedReasonId('');
        setComment('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-xl p-0 overflow-hidden bg-background border-border shadow-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="p-5 sm:p-8 border-b border-border bg-red-50/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm shrink-0">
                            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="space-y-1 overflow-hidden">
                            <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground truncate">Reject Study</DialogTitle>
                            <DialogDescription className="text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-widest truncate">
                                Case: {patientName}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                            Select Mandatory Reason
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                            {REJECTION_REASONS.map((reason) => (
                                <div
                                    key={reason.id}
                                    onClick={() => setSelectedReasonId(reason.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer group",
                                        selectedReasonId === reason.id
                                            ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20"
                                            : "bg-muted/30 border-border hover:bg-muted/50"
                                    )}
                                >
                                    <div className="space-y-0.5 overflow-hidden">
                                        <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight truncate">{reason.label}</div>
                                        <div className={cn(
                                            "text-[8px] sm:text-[9px] font-bold uppercase tracking-widest truncate",
                                            selectedReasonId === reason.id ? "text-white/70" : "text-muted-foreground"
                                        )}>
                                            {reason.category}
                                        </div>
                                    </div>
                                    {selectedReasonId === reason.id ? (
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Additional Observations (Optional)</Label>
                        <Textarea
                            placeholder="Provide specific feedback for the technician..."
                            className="bg-muted/10 border-border min-h-[90px] rounded-xl focus:ring-red-500/20 resize-none font-medium text-xs sm:text-sm"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tighter">
                            A Rejection triggers an automated alert to the QA & Technician team. Ensure your observations are clinical and precise.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-4 sm:p-8 bg-muted/20 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center shrink-0">
                    <Button variant="ghost" onClick={onClose} className="font-black uppercase text-[10px] tracking-widest h-11 px-6 order-2 sm:order-1">
                        Go Back
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedReasonId}
                        className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest px-8 h-11 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 order-1 sm:order-2"
                    >
                        <XCircle className="w-4 h-4" />
                        Confirm Rejection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
