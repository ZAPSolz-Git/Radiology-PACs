import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    User,
    ClipboardList,
    Clock,
    Save,
    History as HistoryIcon,
    ShieldCheck,
    RefreshCw,
    AlertCircle,
    Image as ImageIcon
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { DICOMManager } from './DICOMManager';
import { HistoryManager } from './HistoryManager';
import { IntegrityInsights } from '@/components/cases/IntegrityInsights';
import { Case } from '../types/technician';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSocketContext } from '@/contexts/SocketContext';
import { CaseService } from '../services/CaseService';

interface CaseDetailsModalProps {
    isOpen: boolean;
    caseData: Case | null;
    onClose: () => void;
    onUpdate: (updatedData: any) => void;
}



export function CaseDetailsModal({ isOpen, caseData, onClose, onUpdate }: CaseDetailsModalProps) {
    const [localCaseData, setLocalCaseData] = useState<Case | null>(caseData);
    const { socket } = useSocketContext();
    const [activeTab, setActiveTab] = useState<'details' | 'history' | 'integrity' | 'manage_images'>('details');
    const { user } = useAuthStore();
    const isQAOrAdmin = user?.role?.toLowerCase() === 'qa' || user?.role?.toLowerCase() === 'admin';
    const [isRerunning, setIsRerunning] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>(null);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [remainingAttachments, setRemainingAttachments] = useState<any[]>(caseData?.attachments || []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync local state with prop
    useEffect(() => {
        setLocalCaseData(caseData);
        if (caseData) {
            setRemainingAttachments(caseData.attachments || []);
        }
    }, [caseData]);

    // Join room manually to receive integrity updates without affecting global chat room
    useEffect(() => {
        if (!socket || !isOpen || !localCaseData?._id) return;
        
        const caseId = localCaseData._id;
        socket.emit('join-room', { caseId });

        return () => {
            socket.emit('leave-room', { caseId });
        };
    }, [socket, isOpen, localCaseData?._id]);

    // Socket listener for real-time integrity updates
    useEffect(() => {
        if (!socket || !localCaseData?._id) return;

        const handleIntegrityUpdate = (payload: { caseId: string, integrityResults: any }) => {
            if (payload.caseId === localCaseData._id) {
                const updated = { ...localCaseData, integrityResults: payload.integrityResults };
                setLocalCaseData(updated);
                onUpdate(updated);

                if (payload.integrityResults.status !== 'Pending') {
                    toast.success("AI Integrity scan completed.", {
                        description: `Study health: ${payload.integrityResults.score}% (${payload.integrityResults.status})`
                    });
                }
            }
        };

        socket.on('integrity-update', handleIntegrityUpdate);
        return () => {
            socket.off('integrity-update', handleIntegrityUpdate);
        };
    }, [socket, localCaseData?._id, onUpdate]);

    // Initialize form data when case data changes
    useEffect(() => {
        if (localCaseData) {
            setFormData({
                patientName: localCaseData.patientName,
                patientId: localCaseData.patientId,
                age: localCaseData.age,
                gender: localCaseData.gender,
                bodyPart: localCaseData.bodyPart || null,
                clinicalHistory: localCaseData.clinicalHistory || '',
                accessionNumber: localCaseData.accessionNumber
            });
            // Reset files when case changes
            setAttachedFiles([]);
            setRemainingAttachments(localCaseData.attachments || []);
        }
    }, [localCaseData]);

    if (!localCaseData || !formData) return null;

    const handleSave = async () => {
        if (!localCaseData?._id || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const updatedCase = await CaseService.updateCase(
                localCaseData._id,
                { ...formData, attachments: remainingAttachments },
                attachedFiles
            );

            setLocalCaseData(updatedCase);
            onUpdate(updatedCase);
            setIsEditing(false);
            setAttachedFiles([]);
            toast.success("Case details updated successfully");
        } catch (error) {
            toast.error("Failed to update case details");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveExistingAttachment = (index: number) => {
        setRemainingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleRerunValidation = async () => {
        if (!localCaseData?._id || isRerunning) return;

        try {
            setIsRerunning(true);
            // Optimistically set status to Pending
            setLocalCaseData({
                ...localCaseData,
                integrityResults: {
                    ...localCaseData.integrityResults,
                    status: 'Pending',
                    score: localCaseData.integrityResults?.score || 0,
                    findings: localCaseData.integrityResults?.findings || [],
                    lastRun: new Date().toISOString()
                } as any
            });

            await CaseService.runIntegrityValidation(localCaseData._id);
            toast.info("Integrity validation re-triggered.", {
                description: "AI scanning is in progress..."
            });
        } catch (error) {
            toast.error("Failed to trigger validation");
            console.error(error);
        } finally {
            // Keep it "loading" until the socket update arrives or a short delay
            setTimeout(() => setIsRerunning(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border shadow-2xl">
                <div className="flex h-[550px]">
                    {/* Side Navigation */}
                    <div className="w-56 bg-muted/30 border-r border-border p-6 flex flex-col gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 px-2">Management</div>

                        <button
                            onClick={() => setActiveTab('details')}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold",
                                activeTab === 'details' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <User className="w-4 h-4" />
                            Patient Identity
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold",
                                activeTab === 'history' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <ClipboardList className="w-4 h-4" />
                            Clinical Notes
                        </button>

                        <button
                            onClick={() => setActiveTab('integrity')}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold",
                                activeTab === 'integrity' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Study Integrity
                        </button>

                        {isQAOrAdmin && (
                            <button
                                onClick={() => setActiveTab('manage_images')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold",
                                    activeTab === 'manage_images' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                <ImageIcon className="w-4 h-4" />
                                Manage Images
                            </button>
                        )}



                        <div className="mt-auto p-4 bg-background/50 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-2 mb-2 text-indigo-600">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">SLA Status</span>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                                {Math.floor(localCaseData.tatRemainingSeconds / 60)} mins remaining
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-background">
                        <DialogHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-lg font-black uppercase tracking-tight">
                                    Case Details: {localCaseData.patientName}
                                </DialogTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase h-5 bg-muted/30">
                                        ID: {localCaseData.patientId}
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase h-5 bg-indigo-50 border-indigo-100 text-indigo-600">
                                        {localCaseData.status}
                                    </Badge>
                                </div>
                            </div>
                            {(activeTab === 'details' || activeTab === 'history') && (
                                <Button
                                    variant={isEditing ? "outline" : "default"}
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                    className="h-9 px-4 font-bold text-xs uppercase tracking-widest"
                                >
                                    {isEditing ? (
                                        isSubmitting ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />
                                    ) : (
                                        <User className="w-3.5 h-3.5 mr-2" />
                                    )}
                                    {isEditing ? (isSubmitting ? "Saving..." : "Save Changes") : "Edit Profile"}
                                </Button>
                            )}
                        </DialogHeader>

                        <div className="flex-1 flex flex-col min-h-0">
                            {localCaseData.status === 'Rejected' && (
                                <div className="m-8 mb-0 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-1">Rejection Fix Mode Active</h4>
                                        <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                                            <span className="font-black">Reason:</span> {localCaseData.rejectionReason || "No reason provided by the radiologist."}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase text-red-600 border-red-200 bg-white hover:bg-red-50">
                                                Mark as Fixed
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-red-600 hover:bg-red-50">
                                                Appeal Rejection
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="flex-1 overflow-y-auto p-8 pt-6 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Patient Name</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={formData.patientName}
                                                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                                className="bg-muted/10 font-bold border-border"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Patient ID (MRN)</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={formData.patientId}
                                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                                                className="bg-muted/10 font-bold border-border"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Age</Label>
                                                <Input
                                                    disabled={!isEditing}
                                                    type="number"
                                                    value={formData.age}
                                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                    className="bg-muted/10 font-bold border-border"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Gender</Label>
                                                <Input
                                                    disabled={!isEditing}
                                                    value={formData.gender}
                                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                    className="bg-muted/10 font-bold border-border"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Accession Number</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={formData.accessionNumber}
                                                className="bg-muted/10 font-bold border-border"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Clinical Region</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={formData.bodyPart}
                                                onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
                                                className="bg-muted/10 font-bold border-border"
                                            />
                                        </div>
                                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/50 text-center">
                                            <HistoryIcon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                                            <div className="text-[10px] font-black uppercase text-muted-foreground leading-tight px-4">
                                                Created on {new Date(localCaseData.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="flex-1 p-6 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4">
                                    <HistoryManager
                                        history={formData.clinicalHistory || ''}
                                        setHistory={(h) => setFormData({ ...formData, clinicalHistory: h })}
                                        attachedFiles={attachedFiles}
                                        setAttachedFiles={setAttachedFiles}
                                        existingAttachments={remainingAttachments}
                                        onRemoveExistingAttachment={handleRemoveExistingAttachment}
                                    />
                                </div>
                            )}

                            {activeTab === 'integrity' && (
                                <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4">
                                    <IntegrityInsights
                                        findings={localCaseData.integrityResults?.findings || []}
                                        score={localCaseData.integrityResults?.score || 100}
                                        status={localCaseData.integrityResults?.status || 'Pass'}
                                        lastRun={localCaseData.integrityResults?.lastRun}
                                        onRerun={handleRerunValidation}
                                        isRerunning={isRerunning}
                                        studyId={localCaseData.studyInstanceUID}
                                    />
                                </div>
                            )}

                            {activeTab === 'manage_images' && (
                                <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4">
                                    <DICOMManager
                                        caseId={localCaseData._id || ''}
                                        dicomFiles={localCaseData.dicomFiles || []}
                                        onUpdate={async () => {
                                            // Refresh case data after frame manipulation
                                            const updated = await CaseService.getCaseById(localCaseData._id || '');
                                            setLocalCaseData(updated);
                                            onUpdate(updated);
                                        }}
                                        readOnly={!isQAOrAdmin}
                                    />
                                </div>
                            )}


                        </div>

                        <DialogFooter className="p-6 bg-muted/5 border-t border-border flex sm:justify-between items-center">
                            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Audit recorded: System ID #1115</span>
                            </div>
                            <Button variant="ghost" onClick={onClose} className="h-10 px-8 font-black uppercase tracking-widest text-[10px]">Close View</Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
