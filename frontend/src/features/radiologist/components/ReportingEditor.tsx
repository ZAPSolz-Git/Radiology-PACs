import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { RadiologistService } from '../services/RadiologistService';
import {
    FileText,
    Save,
    Mic,
    Zap,
    ClipboardList,
    FileSignature
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import 'regenerator-runtime/runtime';

import { IntelligenceSidebar } from './IntelligenceSidebar';
import { SignatureModal } from './SignatureModal';
import { BannerSidebar } from '@/features/qa/components/banners/BannerSidebar';
import { DocxEditor, DocxEditorHandle } from './DocxEditor';
import { generateReportHeaderHtml } from '../utils/reportUtils';
import { RadiologistCase } from '../types';

interface ReportingEditorProps {
    caseData: RadiologistCase;
    onSave: (report: any) => Promise<void>;
    onFinalize: (report: any) => Promise<void>;
}

export function ReportingEditor({ caseData, onSave, onFinalize }: ReportingEditorProps) {
    const { user, updateUser } = useAuthStore();
    const caseId = caseData._id;
    const editorRef = useRef<DocxEditorHandle>(null);
    const [isViewerLoading, setIsViewerLoading] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [macros, setMacros] = useState<any[]>([]);
    const [selectedBannerId, setSelectedBannerId] = useState<string | undefined>(caseData.report?.banner);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    // Fetch Intelligence Assets
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tRes, mRes] = await Promise.all([
                    RadiologistService.getTemplates(),
                    RadiologistService.getMacros()
                ]);
                setTemplates(tRes || []);
                setMacros(mRes || []);
            } catch (err) {
                console.error("Failed to fetch fresh intelligence");
            }
        };
        fetchData();
    }, []);

    // Sync Dictation to Editor
    useEffect(() => {
        if (!listening && transcript && editorRef.current) {
            editorRef.current.insertText(transcript);
            resetTranscript();
        }
    }, [listening, transcript, resetTranscript]);

    // Helper to get absolute URL for Apryse
    const getAbsoluteDocxUrl = (path?: string) => {
        if (!path) return undefined;
        if (path.startsWith('http')) return path;

        // Get API base URL with proper fallback handling
        const apiBase = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
            : window.location.origin; // Fallback to current origin in production

        return `${apiBase}${path}`;
    };

    const absoluteDocxUrl = getAbsoluteDocxUrl(caseData.report?.docxUrl);

    // AUTO-CREATE: Save an initial blank progress if no doc exists yet
    const handleSaveReport = useCallback(async (isFinal: boolean) => {
        if (!editorRef.current) return;

        try {
            toast.loading(isFinal ? "Finalizing report..." : "Saving draft...", { id: 'save-report' });

            // Custom export call
            const blob = await editorRef.current.exportToDocx();
            const jsonState = editorRef.current.exportToJson();

            if (!blob) {
                throw new Error("Failed to generate DOCX blob");
            }

            // CUSTOM FILENAME: [PatientName]_[PatientId].docx
            const fileName = `${caseData.patientName.replace(/\s+/g, '_')}_${caseData.patientId}.docx`;
            const formData = new FormData();
            formData.append('reportDoc', blob, fileName);

            // Critical for perfect editor state reload (prevents mammoth DOCX-to-HTML conversion loss)
            if (jsonState) {
                formData.append('jsonContent', jsonState);
            }
            if (selectedBannerId) {
                formData.append('banner', selectedBannerId);
            }

            if (isFinal) {
                await onFinalize(formData);
            } else {
                await onSave(formData);
            }
            toast.success(isFinal ? "Report Finalized" : "Draft Saved", { id: 'save-report' });
        } catch (err) {
            console.error('[ReportingEditor] Save Error:', err);
            toast.error("Failed to prepare or save report", { id: 'save-report' });
        }
    }, [caseData, selectedBannerId, onSave, onFinalize]);

    useEffect(() => {
        // Only run if viewer is loaded AND we don't have a document URL yet
        if (!isViewerLoading && !absoluteDocxUrl) {
            console.log('[ReportingEditor] No existing report found. Initializing persistent file...');

            // Wait for editor to be fully ready before grabbing first blank state
            const timer = setTimeout(() => {
                handleSaveReport(false);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [isViewerLoading, absoluteDocxUrl, handleSaveReport]);

    const handleApplyTemplate = useCallback(async (template: any) => {
        if (editorRef.current) {
            toast.loading(`Applying ${template.title}...`, { id: 'apply-tpl' });
            await editorRef.current.insertText(template.content);
            toast.success(`Template applied`, { id: 'apply-tpl' });
        }
    }, []);

    const toggleDictation = () => {
        if (listening) {
            SpeechRecognition.stopListening();
        } else {
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true });
        }
    };

    const handleSyncHeader = () => {
        if (editorRef.current) {
            const html = generateReportHeaderHtml(caseData, user?.name || 'Radiologist');
            editorRef.current.prependContent(html);
            toast.success("Patient header injected at top");
        }
    };

    if (!browserSupportsSpeechRecognition) {
        return <div className="p-8 text-center text-red-500 font-bold">Speech recognition not supported in this browser.</div>;
    }

    const handleEditorLoad = useCallback(() => setIsViewerLoading(false), []);

    const handleApplyMacro = useCallback(async (macro: any) => {
        if (editorRef.current) {
            await editorRef.current.insertText(macro.expansion);
        }
    }, []);

    const handleInsertSignature = useCallback(() => {
        if (!user) {
            toast.info("User profile is still loading, please wait...");
            return;
        }

        if (!user.signature) {
            setIsSignatureModalOpen(true);
            return;
        }

        const html = editorRef.current?.getHTML() || '';
        if (html.includes('Digitally Signed')) {
            toast.info("Signature is already in the document.");
            return;
        }

        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });

        const signatureHtml =
            `<p></p>` +
            `<img src="${user.signature}" width="150" />` +
            `<p><strong>Name : Dr. ${user.name}</strong></p>` +
            `<p><em>Digitally Signed · ${dateStr}</em></p>`;

        editorRef.current?.appendContent(signatureHtml);
        toast.success("Signature appended to report");
    }, [user]);

    const handleSaveSignatureProfile = async (base64: string) => {
        try {
            toast.loading("Saving signature...", { id: 'save-sig' });
            await RadiologistService.saveSignature(base64);
            if (user) {
                updateUser({ ...user, signature: base64 });
            }
            toast.success("Signature saved to profile!", { id: 'save-sig' });
            setIsSignatureModalOpen(false);
        } catch (err) {
            console.error('[ReportingEditor] Signature save failed:', err);
            toast.error("Failed to save signature", { id: 'save-sig' });
        }
    };

    const handleSelectBanner = async (banner: any) => {
        setSelectedBannerId(banner._id);

        const html = editorRef.current?.getHTML() || '';

        // Prevent duplicate injections
        if (html.includes('alt="hospital-banner"')) {
            toast.info("A banner is already in the document.", {
                description: "Delete the existing banner first before applying a new one."
            });
            return;
        }

        const bannerUrl = getImageUrl(banner.imageUrl);

        // CONVERT TO BASE64: Ensure the editor content is self-contained for DOCX/PDF
        try {
            toast.loading("Processing banner image...", { id: 'banner-proc' });

            // Helper to convert URL to Base64 (using canvas to avoid cross-origin fetch issues if possible, 
            // but standard fetch with credentials is more reliable for raw data)
            const response = await fetch(bannerUrl);
            const blob = await response.blob();

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const bannerHtml = `<p><img src="${base64}" alt="hospital-banner" width="100%" /></p>`;
            editorRef.current?.prependContent(bannerHtml);

            toast.success("Hospital Banner Applied!", { id: 'banner-proc' });
        } catch (error) {
            console.error('[ReportingEditor] Banner processing failed:', error);
            toast.error("Failed to process banner image", { id: 'banner-proc' });

            // Fallback to URL injection if Base64 fails
            const bannerHtml = `<p><img src="${bannerUrl}" alt="hospital-banner" width="100%" /></p>`;
            editorRef.current?.prependContent(bannerHtml);
        }
    };

    return (
        <div className="flex h-full bg-background border border-border rounded-2xl overflow-hidden shadow-2xl">
            {user?.role === 'qa' ? (
                <BannerSidebar
                    selectedBannerId={selectedBannerId}
                    onSelectBanner={handleSelectBanner}
                />
            ) : (
                <IntelligenceSidebar
                    templates={templates}
                    macros={macros}
                    setTemplates={setTemplates}
                    setMacros={setMacros}
                    onApplyTemplate={handleApplyTemplate}
                    onApplyMacro={handleApplyMacro}
                />
            )}

            <div className="flex-1 flex flex-col bg-background min-h-0">
                {/* Header Actions */}
                <div className="h-14 border-b border-border flex items-center justify-between px-8 bg-muted/5">
                    <div className="flex items-center gap-6">


                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 gap-2 text-[10px] font-black uppercase transition-all",
                                listening ? "bg-red-50 text-red-600 border border-red-100" : "hover:bg-indigo-50 hover:text-indigo-600"
                            )}
                            onClick={toggleDictation}
                        >
                            <Mic className={cn("w-3.5 h-3.5", listening && "animate-pulse")} />
                            {listening ? "Recording..." : "Start Dictation"}
                        </Button>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 text-[10px] font-black uppercase hover:bg-emerald-50 hover:text-emerald-600 transition-all ml-2"
                            onClick={handleSyncHeader}
                        >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Sync Patient Details
                        </Button>
                        {user?.role === 'radiologist' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2 text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all ml-2"
                                onClick={handleInsertSignature}
                            >
                                <FileSignature className="w-3.5 h-3.5" />
                                Insert Signature
                            </Button>
                        )}
                    </div>

                    {listening && transcript && (
                        <div className="flex-1 px-8 text-[11px] font-bold text-indigo-900 animate-pulse truncate">
                            {transcript}
                        </div>
                    )}


                </div>

                {/* Editor Content Area */}
                <div className="flex-1 bg-muted/30 relative flex flex-col min-h-0">
                    {isViewerLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse">
                                Initializing Core Editor Engine...
                            </p>
                        </div>
                    )}

                    <DocxEditor
                        ref={editorRef}
                        macros={macros}
                        docxUrl={absoluteDocxUrl}
                        jsonContent={caseData.report?.jsonContent}
                        initialHtml={generateReportHeaderHtml(caseData, user?.name || 'Unknown')}
                        onLoad={handleEditorLoad}
                    />
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600/60 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 italic font-medium text-xs">
                        <Zap className="w-3.5 h-3.5" />
                        Authenticated: {user?.role === 'radiologist' ? 'Dr.' : 'QA'} {user?.name}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] gap-2 border-border shadow-sm hover:bg-muted"
                            onClick={() => handleSaveReport(false)}
                        >
                            <Save className="w-4 h-4" />
                            Save Draft
                        </Button>
                        <Button
                            className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                            onClick={() => handleSaveReport(true)}
                        >
                            <FileText className="w-4 h-4" />
                            Finalize Report
                        </Button>
                    </div>
                </div>
            </div>

            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSaveBase64={handleSaveSignatureProfile}
            />
        </div>
    );
}
