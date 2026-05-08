import { QACase } from '../../types';
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Hospital,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdentityComparisonProps {
    caseData: QACase;
    onVerify: (field: string, isValid: boolean) => void;
    verificationState: Record<string, boolean>;
}

export function IdentityComparison({ caseData, onVerify, verificationState }: IdentityComparisonProps) {
    const fields = [
        { id: 'name', label: 'Patient Name', dicom: caseData.patientName, hospital: caseData.patientName }, // Mocking match
        { id: 'id', label: 'Patient ID', dicom: caseData.patientId, hospital: caseData.patientId },
        { id: 'age_gender', label: 'Age / Gender', dicom: `${caseData.age}Y / ${caseData.gender}`, hospital: `${caseData.age}Y / ${caseData.gender}` },
        { id: 'modality', label: 'Modality', dicom: caseData.modality, hospital: caseData.modality },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Identity Verification (DICOM vs Record)</h3>
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/30 px-3 py-1 rounded-full">
                    Reference Source: Hospital API (Verified)
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {fields.map((field) => (
                    <div
                        key={field.id}
                        className={cn(
                            "group p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between",
                            verificationState[field.id]
                                ? "bg-emerald-50/30 border-emerald-100"
                                : "bg-card border-border hover:border-indigo-200"
                        )}
                    >
                        <div className="flex-1 grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                    <Database className="w-3 h-3" />
                                    DICOM TAGS
                                </div>
                                <div className="text-sm font-black text-foreground truncate">{field.dicom}</div>
                                <div className="text-[10px] font-bold text-muted-foreground/40">{field.label}</div>
                            </div>
                            <div className="space-y-1 border-l border-border pl-8">
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                    <Hospital className="w-3 h-3" />
                                    HOSPITAL RECORD
                                </div>
                                <div className="text-sm font-black text-foreground truncate">{field.hospital}</div>
                                <div className="text-[10px] font-bold text-muted-foreground/40">Verified Reference</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => onVerify(field.id, true)}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    verificationState[field.id]
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200Scale-110"
                                        : "bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-500"
                                )}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onVerify(field.id, false)}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    verificationState[field.id] === false
                                        ? "bg-red-500 text-white shadow-lg shadow-red-200"
                                        : "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500"
                                )}
                            >
                                <AlertTriangle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
