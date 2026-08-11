import {
    XCircle,
    AlertTriangle,
    MessageSquare,
    Send,
    Camera,
    User,
    Layers,
    ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface RejectionFlowProps {
    onCancel: () => void;
    onSubmit: (reason: string, notes: string) => void;
    patientName: string;
}

const TEMPLATES = [
    { id: 'blur', label: 'Motion Artifact / Blur', icon: <Camera className="w-4 h-4" />, text: 'Significant motion blur detected in Axial T2 series. Please re-scan with stabilization.' },
    { id: 'missing', label: 'Incomplete Study', icon: <Layers className="w-4 h-4" />, text: 'Required contrast phase (Portal Venous) is missing from the upload. Please verify and re-upload.' },
    { id: 'data', label: 'Patient Data Mismatch', icon: <User className="w-4 h-4" />, text: 'Patient ID on DICOM does not match hospital record. Please correct and re-send.' },
    { id: 'protocol', label: 'Incorrect Protocol', icon: <AlertTriangle className="w-4 h-4" />, text: 'Study performed with generic protocol instead of requested speciality protocol. Re-scan required.' }
];

export function RejectionFlow({ onCancel, onSubmit, patientName }: RejectionFlowProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [customNotes, setCustomNotes] = useState('');

    const handleSelect = (id: string, text: string) => {
        setSelectedTemplate(id);
        setCustomNotes(text);
    };

    return (
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-2xl flex flex-col h-full animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-border bg-red-50/20">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-auto">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Cancel
                    </Button>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1 flex items-center justify-end gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            Formal Rejection Flow
                        </div>
                        <div className="text-sm font-black text-foreground">{patientName}</div>
                    </div>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground uppercase pt-2">Identify Deficiency</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Standardized Templates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TEMPLATES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => handleSelect(t.id, t.text)}
                                className={cn(
                                    "p-5 rounded-2xl border text-left transition-all duration-300 group",
                                    selectedTemplate === t.id
                                        ? "bg-red-500 border-red-500 text-white shadow-xl shadow-red-200"
                                        : "bg-background border-border hover:border-red-200 hover:bg-red-50/30"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                    selectedTemplate === t.id ? "bg-white/20 text-white" : "bg-red-50 text-red-600"
                                )}>
                                    {t.icon}
                                </div>
                                <div className="text-[11px] font-black uppercase tracking-widest mb-1">{t.label}</div>
                                <div className={cn(
                                    "text-[10px] font-bold leading-relaxed line-clamp-2",
                                    selectedTemplate === t.id ? "text-red-50" : "text-muted-foreground"
                                )}>
                                    {t.text}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Communication Notes (to Technician)
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{customNotes.length}/500</span>
                    </div>
                    <textarea
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Detail the remedial actions required..."
                        className="w-full h-40 bg-background border border-border rounded-2xl p-6 text-sm font-medium placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none outline-none shadow-sm"
                    />
                </div>
            </div>

            <div className="p-8 border-t border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600/60 italic font-medium text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Technician will be notified immediately of this rejection.
                </div>
                <Button
                    disabled={!selectedTemplate && !customNotes}
                    onClick={() => onSubmit(selectedTemplate || 'Custom', customNotes)}
                    className="h-12 px-10 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-red-600/20 gap-2"
                >
                    Confirm Rejection
                    <Send className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}
