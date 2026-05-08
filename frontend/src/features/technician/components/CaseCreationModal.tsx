import { useState, useRef, useEffect } from 'react';
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
    ClipboardCheck,
    AlertCircle,
    Loader2,
    ShieldAlert,
    Search,
    Globe,
    FileSearch,
    Upload,
    UserPlus,
    Database,
    Check,
    ChevronRight,
    ChevronLeft,
    FileCode,
    Inbox
} from 'lucide-react';
import { PacsReceivedPanel } from './PacsReceivedPanel';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { HistoryManager } from './HistoryManager';
import { cn } from '@/lib/utils';
import { SubmissionChecklist, Case } from '../types/technician';
import { DicomParserService, DicomMetadata } from '../services/DicomParserService';
import { CaseService, UploadProgress } from '../services/CaseService';
import { OfflineSyncService } from '../services/OfflineSyncService';
import { useSocketContext } from '@/contexts/SocketContext';
import { toast } from 'sonner';
import { useTasks } from '@/contexts/TaskContext';

interface CaseCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (caseData: any) => void;
    editCase?: Case | null;
    /** Called when tech selects a PACS-received case for enrichment */
    onEnrich?: (caseData: Case) => void;
}

export function CaseCreationModal({ isOpen, onClose, onSubmit, editCase, onEnrich }: CaseCreationModalProps) {
    // If Editing, skip Step 1 (Upload)
    const [step, setStep] = useState<1 | 2 | 3 | 4>(editCase ? 2 : 1);
    const [patientType, setPatientType] = useState<'new' | 'existing'>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [parsingError, setParsingError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<DicomMetadata | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isEmergency, setIsEmergency] = useState(editCase?.isEmergency || false);

    // PACS States
    const [uploadMode, setUploadMode] = useState<'folder' | 'pacs' | 'pacs-export' | 'pacs-received'>('folder');
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [pacsSearchId, setPacsSearchId] = useState('');
    const [pacsResults, setPacsResults] = useState<any[]>([]);
    const [isSearchingPacs, setIsSearchingPacs] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [selectedPacsStudy, setSelectedPacsStudy] = useState<any>(null);

    // Export Selection States
    const [exportSource, setExportSource] = useState<'local' | 'database'>('local');
    const [userCases, setUserCases] = useState<Case[]>([]);
    const [selectedExportCase, setSelectedExportCase] = useState<Case | null>(null);
    const [isLoadingCases, setIsLoadingCases] = useState(false);
    const { socket } = useSocketContext();
    const { setLocalTask, removeLocalTask } = useTasks();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize with editCase data if available
    const [patientData, setPatientData] = useState({
        name: editCase?.patientName || '',
        id: editCase?.patientId || '',
        age: editCase?.age?.toString() || '',
        gender: (editCase?.gender || 'M') as 'M' | 'F' | 'O',
        bodyPart: editCase?.bodyPart || '',
        referringDoctor: editCase?.referringDoctor || '',
        institution: editCase?.institution || '',
        accessionNumber: editCase?.accessionNumber || '',
    });

    const [clinicalHistory, setClinicalHistory] = useState(editCase?.clinicalHistory || '');
    const [historyFiles, setHistoryFiles] = useState<File[]>([]);
    const [remainingAttachments, setRemainingAttachments] = useState<any[]>(editCase?.attachments || []);

    const [checklist, setChecklist] = useState<SubmissionChecklist>(editCase?.checklist || {
        detailsVerified: true,
        correctStudy: true,
        historyAdded: true,
        allSeriesUploaded: true
    });

    // Reset state when modal opens/closes or editCase changes
    useEffect(() => {
        if (isOpen) {
            if (editCase) {
                console.log("[CaseCreationModal] Opening in Edit Mode. Case Data:", editCase);
                console.log("[CaseCreationModal] Attachments:", editCase.attachments);
                console.log("[CaseCreationModal] History:", editCase.clinicalHistory);
                setStep(2);
                setPatientData({
                    name: editCase.patientName || '',
                    id: editCase.patientId || '',
                    age: editCase.age?.toString() || '',
                    gender: (editCase.gender || 'M') as 'M' | 'F' | 'O',
                    bodyPart: editCase.bodyPart || '',
                    referringDoctor: editCase.referringDoctor || '',
                    institution: editCase.institution || '',
                    accessionNumber: editCase.accessionNumber || '',
                });
                setClinicalHistory(editCase.clinicalHistory || '');
                setRemainingAttachments(editCase.attachments || []);
                setChecklist(editCase.checklist || {
                    detailsVerified: true,
                    correctStudy: true,
                    historyAdded: !!(editCase.clinicalHistory || (editCase.attachments && editCase.attachments.length > 0)),
                    allSeriesUploaded: true // Assume uploaded if editing
                });
            } else {
                setStep(1);
                setPatientData({
                    name: '', id: '', age: '', gender: 'M',
                    bodyPart: '', referringDoctor: '', institution: '', accessionNumber: '',
                });
                setClinicalHistory('');
                setRemainingAttachments([]);
                setChecklist({
                    detailsVerified: true, correctStudy: true, historyAdded: true, allSeriesUploaded: true
                });
                setSelectedFiles([]);
                setIsEmergency(false);
            }
        }
    }, [isOpen, editCase]);

    // Fetch Sites on mount
    useEffect(() => {
        if (isOpen && (uploadMode === 'pacs' || uploadMode === 'pacs-export')) {
            CaseService.getSites().then(s => {
                setSites(s);
                if (s.length > 0 && !selectedSite) setSelectedSite(s[0].siteId);
            });
        }

        if (isOpen && uploadMode === 'pacs-export' && exportSource === 'database') {
            setIsLoadingCases(true);
            CaseService.getCases().then(c => {
                setUserCases(c);
                setIsLoadingCases(false);
            }).catch(() => setIsLoadingCases(false));
        }
    }, [isOpen, uploadMode, exportSource]);

    // socket-based PACS listeners were removed to allow background decoupling

    // Handle Auto-Search when site changes
    useEffect(() => {
        // Only auto-search if a site is selected
        // We allow search without ID now by sending a wildcard or handling in handlePacsSearch
        if (isOpen && uploadMode === 'pacs' && selectedSite) {
            handlePacsSearch();
        }
    }, [selectedSite, isOpen, uploadMode]);

    const handlePacsSearch = async () => {
        if (!selectedSite) return;
        setIsSearchingPacs(true);
        try {
            // If No ID, search for "any" using wildcard *
            const query = pacsSearchId ? { patientId: pacsSearchId } : { patientName: '' };
            const results = await CaseService.searchPACS(selectedSite, query);
            setPacsResults(results);
            if (results.length === 0 && pacsSearchId) toast.error("No studies found for this ID");
        } catch (err) {
            toast.error("PACS Connection Failed");
        } finally {
            setIsSearchingPacs(false);
        }
    };

    const handlePacsImport = async (study: any) => {
        setSelectedPacsStudy(study);

        // Helper to calculate age from DICOM date (YYYYMMDD)
        const calculateAge = (birthDate: string) => {
            if (!birthDate || birthDate.length !== 8) return "";
            const year = parseInt(birthDate.substring(0, 4));
            const month = parseInt(birthDate.substring(4, 6));
            const day = parseInt(birthDate.substring(6, 8));
            const today = new Date();
            let age = today.getFullYear() - year;
            const m = (today.getMonth() + 1) - month;
            if (m < 0 || (m === 0 && today.getDate() < day)) {
                age--;
            }
            return age.toString();
        };

        // Map gender
        let mappedGender: 'M' | 'F' | 'O' = 'O';
        const rawGender = study.patientSex?.toUpperCase() || '';
        if (rawGender === 'M') mappedGender = 'M';
        if (rawGender === 'F') mappedGender = 'F';

        // Auto-fill patient data from search result (normalized fields)
        setPatientData(prev => ({
            ...prev,
            name: study.patientName || "ANONYMOUS",
            id: study.patientId || pacsSearchId,
            accessionNumber: study.accessionNumber || "",
            bodyPart: study.studyDescription || "",
            age: calculateAge(study.patientBirthDate),
            gender: mappedGender,
            referringDoctor: study.referringPhysicianName || "",
            institution: study.institutionName || "",
        }));

        toast.info(`Study selected. Metadata auto-filled.`);
        setStep(2); // Jump to patient details
    };

    const handleRemoveExistingAttachment = (index: number) => {
        setRemainingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const steps = [
        { id: 1, name: 'Upload', icon: Upload },
        { id: 2, name: 'Patient', icon: UserPlus },
        { id: 3, name: 'History', icon: Database },
        { id: 4, name: 'Review', icon: ClipboardCheck }
    ];

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;

        setSelectedFiles(files);
        setIsParsing(true);
        setParsingError(null);

        try {
            const parsedMeta = await DicomParserService.parseFiles(files);
            setMetadata(parsedMeta);

            // Auto-populate Patient step (Only for case creation, not PACS Export)
            if (uploadMode !== 'pacs-export') {
                setPatientData(prev => ({
                    ...prev,
                    name: parsedMeta.patientName,
                    id: parsedMeta.patientId,
                    age: parsedMeta.patientAge.toString(),
                    gender: parsedMeta.patientGender,
                    bodyPart: parsedMeta.bodyPart,
                    institution: parsedMeta.institution,
                    accessionNumber: parsedMeta.accessionNumber
                }));

                setChecklist(prev => ({ ...prev, allSeriesUploaded: true }));
                setStep(2);
            }
            toast.success(`Parsed ${files.length} DICOM files`);
        } catch (err) {
            setParsingError("Failed to parse DICOM headers. You may need to enter patient data manually.");
            toast.error("Metadata extraction failed");
            if (uploadMode !== 'pacs-export') {
                setStep(2); // Still move to next step so they can enter manually
            }
        } finally {
            setIsParsing(false);
        }
    };

    const handleExportSubmit = async () => {
        setIsSubmitting(true);
        if (!selectedSite) {
            toast.error("Please select a target hospital site.");
            setIsSubmitting(false);
            return;
        }

        const isDatabase = exportSource === 'database';
        if (isDatabase && !selectedExportCase) {
            toast.error("Please select an existing study to export.");
            setIsSubmitting(false);
            return;
        }
        if (!isDatabase && selectedFiles.length === 0) {
            toast.error("Please select a study folder to upload.");
            setIsSubmitting(false);
            return;
        }

        // Status check for existing studies
        if (isDatabase && selectedExportCase) {
            if (selectedExportCase.status === 'Incomplete') {
                toast.error("Cannot export an 'Incomplete' study. Some files may be missing.");
                setIsSubmitting(false);
                return;
            }
            if (selectedExportCase.status === 'Uploaded' && (selectedExportCase as any).expectedFiles > 0 && selectedExportCase.dicomFiles.length < (selectedExportCase as any).expectedFiles) {
                toast.error("Study is still being received from PACS. Please wait until download completes.");
                setIsSubmitting(false);
                return;
            }
        }

        const studyInstanceUID = isDatabase ? selectedExportCase?.studyInstanceUID : undefined;
        const filesToUpload = isDatabase ? [] : selectedFiles;

        setUploadProgress({
            uploadedFiles: 0,
            totalFiles: filesToUpload.length || 1,
            phase: 'uploading',
            failedCount: 0,
            completedBatches: 0,
            totalBatches: Math.ceil(filesToUpload.length / 10) || 1
        });

        try {
            const result = await CaseService.exportToPACS(filesToUpload, selectedSite, {
                studyInstanceUID,
                onProgress: (progress) => setUploadProgress(progress)
            });

            // The UID might come back from the server if it was a new upload
            const finalUID = result.studyInstanceUID || studyInstanceUID;

            if (finalUID) {
                // Background Task widget will take over the progress
                toast.success("Export started in background");
            } else {
                toast.success("Export started in background");
            }

            onSubmit({ status: 'Exported' }); // Pass generic payload so modal auto-closes
            onClose();
        } catch (err: any) {
            console.error("Export Error:", err);
            toast.error("PACS Export Failed", {
                description: err.response?.data?.message || err.message || "Failed to trigger PACS push",
                duration: 8000,
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
        }
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);

        // Stage study UID
        const isValidUID = (uid: string | undefined | null) =>
            uid && uid !== "undefined" && uid !== "null" && uid.trim() !== "";

        const effectiveStudyUID = isValidUID(metadata?.studyInstanceUID)
            ? metadata!.studyInstanceUID
            : (isValidUID(editCase?.studyInstanceUID) ? editCase!.studyInstanceUID : `MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

        const finalData: any = {
            patientName: patientData.name,
            patientId: patientData.id,
            age: patientData.age,
            gender: patientData.gender,
            bodyPart: patientData.bodyPart,
            institution: patientData.institution,
            accessionNumber: patientData.accessionNumber,
            referringDoctor: patientData.referringDoctor,
            checklist: {
                ...checklist,
                historyAdded: !!(clinicalHistory || historyFiles.length > 0 || (editCase?.attachments && remainingAttachments.length > 0))
            },
            clinicalHistory: clinicalHistory || '',
            attachments: remainingAttachments,
            isEmergency,
            studyInstanceUID: effectiveStudyUID,
            uploadMode
        };

        setUploadProgress(null);

        try {
            // PRODUCTION ARCHITECTURE:
            // If offline, queue encrypted data for later sync.
            if (!navigator.onLine) {
                toast.info("Offline: Study encrypted and queued for auto-sync.");
                await OfflineSyncService.queueStudy(finalData, selectedFiles);
                onSubmit(finalData);
                onClose();
                return;
            }

            let result;
            if (editCase) {
                // Update specific fields
                result = await CaseService.updateCase(editCase._id, finalData, historyFiles);
                toast.success("Case study updated successfully");
            } else if (uploadMode === 'pacs' && selectedPacsStudy) {
                // PACS Creation Flow
                result = await CaseService.createFromPACS({
                    ...finalData,
                    siteId: selectedSite,
                    studyInstanceUID: selectedPacsStudy.studyInstanceUID,
                    modality: selectedPacsStudy.modality,
                    studyDate: selectedPacsStudy.studyDate
                });
                toast.success("PACS Import started in background");
            } else {
                // Folder Creation flow with progress tracking
                const taskId = `LU_${Date.now()}`;
                setLocalTask({
                    taskId,
                    type: 'LOCAL_UPLOAD',
                    status: 'RUNNING',
                    progress: 0,
                    total: selectedFiles.length,
                    message: 'Uploading from browser...',
                    metadata: { patientName: finalData.patientName }
                });

                CaseService.uploadStudy(selectedFiles, {
                    ...finalData,
                    metadata: { ...metadata, attachments: historyFiles }
                }, (progress) => {
                    setLocalTask({
                        taskId,
                        type: 'LOCAL_UPLOAD',
                        status: 'RUNNING',
                        progress: progress.uploadedFiles,
                        total: progress.totalFiles,
                        message: `Uploading Files...`,
                        metadata: { patientName: finalData.patientName }
                    });
                }).then(() => {
                    setLocalTask({
                        taskId,
                        type: 'LOCAL_UPLOAD',
                        status: 'COMPLETED',
                        progress: selectedFiles.length,
                        total: selectedFiles.length,
                        message: 'Upload Complete',
                        metadata: { patientName: finalData.patientName }
                    });
                    setTimeout(() => removeLocalTask(taskId), 3000);
                }).catch(e => {
                    setLocalTask({
                        taskId,
                        type: 'LOCAL_UPLOAD',
                        status: 'FAILED',
                        progress: 0,
                        total: selectedFiles.length,
                        message: 'Upload Failed',
                        metadata: { patientName: finalData.patientName }
                    });
                    toast.error("Network connection unstable. Saving to offline queue...");
                    OfflineSyncService.queueStudy(finalData, selectedFiles);
                    setTimeout(() => removeLocalTask(taskId), 8000);
                });
                toast.success("Folder upload started in background");
                result = { status: 'Background_Upload' };
            }

            onSubmit(result);
            onClose();
        } catch (err: any) {
            console.error("Submission Error:", err);
            setIsSubmitting(false);

            // 1. Conflict: Study already exists
            if (err.response?.status === 409) {
                toast.error("Duplicate Study", {
                    description: "This case already exists in the system."
                });
                return;
            }

            // 2. PACS/Backend Error (502/400 with message)
            const backendError = err.response?.data?.message;
            if (backendError && (err.response?.status === 502 || err.response?.status === 400)) {
                toast.error("PACS Ingestion Failed", {
                    description: backendError,
                    duration: 8000,
                });
                return;
            }

            if (uploadMode === 'folder') {
                // For offline sync fallback check
                toast.error("Network connection unstable. Saving to offline queue...");
                await OfflineSyncService.queueStudy(finalData, selectedFiles);
                onSubmit(finalData);
                onClose();
            } else {
                toast.error("System Error", {
                    description: backendError || "Internal server error. Please contact administrator."
                });
            }
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
        }
    };

    const canGoNext = () => {
        if (step === 1) {
            if (uploadMode === 'folder') return selectedFiles.length > 0;
            if (uploadMode === 'pacs') return selectedPacsStudy !== null;
            return false;
        }
        if (step === 2) return patientData.name && patientData.age && patientData.id;
        if (step === 3) return true; // Always allow next, but checklist will be validated in step 4
        if (step === 4) return Object.values(checklist).every(v => v === true);
        return true;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[96%] sm:w-full max-w-4xl p-0 overflow-hidden bg-background border-border shadow-2xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col">
                {/* Upload Progress Overlay */}
                {isSubmitting && uploadProgress && (
                    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-full max-w-md px-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Phase Icon */}
                            <div className="flex flex-col items-center gap-2 sm:gap-3">
                                {uploadProgress.phase === 'complete' ? (
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                                        <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin" />
                                    </div>
                                )}
                                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-center">
                                    {uploadProgress.phase === 'creating' && 'Creating Study...'}
                                    {uploadProgress.phase === 'uploading' && 'Uploading DICOM Data'}
                                    {uploadProgress.phase === 'exporting' && 'Exporting to PACS...'}
                                    {uploadProgress.phase === 'retrying' && 'Retrying Failed Batches...'}
                                    {uploadProgress.phase === 'complete' && 'Upload Complete!'}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium text-center max-w-[280px] sm:max-w-none">
                                    {uploadProgress.phase === 'creating' && 'Initializing case record and uploading first batch...'}
                                    {uploadProgress.phase === 'uploading' && `Batch ${uploadProgress.completedBatches} of ${uploadProgress.totalBatches}`}
                                    {uploadProgress.phase === 'exporting' && `Transmitting DICOM files directly to target PACS site via C-STORE...`}
                                    {uploadProgress.phase === 'retrying' && `${uploadProgress.failedCount} batch(es) being retried`}
                                    {uploadProgress.phase === 'complete' && 'All files have been transmitted successfully'}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progress</span>
                                    <span className="text-xl sm:text-2xl font-black tabular-nums">
                                        {uploadProgress.totalFiles > 0 ? Math.round((uploadProgress.uploadedFiles / uploadProgress.totalFiles) * 100) : 0}
                                        <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                                    </span>
                                </div>
                                <div className="h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500 ease-out",
                                            uploadProgress.phase === 'complete'
                                                ? 'bg-green-500'
                                                : uploadProgress.phase === 'retrying'
                                                    ? 'bg-amber-500'
                                                    : 'bg-primary'
                                        )}
                                        style={{ width: `${uploadProgress.totalFiles > 0 ? (uploadProgress.uploadedFiles / uploadProgress.totalFiles) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] sm:text-[11px] text-muted-foreground font-bold italic sm:not-italic">
                                    <span>{uploadProgress.uploadedFiles.toLocaleString()} / {uploadProgress.totalFiles.toLocaleString()} files</span>
                                    {uploadProgress.phase !== 'exporting' && (
                                        <span>Batch {uploadProgress.completedBatches} / {uploadProgress.totalBatches}</span>
                                    )}
                                </div>
                            </div>

                            {/* Warning for retries */}
                            {uploadProgress.phase === 'retrying' && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold animate-in fade-in duration-300">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    Some batches failed and are being retried automatically.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">
                    {/* Left Sidebar Steps - Hidden on mobile, shown on sm+ */}
                    <div className="hidden sm:flex w-48 bg-muted/30 border-r border-border p-5 flex-col gap-5 shrink-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 px-2">Workflow</div>
                        {steps.map((s) => (
                            <div
                                key={s.id}
                                className={cn(
                                    "flex items-center gap-3 transition-all px-2 py-1.5 rounded-xl",
                                    step === s.id ? "bg-primary/5 text-primary" : (step > s.id ? "text-green-500" : "text-muted-foreground/40")
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all",
                                    step === s.id ? "border-primary bg-background shadow-sm" : (step > s.id ? "border-green-500 bg-green-500/10" : "border-transparent")
                                )}>
                                    {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                                </div>
                                <div className="text-[11px] font-black uppercase tracking-tight">{s.name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Mobile Stepper */}
                        <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border gap-1 overflow-x-auto no-scrollbar shrink-0">
                            {steps.map((s) => (
                                <div key={s.id} className="flex flex-col items-center gap-1 shrink-0 px-2 first:pl-0 last:pr-0">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                        step === s.id ? "bg-primary scale-125 shadow-[0_0_8px_rgba(var(--primary),0.5)]" : step > s.id ? "bg-green-500" : "bg-muted-foreground/30"
                                    )} />
                                    <span className={cn(
                                        "text-[7px] font-black uppercase tracking-tighter transition-colors",
                                        step === s.id ? "text-primary" : "text-muted-foreground/50"
                                    )}>
                                        {s.name}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <DialogHeader className="p-3 sm:p-4 border-b border-border flex flex-row items-center justify-between bg-muted/5 shrink-0">
                            <DialogTitle className="text-[12px] sm:text-base font-black uppercase tracking-tight truncate flex-1 min-w-0 mr-4">
                                {editCase ? `Update ${editCase.patientName} Study` : `${steps.find(s => s.id === step)?.name} Initialization`}
                            </DialogTitle>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded whitespace-nowrap">Step {step}/4</span>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 italic:not-italic">
                            {step === 1 && (
                                <div className="h-full flex flex-col">
                                    {/* Mode Selector */}
                                    <div className="flex flex-col sm:flex-row bg-muted/20 p-1 rounded-xl sm:rounded-2xl border border-border w-full sm:w-fit mb-4 sm:mb-8 mx-auto gap-1">
                                        <button
                                            onClick={() => setUploadMode('folder')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all",
                                                uploadMode === 'folder' ? "bg-background shadow-lg text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span className="truncate">Folder Upload</span>
                                        </button>
                                        <button
                                            onClick={() => setUploadMode('pacs')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all",
                                                uploadMode === 'pacs' ? "bg-background shadow-lg text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span className="truncate">PACS Import</span>
                                        </button>
                                        <button
                                            onClick={() => setUploadMode('pacs-export')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all",
                                                uploadMode === 'pacs-export' ? "bg-background shadow-lg text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span className="truncate">PACS Export</span>
                                        </button>
                                        <button
                                            onClick={() => setUploadMode('pacs-received')}
                                            className={cn(
                                                "flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all",
                                                uploadMode === 'pacs-received' ? "bg-background shadow-lg text-emerald-600 border border-border/50" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Inbox className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span className="truncate">PACS Received</span>
                                        </button>
                                    </div>

                                    {uploadMode === 'folder' ? (
                                        <div className="flex-1 flex flex-col items-center justify-center">
                                            {isParsing ? (
                                                <div className="text-center space-y-4">
                                                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold uppercase tracking-wider text-sm">Ingesting DICOM Objects</h3>
                                                        <p className="text-[11px] text-muted-foreground italic font-medium">Extracting patient identity and study context...</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full max-w-md space-y-6">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        className="hidden"
                                                        webkitdirectory=""
                                                        {...({ directory: "" } as any)}
                                                        onChange={handleFileChange}
                                                    />
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="group relative h-48 sm:h-64 flex flex-col items-center justify-center text-center p-6 sm:p-8 border-2 border-dashed border-border rounded-3xl bg-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                                                    >
                                                        <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/40 mb-3 sm:mb-4 group-hover:text-primary group-hover:scale-110 transition-all" />
                                                        <h3 className="text-[13px] sm:text-sm font-black uppercase tracking-widest mb-1 sm:mb-2 text-foreground">Upload Study Folder</h3>
                                                        <p className="text-[10px] sm:text-[11px] text-muted-foreground px-4 leading-relaxed font-medium">
                                                            Select the study directory. Metadata will be auto-parsed.
                                                        </p>
                                                    </div>
                                                    {selectedFiles.length > 0 && (
                                                        <div className="mt-3 p-3 bg-muted/30 border border-border rounded-xl animate-in fade-in slide-in-from-top-2">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FileCode className="w-3.5 h-3.5 text-primary" />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground">Staged Payload</span>
                                                                </div>
                                                                <Badge variant="secondary" className="text-[8px] font-black">{selectedFiles.length} DICOM Objects</Badge>
                                                            </div>
                                                            <div className="space-y-1 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {selectedFiles.slice(0, 5).map((f, i) => (
                                                                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0 gap-3">
                                                                        <span className="text-[10px] font-medium truncate flex-1 text-muted-foreground">{f.webkitRelativePath || f.name}</span>
                                                                        <span className="text-[9px] font-bold text-muted-foreground shrink-0">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                                                                    </div>
                                                                ))}
                                                                {selectedFiles.length > 5 && (
                                                                    <p className="text-[9px] text-center text-muted-foreground font-medium pt-2 italic">+ {selectedFiles.length - 5} additional files</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : uploadMode === 'pacs-export' ? (
                                        <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest block">Target Hospital Site</Label>
                                                    <select
                                                        value={selectedSite}
                                                        onChange={(e) => setSelectedSite(e.target.value)}
                                                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-3 text-xs font-bold focus:ring-1 focus:ring-primary/40 outline-none"
                                                    >
                                                        <option value="" disabled>Select destination PACS...</option>
                                                        {sites.map(s => (
                                                            <option key={s.siteId} value={s.siteId}>{s.name} ({s.siteId})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest block">Export Source</Label>
                                                    <div className="flex bg-muted/30 p-1 rounded-xl border border-border h-[46px]">
                                                        <button
                                                            onClick={() => setExportSource('local')}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center gap-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition-all",
                                                                exportSource === 'local' ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                            <span className="truncate">Local Folder</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setExportSource('database')}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center gap-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition-all",
                                                                exportSource === 'database' ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            <Database className="w-3.5 h-3.5" />
                                                            <span className="truncate">Existing Case</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {exportSource === 'local' ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-full max-w-md space-y-6">
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            className="hidden"
                                                            webkitdirectory=""
                                                            {...({ directory: "" } as any)}
                                                            onChange={handleFileChange}
                                                        />
                                                        <div
                                                            onClick={() => !selectedSite ? toast.error("Please select a target hospital site first.") : fileInputRef.current?.click()}
                                                            className={cn(
                                                                "group relative h-48 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-3xl transition-all cursor-pointer",
                                                                !selectedSite ? "opacity-50 cursor-not-allowed border-border/50" : "border-border hover:border-primary/50 hover:bg-primary/5 bg-muted/10"
                                                            )}
                                                        >
                                                            <Upload className="w-12 h-12 text-muted-foreground/40 mb-4 group-hover:text-primary group-hover:scale-110 transition-all" />
                                                            <h3 className="text-sm font-black uppercase tracking-widest mb-1">Select Study Folder</h3>
                                                            <p className="text-[11px] text-muted-foreground px-4 font-medium">
                                                                Select local DICOMs to transmit directly to {sites.find(s => s.siteId === selectedSite)?.name || 'the selected site'}.
                                                            </p>
                                                        </div>

                                                        {selectedFiles.length > 0 && (
                                                            <div className="flex flex-col gap-4">
                                                                <div className="flex items-center gap-2 justify-center py-2 px-4 rounded-full bg-green-500/5 border border-green-500/10 text-[10px] text-green-600 font-bold uppercase tracking-widest">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    {selectedFiles.length} files staged for export
                                                                </div>
                                                                <Button
                                                                    onClick={handleExportSubmit}
                                                                    disabled={isSubmitting}
                                                                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs"
                                                                >
                                                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Transmit to Remote PACS"}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col gap-4">
                                                    <div className="flex-1 border border-border rounded-2xl bg-muted/5 p-4 overflow-y-auto max-h-[400px]">
                                                        {isLoadingCases ? (
                                                            <div className="h-full flex flex-col items-center justify-center gap-3">
                                                                <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                                                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Loading studies...</p>
                                                            </div>
                                                        ) : userCases.length > 0 ? (
                                                            <div className="grid gap-3">
                                                                {userCases.map((study) => (
                                                                    <div key={study._id} onClick={() => setSelectedExportCase(study)} className={cn(
                                                                        "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-background border rounded-xl hover:border-primary/30 transition-all shadow-sm cursor-pointer group gap-3",
                                                                        selectedExportCase?._id === study._id ? "border-primary bg-primary/5" : "border-border"
                                                                    )}>
                                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                                            <div className={cn(
                                                                                "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                                                                                selectedExportCase?._id === study._id ? "bg-primary text-primary-foreground" : "bg-primary/5 text-primary"
                                                                            )}>
                                                                                {study.status === 'Incomplete' ? <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="text-xs font-black uppercase tracking-tight flex flex-wrap items-center gap-1.5 min-w-0">
                                                                                    <span className="truncate max-w-[120px] sm:max-w-none">{study.patientName}</span>
                                                                                    {study.status === 'Incomplete' && <Badge variant="destructive" className="text-[7px] sm:text-[8px] h-3.5 sm:h-4 shrink-0">Incomplete</Badge>}
                                                                                    {study.status === 'Uploaded' && (study as any).expectedFiles > 0 && study.dicomFiles.length < (study as any).expectedFiles && <Badge variant="outline" className="text-[7px] sm:text-[8px] h-3.5 sm:h-4 animate-pulse shrink-0">Downloading</Badge>}
                                                                                </div>
                                                                                <div className="text-[9px] sm:text-[10px] text-muted-foreground flex flex-wrap gap-2 sm:gap-3 mt-1 font-bold">
                                                                                    <span className="text-indigo-500">{study.modality}</span>
                                                                                    <span className="truncate max-w-[80px] sm:max-w-none">{study.patientId}</span>
                                                                                    <span>{new Date(study.studyDate).toLocaleDateString()}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
                                                                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                                                                    <Search className="w-6 h-6 text-muted-foreground/40" />
                                                                </div>
                                                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">No studies found in your queue.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {selectedExportCase && (
                                                        <div className="pt-2 animate-in slide-in-from-bottom-4 shrink-0">
                                                            <Button
                                                                onClick={handleExportSubmit}
                                                                disabled={isSubmitting}
                                                                className="w-full h-10 sm:h-12 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs"
                                                            >
                                                                {isSubmitting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto" /> : `Transmit to Remote PACS`}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-4 sm:items-end">
                                                <div className="sm:col-span-1">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest mb-2 block">Hospital Site</Label>
                                                    <select
                                                        value={selectedSite}
                                                        onChange={(e) => setSelectedSite(e.target.value)}
                                                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-primary/40"
                                                    >
                                                        {sites.map(s => (
                                                            <option key={s.siteId} value={s.siteId}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <Label className="text-[10px] uppercase font-black tracking-widest mb-2 block">Patient ID / MRN</Label>
                                                    <div className="relative">
                                                        <Input
                                                            value={pacsSearchId}
                                                            onChange={(e) => setPacsSearchId(e.target.value)}
                                                            placeholder="Enter ID to search PACS..."
                                                            className="bg-muted/30 border-border h-10 pl-10 font-bold text-xs"
                                                            onKeyDown={(e) => e.key === 'Enter' && handlePacsSearch()}
                                                        />
                                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-1 h-full flex flex-col justify-end">
                                                    <Button
                                                        onClick={handlePacsSearch}
                                                        disabled={isSearchingPacs || !pacsSearchId}
                                                        className="w-full h-10 rounded-xl font-black uppercase text-[10px] mt-2 sm:mt-0"
                                                    >
                                                        {isSearchingPacs ? <Loader2 className="w-4 h-4 animate-spin" /> : "Query PACS"}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex-1 border border-border rounded-2xl bg-muted/5 p-4 overflow-y-auto min-h-[300px]">
                                                {pacsResults.length > 0 ? (
                                                    <div className="grid gap-3">
                                                        {pacsResults.map((study, idx) => (
                                                            <div key={idx} className={cn(
                                                                "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-background border rounded-xl hover:border-primary/30 transition-all shadow-sm group gap-3",
                                                                selectedPacsStudy?.studyInstanceUID === study.studyInstanceUID ? "border-primary bg-primary/5" : "border-border"
                                                            )}>
                                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                                    <div className={cn(
                                                                        "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                                                                        selectedPacsStudy?.studyInstanceUID === study.studyInstanceUID ? "bg-primary text-primary-foreground" : "bg-primary/5 text-primary"
                                                                    )}>
                                                                        <FileSearch className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="text-xs font-black uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">
                                                                            {study.patientName || "ANONYMOUS"}
                                                                        </div>
                                                                        <div className="text-[9px] sm:text-[10px] text-muted-foreground flex flex-wrap gap-2 sm:gap-3 mt-1 font-bold">
                                                                            <span className="truncate max-w-[100px] sm:max-w-none">{study.studyDescription || 'Unknown Study'}</span>
                                                                            <span className="text-indigo-500 shrink-0">{study.modality || "DICOM"}</span>
                                                                            <span className="shrink-0">{study.studyDate}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant={selectedPacsStudy?.studyInstanceUID === study.studyInstanceUID ? "default" : "outline"}
                                                                    onClick={() => handlePacsImport(study)}
                                                                    className="w-full sm:w-auto rounded-lg text-[9px] font-black uppercase tracking-widest px-4 h-9 sm:h-8 transition-all"
                                                                >
                                                                    {selectedPacsStudy?.studyInstanceUID === study.studyInstanceUID ? (
                                                                        <><Check className="w-3 h-3 mr-1" /> Selected</>
                                                                    ) : "Select Study"}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                                        <Search className="w-12 h-12 text-muted-foreground/20 mb-4" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                            Enter Patient ID above to perform <br /> a live PACS query
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PACS Received Panel — 4th tab, read/review mode ── */}
                            {step === 1 && uploadMode === 'pacs-received' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <PacsReceivedPanel
                                        onEnrich={(caseData) => {
                                            onClose();
                                            onEnrich?.(caseData);
                                        }}
                                    />
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                        <div className="flex bg-muted/30 p-1 rounded-xl sm:rounded-2xl border border-border w-full sm:w-fit">
                                            <button
                                                onClick={() => setPatientType('new')}
                                                className={cn(
                                                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all",
                                                    patientType === 'new' ? "bg-background shadow-lg text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                New Patient
                                            </button>
                                            <button
                                                onClick={() => setPatientType('existing')}
                                                className={cn(
                                                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all",
                                                    patientType === 'existing' ? "bg-background shadow-lg text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Existing Patient
                                            </button>
                                        </div>
                                        {metadata && (
                                            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-green-600 uppercase bg-green-50 px-3 py-1.5 rounded-full border border-green-100 self-end sm:self-auto">
                                                <Database className="w-3.5 h-3.5" />
                                                DICOM Header Synced
                                            </div>
                                        )}
                                    </div>

                                    {/* Emergency Toggle */}
                                    <div className={cn(
                                        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all flex items-center justify-between",
                                        isEmergency
                                            ? "bg-red-500/5 border-red-500/30 shadow-lg shadow-red-500/10"
                                            : "bg-muted/10 border-border hover:border-muted-foreground/20"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0",
                                                isEmergency ? "bg-red-500 text-white animate-pulse" : "bg-muted text-muted-foreground"
                                            )}>
                                                <ShieldAlert className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className={cn("text-[11px] sm:text-xs font-black uppercase tracking-widest", isEmergency ? "text-red-600" : "text-foreground")}>
                                                    Emergency Study (STAT)
                                                </h3>
                                                <p className="text-[9px] text-muted-foreground font-medium mt-0.5 max-w-[150px] sm:max-w-none">
                                                    Flags as priority 1.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isEmergency && (
                                                <Badge variant="destructive" className="animate-in zoom-in duration-300 text-[9px] font-black uppercase tracking-tighter">
                                                    Priority 1
                                                </Badge>
                                            )}
                                            <Switch
                                                checked={isEmergency}
                                                onCheckedChange={setIsEmergency}
                                                className="data-[state=checked]:bg-red-500"
                                            />
                                        </div>
                                    </div>

                                    {patientType === 'existing' ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="relative">
                                                <Input
                                                    placeholder="Search by Patient Name or ID..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="h-10 sm:h-11 pl-12 rounded-2xl bg-muted/20 border-border font-bold text-sm"
                                                />
                                                <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div className="p-12 border-2 border-dashed border-border rounded-3xl text-center">
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                                    {searchQuery ? "No patients found matching your search" : "Enter details to search clinical database"}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex bg-muted/20 p-1 rounded-xl border border-border w-full sm:w-fit">
                                                {(['M', 'F', 'O'] as const).map((g) => (
                                                    <button
                                                        key={g}
                                                        onClick={() => setPatientData({ ...patientData, gender: g })}
                                                        className={cn(
                                                            "flex-1 sm:flex-none px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all",
                                                            patientData.gender === g ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground/70">Patient ID</Label>
                                                    <Input
                                                        value={patientData.id}
                                                        onChange={(e) => setPatientData({ ...patientData, id: e.target.value })}
                                                        className="bg-muted/30 border-border h-10 font-bold text-sm focus:ring-1 focus:ring-primary/40"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground/70">Full Name</Label>
                                                    <Input
                                                        value={patientData.name}
                                                        onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                                                        className="bg-muted/30 border-border h-10 font-bold text-sm focus:ring-1 focus:ring-primary/40"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground/70">Age</Label>
                                                        <Input
                                                            type="number"
                                                            value={patientData.age}
                                                            onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                                                            className="bg-muted/30 border-border h-10 font-bold text-sm focus:ring-1 focus:ring-primary/40"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground/70">Accession #</Label>
                                                        <Input
                                                            value={patientData.accessionNumber}
                                                            onChange={(e) => setPatientData({ ...patientData, accessionNumber: e.target.value })}
                                                            className="bg-muted/30 border-border h-10 font-bold text-sm focus:ring-1 focus:ring-primary/40"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground/70">Body Part</Label>
                                                    <Input
                                                        value={patientData.bodyPart}
                                                        onChange={(e) => setPatientData({ ...patientData, bodyPart: e.target.value })}
                                                        placeholder="e.g. BRAIN, CHEST"
                                                        className="bg-muted/30 border-border h-10 font-bold text-sm focus:ring-1 focus:ring-primary/40"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground/70">Institution</Label>
                                                    <Input
                                                        value={patientData.institution}
                                                        onChange={(e) => setPatientData({ ...patientData, institution: e.target.value })}
                                                        className="bg-muted/30 border-border h-10 font-bold text-sm focus:ring-1 focus:ring-primary/40"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <HistoryManager
                                    history={clinicalHistory}
                                    setHistory={setClinicalHistory}
                                    attachedFiles={historyFiles}
                                    setAttachedFiles={setHistoryFiles}
                                    existingAttachments={remainingAttachments}
                                    onRemoveExistingAttachment={handleRemoveExistingAttachment}
                                />
                            )}

                            {step === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 sm:p-5 rounded-2xl flex items-start gap-3 sm:gap-4">
                                        <div className="bg-indigo-500/10 p-2 rounded-lg shrink-0">
                                            <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                                        </div>
                                        <div className="text-[11px] sm:text-[13px] leading-relaxed">
                                            <span className="font-black text-indigo-700 block uppercase tracking-tighter mb-1 text-xs sm:text-sm">Final QC Review</span>
                                            Please verify patient identity matches the DICOM headers before submission.
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        {Object.entries({
                                            detailsVerified: "Patient identity (Name & ID) confirmed",
                                            correctStudy: "Technical study parameters verified",
                                            historyAdded: "Mandatory clinical history attached",
                                            allSeriesUploaded: `Complete study (${selectedFiles.length} images) ingested`
                                        }).map(([key, label]) => (
                                            <div
                                                key={key}
                                                onClick={() => setChecklist({ ...checklist, [key]: !checklist[key as keyof SubmissionChecklist] })}
                                                className={cn(
                                                    "flex items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer group",
                                                    checklist[key as keyof SubmissionChecklist]
                                                        ? "bg-green-500/5 border-green-500/20"
                                                        : "bg-muted/5 border-border hover:bg-muted/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border-2 mr-3 sm:mr-4 shrink-0 transition-all",
                                                    checklist[key as keyof SubmissionChecklist] ? "bg-green-600 border-green-600 text-white" : "border-muted-foreground/30"
                                                )}>
                                                    {checklist[key as keyof SubmissionChecklist] && <Check className="w-3 h-3 sm:w-4 sm:h-4" />}
                                                </div>
                                                <span className={cn("text-[10px] sm:text-xs font-black uppercase tracking-tight", checklist[key as keyof SubmissionChecklist] ? "text-green-700" : "text-muted-foreground")}>
                                                    {label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-3 sm:p-4 bg-muted/10 border-t border-border flex flex-row items-center justify-between gap-2 shrink-0 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                            <Button
                                variant="ghost"
                                disabled={step === 1 || isSubmitting}
                                onClick={() => setStep(s => (s - 1) as any)}
                                className="font-bold uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-10 px-3 sm:px-6"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Back
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="font-bold uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-10 px-3 sm:px-6 hover:bg-background/50"
                                >
                                    Cancel
                                </Button>
                                {step < 4 && uploadMode !== 'pacs-export' && uploadMode !== 'pacs-received' ? (
                                    <Button
                                        onClick={() => setStep(s => (s + 1) as any)}
                                        disabled={!canGoNext() || isSubmitting}
                                        className="font-bold uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-10 px-4 sm:px-8 bg-primary shadow-lg shadow-primary/20"
                                    >
                                        Next
                                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:mr-2" />
                                    </Button>
                                ) : step === 4 ? (
                                    <Button
                                        onClick={handleFinalSubmit}
                                        disabled={!canGoNext() || isSubmitting}
                                        className="font-black uppercase tracking-widest text-[9px] sm:text-[10px] h-10 sm:h-10 px-4 sm:px-8 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                Submit
                                                <Check className="w-3.5 h-3.5 ml-1 sm:ml-2" />
                                            </>
                                        )}
                                    </Button>
                                ) : null}
                            </div>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
