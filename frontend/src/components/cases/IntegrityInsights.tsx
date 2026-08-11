import { AlertCircle, Info, CheckCircle2, FileText, ExternalLink, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, getImageUrl, getBackendBaseUrl } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Finding {
    level: 'Metadata' | 'Structural' | 'Clinical' | 'AI';
    type: 'Error' | 'Warning' | 'Info';
    message: string;
    seriesInstanceUID?: string;
    details?: {
        problematicFrames?: Array<{
            path: string;
            name: string;
            series?: string;
            previewUrl?: string;
        }>;
        totalProblematic?: number;
    };
}

interface IntegrityInsightsProps {
    findings: Finding[];
    score: number;
    status: 'Pass' | 'Warning' | 'Fail' | 'Pending';
    lastRun?: string;
    onRerun: () => void;
    isRerunning: boolean;
    studyId?: string;
}

export function IntegrityInsights({ findings, score, status, onRerun, isRerunning, studyId }: IntegrityInsightsProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h5 className="text-[10px] font-black uppercase text-muted-foreground italic">
                    AI Quality Audit
                    {status === 'Pending' && <span className="animate-pulse ml-2">(Scanning...)</span>}
                </h5>
                <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
                    score >= 90 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        score >= 70 ? "bg-orange-50 text-orange-600 border border-orange-100" :
                            "bg-red-50 text-red-600 border border-red-100"
                )}>
                    AI Score: {score}%
                </div>
            </div>

            <div className="p-5 rounded-[2rem] bg-card border border-border shadow-sm space-y-4">
                {findings.length === 0 ? (
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <div className="text-sm font-black text-foreground">Integrity Shield Active</div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase">All automated checks passed</div>
                            </div>
                        </div>
                        <Badge className="bg-emerald-500 text-white text-[9px] px-3 py-1">PASSED</Badge>
                    </div>
                ) : (
                    findings.map((finding, idx) => (
                        <div key={idx} className="flex items-start justify-between p-4 rounded-2xl hover:bg-muted/30 transition-all border border-transparent hover:border-border/50">
                            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                {finding.type === 'Error' ? (
                                    <div className="bg-red-100 p-2 rounded-xl">
                                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                    </div>
                                ) : finding.type === 'Warning' ? (
                                    <div className="bg-orange-100 p-2 rounded-xl">
                                        <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                                    </div>
                                ) : (
                                    <div className="bg-blue-100 p-2 rounded-xl">
                                        <Info className="w-5 h-5 text-blue-600 shrink-0" />
                                    </div>
                                )}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black leading-tight text-foreground">{finding.message}</span>
                                        <Badge className={cn(
                                            "text-white text-[9px] px-2 py-0.5",
                                            finding.type === 'Error' ? "bg-red-500" :
                                                finding.type === 'Warning' ? "bg-orange-500" :
                                                    "bg-blue-500"
                                        )}>
                                            {finding.type.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter mt-1">
                                        Source: {finding.level} {finding.seriesInstanceUID && `• Series: ${finding.seriesInstanceUID.substr(-6)}`}
                                    </span>

                                    {/* Problematic Frames List */}
                                    {finding.details?.problematicFrames && (
                                        <div className="mt-4 space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                                            <div className="text-[9px] font-black uppercase text-muted-foreground flex justify-between items-center px-1">
                                                <span className="flex items-center gap-1.5">
                                                    <FileText className="w-3 h-3 text-indigo-500" />
                                                    {finding.level === 'AI' ? 'Clinical Evidence (AI)' : 'Structural Trace'}
                                                </span>
                                                <span className="bg-background px-2 py-0.5 rounded-lg border border-border/50 text-[8px]">{finding.details.totalProblematic} Evidence Files</span>
                                            </div>

                                            {/* Visual Proof Gallery */}
                                            {finding.level === 'AI' && finding.details.problematicFrames.some(f => f.previewUrl) && (
                                                <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
                                                    {finding.details.problematicFrames.filter(f => f.previewUrl).map((frame, fIdx) => (
                                                        <div key={fIdx} className="relative group shrink-0">
                                                            <div className="w-24 h-24 rounded-xl overflow-hidden border border-border bg-black group-hover:border-indigo-400 transition-all cursor-zoom-in">
                                                                <img
                                                                    src={getImageUrl(frame.previewUrl)}
                                                                    alt="Clinical Evidence"
                                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                                />
                                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-1">
                                                                    <div className="text-[7px] text-white font-black truncate text-center uppercase">Frame {frame.name.split('_').pop()}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                                {finding.details.problematicFrames.map((frame: any, fIdx: number) => (
                                                    <DropdownMenu key={fIdx}>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className="px-3 py-1.5 rounded-xl bg-background border border-border hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all text-xs font-black whitespace-nowrap active:scale-95 flex items-center gap-2 max-w-full"
                                                            >
                                                                <span className="truncate flex-1 text-left">{frame.name.split('_').pop()}</span>
                                                                <span className="opacity-30 text-[8px] shrink-0">▼</span>
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-56 rounded-2xl shadow-2xl border-border bg-background p-2">
                                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-3 py-2">Verification Action</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="mx-1" />
                                                            <DropdownMenuItem
                                                                className="text-xs font-bold gap-3 p-3 cursor-pointer rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                                                onClick={() => studyId && window.open(`${import.meta.env.VITE_OHIF_URL || 'http://localhost:3000'}/basic?StudyInstanceUIDs=${studyId}`, '_blank')}
                                                            >
                                                                <div className="bg-indigo-100 p-1.5 rounded-lg">
                                                                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                                                                </div>
                                                                View in AI Viewer
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-xs font-bold gap-3 p-3 cursor-pointer rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                                onClick={() => {
                                                                    const link = document.createElement('a');
                                                                    link.href = getBackendBaseUrl() + frame.path;
                                                                    link.download = frame.name;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                }}
                                                            >
                                                                <div className="bg-emerald-100 p-1.5 rounded-lg">
                                                                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                                                                </div>
                                                                Download Raw DICOM
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ))}
                                                {finding.details.totalProblematic && finding.details.totalProblematic > 20 && (
                                                    <div className="text-[9px] font-bold text-muted-foreground self-center px-2 py-1 bg-muted/40 rounded-lg">
                                                        + {finding.details.totalProblematic - 20} others
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[8px] text-muted-foreground italic leading-none px-1 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                Visual proof required for clinical rejection or approval.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Button
                onClick={onRerun}
                disabled={isRerunning}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-indigo-600/20"
            >
                <RefreshCw className={cn("w-4 h-4", (status === 'Pending' || isRerunning) && "animate-spin")} />
                {(status === 'Pending' || isRerunning) ? "Analysis in Progress..." : "Re-run Smart Validation"}
            </Button>
        </div>
    );
}