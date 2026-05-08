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
    AlertCircle
} from 'lucide-react';
import { RadiologistCase } from '../types';
import { cn } from '@/lib/utils';

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
        try {
            // Root Cause Fix: Ensure we use the backend host for the relative /uploads URL
            const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            // Fetch the file as a blob to allow the browser to save it with the correct name/format
            const response = await fetch(fullUrl, {
                headers: {
                    // Include any necessary authentication or range headers if needed
                }
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download error:', error);
            // Fallback to direct link if fetch fails
            const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
            const link = document.createElement('a');
            link.href = fullUrl;
            link.download = filename;
            link.target = "_blank";
            link.click();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border shadow-2xl">
                <div className="flex h-[550px]">
                    {/* Side Navigation */}
                    <nav className="w-56 bg-muted/30 border-r border-border p-6 flex flex-col gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 px-2">Information</div>

                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold w-full text-left",
                                    activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}

                        <div className="mt-auto p-4 bg-background/50 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-2 mb-2 text-indigo-600">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">SLA Time</span>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                                {Math.floor(caseData.tatRemainingSeconds / 60)} mins remaining
                            </div>
                        </div>
                    </nav>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-background">
                        <DialogHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-lg font-black uppercase tracking-tight">
                                    {caseData.patientName}
                                </DialogTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase h-5 bg-muted/30">
                                        MRN: {caseData.patientId}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[9px] font-black uppercase h-5",
                                            caseData.status === 'Rejected' ? "bg-red-50 border-red-100 text-red-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                                        )}
                                    >
                                        {caseData.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                <Info className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">View Only Mode</span>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {caseData.status === 'Rejected' && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-1">Rejection Details</h4>
                                        <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                                            {caseData.rejectionReason || "No specific reason provided."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4">
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Full Name</h4>
                                            <p className="text-sm font-bold text-foreground">{caseData.patientName}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Patient ID (MRN)</h4>
                                            <p className="text-sm font-bold text-foreground">{caseData.patientId}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Age</h4>
                                                <p className="text-sm font-bold text-foreground">{caseData.age} Years</p>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Gender</h4>
                                                <p className="text-sm font-bold text-foreground">{caseData.gender === 'M' ? 'Male' : caseData.gender === 'F' ? 'Female' : 'Other'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Accession Number</h4>
                                            <p className="text-sm font-bold text-foreground">{caseData.accessionNumber || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Modality / Study</h4>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-indigo-600 font-black text-[9px] uppercase">{caseData.modality}</Badge>
                                                <p className="text-sm font-bold text-foreground">{caseData.studyDescription || 'No description'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1.5">Study Date</h4>
                                            <p className="text-sm font-bold text-foreground">{new Date(caseData.studyDate).toLocaleDateString()} {new Date(caseData.studyDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 h-full">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clinical History & Notes</h4>
                                    <div className="p-6 rounded-2xl bg-muted/20 border border-border min-h-[150px]">
                                        {caseData.clinicalHistory ? (
                                            <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                                                {caseData.clinicalHistory}
                                            </p>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground opacity-50">
                                                <ClipboardList className="w-8 h-8 mb-2" />
                                                <p className="text-xs font-bold uppercase tracking-widest">No clinical history provided</p>
                                            </div>
                                        )}
                                    </div>
                                    {caseData.technicianNotes && (
                                        <div className="mt-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Technician Feedback</h4>
                                            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] font-medium text-indigo-900 leading-relaxed italic">
                                                "{caseData.technicianNotes}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'attachments' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Supporting Documents</h4>

                                    {caseData.attachments && caseData.attachments.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2">
                                            {caseData.attachments.map((file, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-muted/10 border border-border flex items-center justify-between group hover:bg-muted/20 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-foreground">{file.name}</div>
                                                            <div className="text-[10px] font-medium text-muted-foreground uppercase">{file.category} • {file.fileType}</div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 px-4 font-black text-[10px] uppercase tracking-widest text-indigo-600 hover:bg-indigo-50/30 gap-2"
                                                        onClick={() => handleDownload(file.url, file.name)}
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        View Attachment
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-16 border-2 border-dashed border-border rounded-3xl text-center flex flex-col items-center justify-center opacity-50">
                                            <Paperclip className="w-12 h-12 text-muted-foreground mb-4" />
                                            <h3 className="text-sm font-black uppercase tracking-widest mb-1">No Attachments</h3>
                                            <p className="text-[11px] font-medium">No additional files were uploaded with this case.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 bg-muted/5 border-t border-border">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-10 px-8 font-black uppercase tracking-widest text-[10px]"
                            >
                                Close Details
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
