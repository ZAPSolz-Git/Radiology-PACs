import {
    Layers,
    Camera,
    Zap,
    Box,
    Info,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityChecklistProps {
    onCheck: (criterion: string, status: 'pass' | 'fail' | 'na') => void;
    checklistState: Record<string, 'pass' | 'fail' | 'na'>;
}

export function QualityChecklist({ onCheck, checklistState }: QualityChecklistProps) {
    const criteria = [
        { id: 'motion', label: 'No Motion Artifacts', icon: <Activity className="w-4 h-4" />, description: 'Check for blurring or ghosting in axial series.' },
        { id: 'coverage', label: 'Full Anatomical Coverage', icon: <Box className="w-4 h-4" />, description: 'Confirm all required slices are present for the study type.' },
        { id: 'noise', label: 'Acceptable Noise Levels', icon: <Zap className="w-4 h-4" />, description: 'Verify graininess does not obscure diagnostic detail.' },
        { id: 'protocol', label: 'Protocol Adherence', icon: <Layers className="w-4 h-4" />, description: 'Check if correct contrast phases or sequences (T1/T2/FLAIR) are included.' },
        { id: 'foreign', label: 'Artifact Identification', icon: <Search className="w-4 h-4" />, description: 'Look for metallic or external artifacts that might need notation.' }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Clinical Image Quality Audit</h3>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase">Pass</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase">Fail</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {criteria.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "group p-4 rounded-2xl border transition-all duration-300",
                            checklistState[item.id] === 'pass' && "bg-emerald-50/20 border-emerald-100",
                            checklistState[item.id] === 'fail' && "bg-red-50/20 border-red-100",
                            !checklistState[item.id] && "bg-background border-border"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    checklistState[item.id] === 'pass' ? "bg-emerald-100 text-emerald-600" :
                                        checklistState[item.id] === 'fail' ? "bg-red-100 text-red-600" :
                                            "bg-muted text-muted-foreground"
                                )}>
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="text-sm font-black text-foreground">{item.label}</div>
                                    <div className="text-[10px] font-bold text-muted-foreground mt-0.5">{item.description}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onCheck(item.id, 'pass')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        checklistState[item.id] === 'pass'
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                                            : "bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
                                    )}
                                >
                                    Pass
                                </button>
                                <button
                                    onClick={() => onCheck(item.id, 'fail')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        checklistState[item.id] === 'fail'
                                            ? "bg-red-500 text-white shadow-lg shadow-red-200"
                                            : "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                    )}
                                >
                                    Fail
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-muted/20 rounded-2xl flex items-start gap-3 mt-6">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-wide">
                    NOTE: Image quality checks are mandatory for 'Approved' status. Failed items will require technician notes or re-scan request.
                </p>
            </div>
        </div>
    );
}

// Helper to provide lucide icons that weren't imported
import { Activity } from 'lucide-react';
