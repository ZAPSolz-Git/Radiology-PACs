import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Search, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CaseService } from '../services/CaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AssignRadiologistModalProps {
    isOpen: boolean;
    caseId: string | null;
    onClose: () => void;
    onAssigned: () => void;
}

export function AssignRadiologistModal({ isOpen, caseId, onClose, onAssigned }: AssignRadiologistModalProps) {
    const [radiologists, setRadiologists] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchRadiologists();
        }
    }, [isOpen]);

    const fetchRadiologists = async () => {
        setLoading(true);
        try {
            const data = await CaseService.getRadiologists();
            setRadiologists(data);
        } catch (err) {
            toast.error("Failed to load radiologists");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!caseId || !selectedId) return;
        setAssigning(true);
        try {
            await CaseService.assignRadiologist(caseId, selectedId);
            toast.success("Case assigned successfully");
            onAssigned();
            onClose();
        } catch (err) {
            toast.error("Assignment failed");
        } finally {
            setAssigning(false);
        }
    };

    const filteredRadiologists = radiologists.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border">
                <DialogHeader className="p-6 border-b border-border bg-muted/5">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        Assign Radiologist
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-10 bg-muted/20 border-border h-11"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-xs font-bold uppercase tracking-widest">Loading Pool...</span>
                            </div>
                        ) : filteredRadiologists.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground italic text-xs">
                                No radiologists found.
                            </div>
                        ) : (
                            filteredRadiologists.map(r => (
                                <div
                                    key={r._id}
                                    onClick={() => setSelectedId(r._id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                        selectedId === r._id
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                            : "bg-muted/5 border-border hover:bg-muted/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-black",
                                            selectedId === r._id ? "bg-white/20" : "bg-primary/10 text-primary"
                                        )}>
                                            {r.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">{r.name}</div>
                                            <div className={cn("text-[10px] opacity-70", selectedId === r._id ? "text-white" : "text-muted-foreground")}>
                                                {r.email}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedId === r._id && <Check className="w-5 h-5" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/10 border-t border-border">
                    <Button variant="ghost" onClick={onClose} disabled={assigning} className="font-bold uppercase text-[10px] tracking-widest">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={!selectedId || assigning}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-indigo-600/20"
                    >
                        {assigning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            "Confirm Assignment"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
