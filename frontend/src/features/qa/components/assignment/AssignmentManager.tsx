import { useState, useEffect } from 'react';
import { QACase, RadiologistDetails, PartnerDetails } from '../../types';
import { DoctorDiscovery } from './DoctorDiscovery';
import { DoctorDiscoveryService } from '../../services/DoctorDiscoveryService';
import {
    ShieldCheck,
    ArrowLeft,
    Zap,
    Send,
    BellRing,
    Calendar,
    UserCheck,
    Briefcase,
    Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type AssignmentMode = 'radiologist' | 'partner';

interface AssignmentManagerProps {
    caseData: QACase;
    onBack: () => void;
    onComplete: (caseId: string, doctorId: string, partnerId?: string) => void;
}

export function AssignmentManager({ caseData, onBack, onComplete }: AssignmentManagerProps) {
    const [doctors, setDoctors] = useState<RadiologistDetails[]>([]);
    const [partners, setPartners] = useState<PartnerDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [isReassigning, setIsReassigning] = useState(false);
    const [mode, setMode] = useState<AssignmentMode>('radiologist');

    // Initialize with existing assignment if any
    useEffect(() => {
        if (caseData.assignedRadiologist) {
            setSelectedDoctorId(caseData.assignedRadiologist._id);
            setMode('radiologist');
        } else if (caseData.assignedPartner) {
            setSelectedPartnerId(caseData.assignedPartner._id);
            setMode('partner');
        }
    }, [caseData.assignedRadiologist, caseData.assignedPartner]);



    useEffect(() => {
        console.log('[AssignmentManager] Mode changed to:', mode);
        if (mode === 'radiologist') {
            loadDoctors();
        } else {
            loadPartners();
        }
    }, [mode]);

    const loadDoctors = async () => {
        setIsLoading(true);
        try {
            const data = await DoctorDiscoveryService.fetchAvailableDoctors(caseData.modality);
            setDoctors(data);
        } catch (err) {
            toast.error("Failed to load doctor database");
        } finally {
            setIsLoading(false);
        }
    };

    const loadPartners = async () => {
        setIsLoading(true);
        try {
            const data = await DoctorDiscoveryService.fetchPartners();
            setPartners(data);
        } catch (err) {
            toast.error("Failed to load partner list");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = (id: string) => {
        if (mode === 'radiologist') {
            setSelectedDoctorId(id);
            setSelectedPartnerId(null);
            const dr = doctors.find(d => d._id === id);
            toast.info(`Doctor Selected: ${dr?.name}`, {
                description: "Click 'Dispatch Study' to finalize assignment."
            });
        } else {
            setSelectedPartnerId(id);
            setSelectedDoctorId(null);
            const partner = partners.find(p => p._id === id);
            toast.info(`Partner Selected: ${partner?.partnerName}`, {
                description: "Click 'Dispatch Study' to finalize assignment."
            });
        }
    };

    const handleFinalDispatch = async () => {
        if (mode === 'radiologist' && !selectedDoctorId) return;
        if (mode === 'partner' && !selectedPartnerId) return;

        setIsLoading(true);
        try {
            if (mode === 'radiologist') {
                const dr = doctors.find(d => d._id === selectedDoctorId);
                await DoctorDiscoveryService.assignCase(caseData._id, selectedDoctorId);
                toast.success("Study Dispatched", {
                    description: `Notification sent to ${dr?.name}`
                });
                onComplete(caseData._id, selectedDoctorId);
            } else {
                const partner = partners.find(p => p._id === selectedPartnerId);
                await DoctorDiscoveryService.assignCase(caseData._id, undefined, selectedPartnerId);
                toast.success("Study Dispatched to Partner", {
                    description: `Assignment sent to ${partner?.partnerName}`
                });
                onComplete(caseData._id, '', selectedPartnerId);
            }
        } catch (err) {
            toast.error("Dispatch failed");
        } finally {
            setIsLoading(false);
        }
    };

    // Smart Match logic: Find doctor with lowest workload and highest rating (only for radiologist mode)
    const suggestedDoctor = mode === 'radiologist'
        ? doctors
            .filter(dr => dr.online)
            .sort((a, b) => (a.currentWorkload - b.currentWorkload) || (Number(b.rating) - Number(a.rating)))[0]
        : null;

    return (
        <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Verification
                </Button>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1 flex items-center justify-end gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Clinical Dispatch Station
                        </div>
                        <div className="text-sm font-black text-foreground uppercase tracking-tight">QA Final Approval Mode</div>
                    </div>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2">
                <Button
                    variant={mode === 'radiologist' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('radiologist')}
                    className="gap-2"
                >
                    <UserCheck className="w-4 h-4" />
                    Radiologist
                </Button>
                <Button
                    variant={mode === 'partner' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('partner')}
                    className="gap-2"
                >
                    <Globe className="w-4 h-4" />
                    External Partners
                </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                {/* Left: Study Context Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Briefcase className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Case Summary</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 bg-muted/20 rounded-2xl border border-border">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Patient Name</div>
                                <div className="text-lg font-black text-foreground">{caseData.patientName}</div>
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2">{caseData.modality} Scan • {caseData.urgency}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-background border border-border rounded-2xl">
                                    <div className="text-[9px] font-black text-muted-foreground/60 uppercase mb-1">Instances/Series</div>
                                    <div className="text-xs font-black">{caseData.imageCount} / {caseData.seriesCount}</div>
                                </div>
                                <div className="p-4 bg-background border border-border rounded-2xl">
                                    <div className="text-[9px] font-black text-muted-foreground/60 uppercase mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Received
                                    </div>
                                    <div className="text-xs font-black">{new Date(caseData.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-600/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Smart Match Engine</span>
                        </div>
                        {suggestedDoctor ? (
                            <>
                                <p className="text-xs font-bold leading-relaxed opacity-90 mb-6">
                                    AI analysis recommends **{suggestedDoctor.name}** for this {caseData.modality} study based on sub-specialty expertise ({suggestedDoctor.avgTAT} avg TAT) and current workload ({suggestedDoctor.currentWorkload} cases).
                                </p>
                                <div className="p-4 bg-white/10 rounded-xl border border-white/20 flex items-center justify-between">
                                    <div className="text-[10px] font-black uppercase tracking-widest">Match Score</div>
                                    <div className="text-sm font-black">{suggestedDoctor.rating}/5.0</div>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs font-bold leading-relaxed opacity-90 mb-6">
                                No specific recommendation available at this moment. Please select a radiologist from the list.
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Doctor Discovery & Dispatch */}
                <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
                    <div className="flex-1 bg-background rounded-[2rem] border border-border p-8 shadow-sm flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                {mode === 'radiologist' ? (
                                    <UserCheck className="w-5 h-5 text-indigo-600" />
                                ) : (
                                    <Globe className="w-5 h-5 text-indigo-600" />
                                )}
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-foreground">
                                    {mode === 'radiologist' ? 'Select Radiologist' : 'Select Partner'}
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                {mode === 'radiologist' ? (
                                    <>
                                        <Badge variant="outline" className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-muted/20">
                                            {doctors.length} Total
                                        </Badge>
                                        <Badge variant="outline" className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-600 border-green-200">
                                            {doctors.filter(d => d.online).length} Online
                                        </Badge>
                                    </>
                                ) : (
                                    <Badge variant="outline" className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-muted/20">
                                        {partners.length} Total
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {((mode === 'radiologist' && caseData.assignedRadiologist) ||
                            (mode === 'partner' && caseData.assignedPartner)) && !isReassigning ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/50">
                                <UserCheck className="w-12 h-12 text-indigo-200 mb-4" />
                                <h4 className="text-lg font-black text-indigo-900 mb-2">Currently Assigned</h4>
                                <p className="text-sm text-indigo-600 mb-6">
                                    This case is currently assigned to <span className="font-bold">
                                        {mode === 'radiologist'
                                            ? caseData.assignedRadiologist?.name
                                            : caseData.assignedPartner?.partnerName}
                                    </span>
                                </p>
                                <Button
                                    onClick={() => setIsReassigning(true)}
                                    variant="outline"
                                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                >
                                    Change Assignment
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {mode === 'radiologist' ? (
                                    <DoctorDiscovery
                                        doctors={doctors}
                                        isLoading={isLoading}
                                        onAssign={handleAssign}
                                        suggestedDoctorId={suggestedDoctor?._id}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {isLoading ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                Loading partners...
                                            </div>
                                        ) : partners.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                                <p className="font-bold mb-2">No partners available</p>

                                            </div>
                                        ) : (
                                            partners.map(partner => (
                                                <div
                                                    key={partner._id}
                                                    onClick={() => handleAssign(partner._id)}
                                                    className={cn(
                                                        "p-4 border rounded-2xl cursor-pointer transition-all hover:bg-indigo-500/30",
                                                        selectedPartnerId === partner._id
                                                            ? "border-indigo-600 bg-indigo-500/30"
                                                            : "border-border"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold">{partner.partnerName}</div>
                                                            <div className="text-xs text-muted-foreground">{partner.keyPrefix}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-bold">{partner.currentWorkload} active cases</div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {partner.scopes.join(', ')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-card border border-border rounded-[2rem] flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                (selectedDoctorId || selectedPartnerId) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-muted text-muted-foreground"
                            )}>
                                <BellRing className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Assignment Target</div>
                                <div className="text-sm font-black text-foreground">
                                    {selectedDoctorId
                                        ? doctors.find(d => d._id === selectedDoctorId)?.name
                                        : selectedPartnerId
                                            ? partners.find(p => p._id === selectedPartnerId)?.partnerName
                                            : 'Awaiting Selection...'}
                                </div>
                            </div>
                        </div>

                        <Button
                            disabled={(mode === 'radiologist' && !selectedDoctorId) ||
                                (mode === 'partner' && !selectedPartnerId) ||
                                isLoading}
                            onClick={handleFinalDispatch}
                            className={cn(
                                "h-14 px-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl transition-all gap-3",
                                (selectedDoctorId || selectedPartnerId)
                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none border border-border"
                            )}
                        >
                            <Send className="w-5 h-5" />
                            Dispatch to {mode === 'radiologist' ? 'Radiologist' : 'Partner'} {isReassigning ? 'New' : ''} Assignment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
