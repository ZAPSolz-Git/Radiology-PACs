import { QACase } from '../types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Info,
    User,
    Layers,
    Database,
    ShieldCheck,
    Cpu,
    Activity,
    ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MetadataPanelProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: QACase | null;
}

export function MetadataPanel({ isOpen, onClose, caseData }: MetadataPanelProps) {
    if (!caseData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-background border-border p-0 overflow-hidden rounded-[2rem] shadow-2xl">
                <div className="flex h-[700px]">
                    {/* Left Index Sidebar */}
                    <div className="w-72 border-r border-border bg-muted/20 p-8 flex flex-col gap-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="w-5 h-5 text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Metadata Index</span>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h4 className="text-[11px] font-black uppercase tracking-tight text-muted-foreground/60">Study Source</h4>
                                <div className="p-3 bg-background rounded-xl border border-border">
                                    <div className="text-[11px] font-bold text-foreground truncate">{caseData.sourceHospital}</div>
                                    <div className="text-[9px] font-medium text-muted-foreground uppercase">Node ID: RG-TX-991</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-[11px] font-black uppercase tracking-tight text-muted-foreground/60">Integrity Check</h4>
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">WADO-RS Verified</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Automation Engine</span>
                            </div>
                            <p className="text-[10px] font-bold text-indigo-100 leading-relaxed italic">
                                "AI suggests high technical compliance. Ready for QA Approval."
                            </p>
                        </div>
                    </div>

                    {/* Main Metadata Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <DialogHeader className="p-8 border-b border-border bg-background">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-2xl font-black tracking-tight text-foreground uppercase">
                                    Case Metadata Detail
                                </DialogTitle>
                                <Badge className={cn(
                                    "px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]",
                                    caseData.urgency === 'STAT' ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
                                )}>
                                    {caseData.urgency} Priority
                                </Badge>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Patient Info */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <User className="w-4 h-4" />
                                    <h3 className="text-[11px] font-black uppercase tracking-widest">Patient Demographics</h3>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-muted/20 p-6 rounded-3xl border border-border">
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Full Name</div>
                                        <div className="text-sm font-black text-foreground">{caseData.patientName}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Patient ID</div>
                                        <div className="text-sm font-black text-foreground">{caseData.patientId}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Age / Sex</div>
                                        <div className="text-sm font-black text-foreground">{caseData.age}Y • {caseData.gender}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">DOB</div>
                                        <div className="text-sm font-black text-foreground italic opacity-50">14-Aug-1979</div>
                                    </div>
                                </div>
                            </section>

                            {/* Study Geometry */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <Layers className="w-4 h-4" />
                                    <h3 className="text-[11px] font-black uppercase tracking-widest">Study Geometry & Series</h3>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-background border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Modality</div>
                                                <div className="text-sm font-black text-foreground">{caseData.modality} Scan</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-muted-foreground leading-relaxed uppercase">
                                            {caseData.description}
                                        </div>
                                    </div>
                                    <div className="bg-background border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                                <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Study Stats</div>
                                                <div className="text-sm font-black text-foreground">{caseData.seriesCount} Series / {caseData.imageCount} Instances</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            Accession: {caseData.accessionNumber}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-8 border-t border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-muted-foreground italic font-medium text-[10px]">
                                <Info className="w-3.5 h-3.5" />
                                Indexed at: {new Date(caseData.receivedAt).toLocaleString()}
                            </div>
                            <Button
                                onClick={onClose}
                                className="h-12 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20"
                            >
                                Confirm & Proceed to QA
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
