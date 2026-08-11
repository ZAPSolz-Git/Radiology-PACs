import { useState } from 'react';
import { QACase } from '../../types';
import { IdentityComparison } from './IdentityComparison';
import { QualityChecklist } from './QualityChecklist';
import { RejectionFlow } from './RejectionFlow';
import {
    ShieldCheck,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { IntegrityInsights } from '@/components/cases/IntegrityInsights';

interface VerificationViewProps {
    caseData: QACase;
    onBack: () => void;
    onApprove: (caseId: string) => void;
    onReject: (caseId: string, reason: string, notes: string) => void;
}

export function VerificationView({ caseData, onBack, onApprove, onReject }: VerificationViewProps) {
    const [mode, setMode] = useState<'audit' | 'rejection'>('audit');
    const [verificationState, setVerificationState] = useState<Record<string, boolean>>({});
    const [checklistState, setChecklistState] = useState<Record<string, 'pass' | 'fail' | 'na'>>({});

    const handleVerifyField = (field: string, isValid: boolean) => {
        setVerificationState(prev => ({ ...prev, [field]: isValid }));
    };

    const handleCheckQuality = (criterion: string, status: 'pass' | 'fail' | 'na') => {
        setChecklistState(prev => ({ ...prev, [criterion]: status }));
    };

    const isAuditComplete = () => {
        const identityFields = ['name', 'id', 'age_gender', 'modality'];
        const qualityCriteria = ['motion', 'coverage', 'noise', 'protocol', 'foreign'];

        const identityValid = identityFields.every(f => verificationState[f] === true);
        const qualityValid = qualityCriteria.every(f => checklistState[f] === 'pass');

        return identityValid && qualityValid;
    };

    const handleFinalApprove = () => {
        if (!isAuditComplete()) {
            toast.error("Audit Incomplete", {
                description: "Please verify all identity fields and pass all quality criteria before approving."
            });
            return;
        }
        onApprove(caseData._id);
    };

    if (mode === 'rejection') {
        return (
            <div className="h-full max-w-5xl mx-auto py-8">
                <RejectionFlow
                    patientName={caseData.patientName}
                    onCancel={() => setMode('audit')}
                    onSubmit={(reason, notes) => onReject(caseData._id, reason, notes)}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Queue
                </Button>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Actively Auditing</div>
                        <div className="text-sm font-black text-foreground uppercase tracking-tight">{caseData.patientName}</div>
                    </div>
                    <div className="w-px h-8 bg-border mx-2" />
                    <Button
                        onClick={() => setMode('rejection')}
                        className="h-10 px-6 rounded-xl border border-red-200 bg-red-50 text-red-600 font-extrabold uppercase tracking-widest text-[9px] gap-2 hover:bg-red-100 transition-colors"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Formal Rejection
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                {/* Left: Identity Audit */}
                <div className="space-y-6">
                    <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm">
                        <IdentityComparison
                            caseData={caseData}
                            verificationState={verificationState}
                            onVerify={handleVerifyField}
                        />
                    </div>

                    <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-900">QA Protocol #2.1</div>
                            <p className="text-[10px] font-bold text-indigo-700/70 leading-relaxed uppercase tracking-wide">
                                All demographic mismatches must be resolved before clinical assignment. If a mismatch is found, use the rejection flow.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Quality Audit */}
                <div className="space-y-6">
                    <IntegrityInsights
                        findings={caseData.integrityResults?.findings || []}
                        score={caseData.integrityResults?.score || 100}
                        status={caseData.integrityResults?.status || 'Pass'}
                        lastRun={caseData.integrityResults?.lastRun}
                        onRerun={() => { }} // Not implemented in this view, could add later if needed
                        isRerunning={false}
                        studyId={caseData.studyInstanceUID}
                    />
                    <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm">
                        <QualityChecklist
                            checklistState={checklistState}
                            onCheck={handleCheckQuality}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-900 mb-4 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Audit Progression
                            </div>
                            <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${(Object.values(verificationState).filter(v => v).length + Object.values(checklistState).filter(v => v === 'pass').length) / 9 * 100}%` }}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleFinalApprove}
                            className={cn(
                                "h-auto px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl transition-all gap-3",
                                isAuditComplete()
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200"
                                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none border border-border"
                            )}
                        >
                            <ShieldCheck className="w-5 h-5" />
                            Final Approve Study
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
