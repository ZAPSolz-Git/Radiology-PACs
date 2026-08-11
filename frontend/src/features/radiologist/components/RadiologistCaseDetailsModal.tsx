import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    User,
    ClipboardList,
    Paperclip,
    Clock,
    Download,
    FileText,
    Info,
    AlertCircle,
    Eye,
} from 'lucide-react';
import { RadiologistCase } from '../types';
import { cn, getImageUrl } from '@/lib/utils';

interface RadiologistCaseDetailsModalProps {
    isOpen: boolean;
    caseData: RadiologistCase | null;
    onClose: () => void;
}

type TabType = 'details' | 'history' | 'attachments';

export function RadiologistCaseDetailsModal({ isOpen, caseData, onClose }: RadiologistCaseDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('details');

    const tabs = useMemo(() => [
        { id: 'details', label: 'Patient Details', icon: User },
        { id: 'history', label: 'Clinical History', icon: ClipboardList },
        { id: 'attachments', label: 'Attachments', icon: Paperclip },
    ], []);

    if (!caseData) return null;

    const handleDownload = async (url: string, filename: string) => {
        const fullUrl = getImageUrl(url);
        try {
            const response = await fetch(fullUrl, { headers: {} });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download error:', error);
            const link = document.createElement('a');
            link.href = fullUrl;
            link.download = filename;
            link.target = "_blank";
            link.click();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[96vw] sm:w-full p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-3xl !grid-cols-1 [&>button]:hidden md:[&>button]:flex">
                <div className="flex flex-col md:flex-row h-[90dvh] md:h-[600px] min-w-0 overflow-hidden">
                    {/* Side/Top Navigation */}
                    <nav className="w-full md:w-64 bg-muted/30 border-b md:border-b-0 md:border-r border-border p-1 md:p-8 flex flex-row md:flex-col gap-1 md:gap-3 shrink-0 min-w-0 overflow-hidden">
                        <div className="hidden md:block text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600/60 mb-6 px-2">Medical Dossier</div>

                        <div className="flex flex-row md:flex-col gap-1 md:gap-3 w-full">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={cn(
                                        "flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-1 md:px-5 py-2 md:py-4 rounded-xl md:rounded-2xl transition-all text-[8px] md:text-xs font-black md:font-bold md:w-full text-center md:text-left uppercase md:capitalize tracking-tighter md:tracking-normal border border-transparent",
                                        activeTab === tab.id
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border-indigo-500/50"
                                            : "text-muted-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <tab.icon className={cn("w-3.5 h-3.5 md:w-5 md:h-5 shrink-0", activeTab === tab.id ? "text-white" : "text-indigo-600/50")} />
                                    <span className="whitespace-nowrap">
                                        {tab.id === 'details' ? 'Details' : tab.id === 'history' ? 'History' : 'Files'}
                                        <span className="hidden md:inline ml-1">
                                            {tab.id === 'details' ? 'Details' : tab.id === 'history' ? 'History' : 'Attachments'}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
                        <DialogHeader className="p-4 md:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/30 shrink-0">
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <DialogTitle className="text-lg md:text-2xl font-black uppercase tracking-tight truncate w-full" title={caseData.patientName}>
                                    {caseData.patientName}
                                </DialogTitle>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="text-[9px] md:text-[10px] font-black uppercase h-5 bg-muted px-2 rounded-md">
                                        MRN: {caseData.patientId}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[9px] md:text-[10px] font-black uppercase h-5 px-2 rounded-md",
                                            caseData.status === 'Rejected' ? "bg-red-50 border-red-200 text-red-600" : "bg-indigo-50 border-indigo-200 text-indigo-600"
                                        )}
                                    >
                                        {caseData.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 w-fit shrink-0">
                                <Info className="w-4 h-4" />
                                <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest">Audit Mode</span>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-5 md:p-10 custom-scrollbar min-w-0">
                            {caseData.status === 'Rejected' && (
                                <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 animate-in fade-in zoom-in-95 duration-300">
                                    <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[11px] md:text-[12px] font-black uppercase tracking-widest text-red-600 mb-1.5">Case Rejected</h4>
                                        <p className="text-[12px] text-red-700 font-medium leading-relaxed break-words">
                                            {caseData.rejectionReason || "No specific reason provided."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 animate-in fade-in slide-in-from-right-8 duration-500 min-w-0 overflow-hidden">
                                    <div className="space-y-6 md:space-y-8 min-w-0">
                                        <div className="group">
                                            <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Patient Name</h4>
                                            <p className="text-base md:text-lg font-black text-foreground uppercase tracking-tight break-words">{caseData.patientName}</p>
                                        </div>
                                        <div className="group">
                                            <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Patient ID (MRN)</h4>
                                            <p className="text-base md:text-lg font-black text-foreground tabular-nums tracking-wider truncate">{caseData.patientId}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="group min-w-0">
                                                <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Age</h4>
                                                <p className="text-base md:text-lg font-black text-foreground tabular-nums">{caseData.age} <span className="text-xs font-bold text-muted-foreground ml-1">Y</span></p>
                                            </div>
                                            <div className="group min-w-0">
                                                <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Gender</h4>
                                                <p className="text-base md:text-lg font-black text-foreground truncate">{caseData.gender === 'M' ? 'Male' : caseData.gender === 'F' ? 'Female' : 'Other'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6 md:space-y-8 min-w-0">
                                        <div className="group">
                                            <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Accession #</h4>
                                            <p className="text-base md:text-lg font-black text-foreground tabular-nums tracking-wide truncate">{caseData.accessionNumber || 'N/A'}</p>
                                        </div>
                                        <div className="group">
                                            <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Modality & Study</h4>
                                            <div className="flex flex-wrap items-start gap-2.5 mt-1.5">
                                                <Badge className="bg-indigo-600 font-black text-[10px] uppercase px-3 py-1 rounded-md shrink-0">{caseData.modality}</Badge>
                                                <p className="text-base md:text-lg font-black text-foreground break-words flex-1 min-w-0">{caseData.studyDescription || 'No description'}</p>
                                            </div>
                                        </div>
                                        <div className="group">
                                            <h4 className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.15em] text-muted-foreground/60 mb-1">Study Date</h4>
                                            <p className="text-base md:text-lg font-black text-foreground tabular-nums flex flex-wrap gap-x-2.5 break-words">
                                                <span>{new Date(caseData.studyDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                                <span className="opacity-20">|</span>
                                                <span>{new Date(caseData.studyDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full min-w-0 overflow-hidden">
                                    <div className="space-y-3 min-w-0">
                                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Clinical Context</h4>
                                        <div className="p-6 md:p-10 rounded-[2rem] bg-muted/20 border-2 border-dashed border-border min-h-[180px] md:min-h-[220px] min-w-0">
                                            {caseData.clinicalHistory ? (
                                                <p className="text-sm md:text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                                    {caseData.clinicalHistory}
                                                </p>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/40">
                                                    <ClipboardList className="w-12 h-12 mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest">No notes available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {caseData.technicianNotes && (
                                        <div className="space-y-3 min-w-0">
                                            <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">Technician Feedback</h4>
                                            <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-sm font-medium text-indigo-900 leading-relaxed italic break-words shadow-sm text-center">
                                                "{caseData.technicianNotes}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'attachments' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 min-w-0 overflow-hidden">
                                    <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Case Assets</h4>

                                    {caseData.attachments && caseData.attachments.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4 min-w-0">
                                            {caseData.attachments.map((file, idx) => (
                                                <div key={idx} className="p-4 md:p-5 rounded-[1.5rem] bg-muted/10 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:bg-card hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-600/5 transition-all duration-300 min-w-0">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 overflow-hidden">
                                                            <div className="text-sm font-black text-foreground truncate block w-full uppercase tracking-tight" title={file.name}>{file.name}</div>
                                                            <div className="text-[10px] font-black text-muted-foreground uppercase opacity-60 mt-0.5 tracking-wider truncate block w-full">{file.category} · {file.fileType}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-11 px-5 font-black text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:bg-muted rounded-xl flex-1 sm:flex-none justify-center"
                                                            onClick={() => window.open(getImageUrl(file.url), '_blank')}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-11 px-5 font-black text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl flex-1 sm:flex-none justify-center shadow-indigo-600/10"
                                                            onClick={() => handleDownload(file.url, file.name)}
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-16 md:p-24 border-4 border-dashed border-muted rounded-[3rem] text-center flex flex-col items-center justify-center opacity-30 min-w-0">
                                            <Paperclip className="w-16 h-16 text-muted-foreground mb-6" />
                                            <h3 className="text-base font-black uppercase tracking-[0.2em] mb-2">No Assets Found</h3>
                                            <p className="text-[11px] font-bold px-8 uppercase leading-relaxed">No supplementary documentation.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 md:p-8 bg-muted/5 border-t border-border shrink-0 min-w-0 overflow-hidden">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-12 px-10 font-black uppercase tracking-[0.3em] text-[10px] md:text-[11px] w-full sm:w-auto hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                                Terminate Session
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}