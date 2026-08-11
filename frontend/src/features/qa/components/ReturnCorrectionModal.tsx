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
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnCorrectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (notes: string) => void;
    patientName: string;
}

export function ReturnCorrectionModal({ isOpen, onClose, onConfirm, patientName }: ReturnCorrectionModalProps) {
    const [notes, setNotes] = useState('');

    const handleConfirm = () => {
        if (!notes.trim()) {
            toast.error("Please enter correction notes");
            return;
        }
        onConfirm(notes);
        setNotes('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-xl p-0 overflow-hidden bg-background border-border shadow-2xl flex flex-col">
                <DialogHeader className="p-5 sm:p-8 border-b border-border bg-amber-50/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="space-y-1 overflow-hidden text-left">
                            <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground truncate">Return for Correction</DialogTitle>
                            <DialogDescription className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-widest truncate">
                                Case: {patientName}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 sm:p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-3 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Correction Notes</Label>
                        <Textarea
                            placeholder="Detail the corrections required by the radiologist..."
                            className="bg-muted/10 border-border min-h-[120px] rounded-xl focus:ring-amber-500/20 resize-none font-medium text-xs sm:text-sm"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start text-left">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] sm:text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tighter">
                            The radiologist will be notified that this report requires revision. This case will be returned to their worklist.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-4 sm:p-8 bg-muted/20 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
                    <Button variant="ghost" onClick={onClose} className="font-black uppercase text-[10px] tracking-widest h-11 px-6 order-2 sm:order-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!notes.trim()}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest px-8 h-11 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 order-1 sm:order-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Confirm Return
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
