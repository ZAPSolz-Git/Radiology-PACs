import { useState } from 'react';
import { ReportDraft } from '../../types';
import {
    CheckCircle2,
    RotateCcw,
    AlertTriangle,
    FileSearch,
    TextQuote,
    ClipboardCheck,
    Send,
    Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ReportVerificationProps {
    report: ReportDraft;
    onApprove: () => void;
    onReturnForCorrection: (notes: string) => void;
    onUpdate: (findings: string, impression: string) => void;
}

export function ReportVerification({ report, onApprove, onReturnForCorrection, onUpdate }: ReportVerificationProps) {
    const [mode, setMode] = useState<'view' | 'correction' | 'edit'>('view');
    const [correctionNotes, setCorrectionNotes] = useState('');
    const [editedFindings, setEditedFindings] = useState(report.findings);
    const [editedImpression, setEditedImpression] = useState(report.impression);

    const handleFinalApprove = () => {
        toast.success("Report Finalized", {
            description: "Study locked and dispatched to hospital."
        });
        onApprove();
    };

    const handleSendForCorrection = () => {
        if (!correctionNotes.trim()) {
            toast.error("Please provide correction notes.");
            return;
        }
        onReturnForCorrection(correctionNotes);
    };

    const handleSaveQAEdit = () => {
        onUpdate(editedFindings, editedImpression);
        setMode('view');
    };

    if (mode === 'correction') {
        return (
            <div className="flex flex-col h-full bg-card rounded-[2rem] border-2 border-amber-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-amber-100 bg-amber-50/30">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <RotateCcw className="w-5 h-5" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Quality Correction Request</h3>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Identify Deficiencies</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Correction Message (to Doctor)</h4>
                            <span className="text-[9px] font-bold text-amber-600 uppercase">High Priority Flow</span>
                        </div>
                        <textarea
                            value={correctionNotes}
                            onChange={(e) => setCorrectionNotes(e.target.value)}
                            placeholder="Please detail the required changes (e.g. 'Lateralizing of the lesion in Impression is inconsistent with Findings...')"
                            className="w-full h-48 bg-muted/20 border border-amber-200 rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none shadow-inner"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setCorrectionNotes("Please clarify the size of the lesion mentioned in Findings.")}
                            className="p-4 bg-muted/10 border border-border rounded-xl text-[10px] font-bold text-left hover:bg-white transition-colors uppercase tracking-wide"
                        >
                            Template: Clarify Sizes
                        </button>
                        <button
                            onClick={() => setCorrectionNotes("Inconsistency detected between Findings and Impression sections.")}
                            className="p-4 bg-muted/10 border border-border rounded-xl text-[10px] font-bold text-left hover:bg-white transition-colors uppercase tracking-wide"
                        >
                            Template: Finding-Impression Inconsistency
                        </button>
                    </div>
                </div>

                <div className="p-8 border-t border-border bg-muted/10 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setMode('view')} className="text-[10px] font-black uppercase tracking-widest">Cancel Audit</Button>
                    <Button
                        onClick={handleSendForCorrection}
                        className="h-12 px-10 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[11px] gap-2 shadow-lg shadow-amber-200"
                    >
                        Send to Doctor
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    if (mode === 'edit') {
        return (
            <div className="flex flex-col h-full bg-card rounded-[2rem] border-2 border-indigo-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-indigo-100 bg-indigo-50/30 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 mb-2">
                            <Pencil className="w-5 h-5" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest">QA Report Modification</h3>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Edit Findings & Impression</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Clinical Findings</label>
                        <textarea
                            value={editedFindings}
                            onChange={(e) => setEditedFindings(e.target.value)}
                            className="w-full h-64 bg-slate-50 border border-slate-200 rounded-3xl p-8 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner font-serif italic"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Diagnostic Impression</label>
                        <textarea
                            value={editedImpression}
                            onChange={(e) => setEditedImpression(e.target.value)}
                            className="w-full h-48 bg-indigo-50/20 border border-indigo-100 rounded-3xl p-8 text-base font-black text-foreground focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                        />
                    </div>
                </div>

                <div className="p-8 border-t border-border bg-muted/10 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setMode('view')} className="text-[10px] font-black uppercase tracking-widest">Discard Changes</Button>
                    <div className="flex gap-4">
                        <Button
                            onClick={handleSaveQAEdit}
                            className="h-12 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] gap-2 shadow-lg shadow-indigo-200"
                        >
                            Save Changes
                            <CheckCircle2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background rounded-[2rem] border border-border overflow-hidden shadow-xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="p-8 border-b border-border bg-muted/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <FileSearch className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Report Audit Station</h2>
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-100">
                                Status: {report.status}
                            </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Clinical Review Gate v4.2</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                        <div className="text-[9px] font-black text-muted-foreground/60 uppercase">Authoring Doctor</div>
                        <div className="text-xs font-black text-indigo-600 uppercase">{report.doctorName || 'Unknown Doctor'}</div>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <TextQuote className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-indigo-600 border-b border-indigo-100/50 pb-2">
                        <ClipboardCheck className="w-4 h-4" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Clinical Findings</h3>
                    </div>
                    <div className="bg-slate-50/50 p-8 rounded-3xl border border-border leading-relaxed text-sm font-medium text-slate-700 whitespace-pre-wrap selection:bg-indigo-100 italic font-serif">
                        {report.findings}
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-indigo-600 border-b border-indigo-100/50 pb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest">Diagnostic Impression</h3>
                    </div>
                    <div className="bg-indigo-50/30 p-8 rounded-3xl border border-indigo-100/50 leading-relaxed text-base font-black text-foreground whitespace-pre-wrap selection:bg-indigo-200">
                        {report.impression}
                    </div>
                </section>
            </div>

            {/* Action Bar */}
            <div className="p-8 border-t border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-4 text-muted-foreground font-bold text-[10px] uppercase tracking-wider italic">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-50" />
                    QA Audit indicates 100% technical compliance.
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setMode('edit')}
                        className="h-12 px-6 rounded-2xl border border-indigo-200 text-indigo-600 font-extrabold uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-50"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Report
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setMode('correction')}
                        className="h-12 px-8 rounded-2xl border border-amber-200 text-amber-600 font-extrabold uppercase tracking-widest text-[10px] gap-2 hover:bg-amber-50"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return for Correction
                    </Button>
                    <Button
                        onClick={handleFinalApprove}
                        className="h-12 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] scale-110 shadow-xl shadow-emerald-200"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Final Approve & Dispatch
                    </Button>
                </div>
            </div>
        </div>
    );
}
