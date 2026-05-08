import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icons } from '@ohif/ui-next';
import { cn, useModal } from '@ohif/ui-next';
import { toast } from 'sonner';
import { DocxEditor } from './DocxEditor';
import { IntelligenceSidebar } from './IntelligenceSidebar';
import { SignatureModal } from './SignatureModal';
import { generateReportHeaderHtml } from '../../utils/reportUtils';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import 'regenerator-runtime/runtime';
import { RadiologistService, CaseService, UserService } from '../../services/BackendService';

export function ReportEditorWindow({ caseId, patientName, snapshotQueue = [], onSnapshotConsumed, onClose }: any) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [pos, setPos] = useState({ x: window.innerWidth / 2 - 450, y: 50 });
    const [size, setSize] = useState({ width: 900, height: 700 });
    const [caseData, setCaseData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ready, setReady] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [macros, setMacros] = useState<any[]>([]);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const editorRef = useRef<any>(null);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    // Load user profile from backend API (cached — shared with Header & toolbar)
    useEffect(() => {
        UserService.getMe().then(u => {
            if (u) setUser(u);
        }).catch(() => {
            console.error('[ReportEditorWindow] Failed to load profile');
        });
    }, []);

    useEffect(() => {
        const fetchIntell = async () => {
            try {
                // Assuming RadiologistService has getTemplates and getMacros
                const tRes = await RadiologistService.getTemplates?.() || [];
                const mRes = await RadiologistService.getMacros?.() || [];
                setTemplates(tRes);
                setMacros(mRes);
            } catch (e) { console.error('Failed intelligence fetch'); }
        };
        fetchIntell();
    }, []);

    useEffect(() => {
        if (!listening && transcript && editorRef.current) {
            editorRef.current.insertText(transcript + ' ');
            resetTranscript();
        }
    }, [listening, transcript, resetTranscript]);

    const handleApplyTemplate = useCallback(async (template: any) => {
        if (editorRef.current) {
            toast.loading(`Applying ${template.title}...`);
            await editorRef.current.insertText(template.content);
            toast.success(`Template applied`);
        }
    }, []);

    const handleApplyMacro = useCallback(async (macro: any) => {
        if (editorRef.current) {
            await editorRef.current.insertText(macro.expansion);
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
        if (editorRef.current && caseData) {
            const html = generateReportHeaderHtml(caseData, user?.name || 'Radiologist');
            editorRef.current.prependContent(html);
            toast.success("Patient header injected at top");
        }
    };

    const handleInsertSignature = useCallback(() => {
        if (!user?.signature) {
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
            await RadiologistService.saveSignature(base64);
            const newProfile = { ...user, signature: base64 };
            setUser(newProfile);

            // Invalidate the cached user so next getMe() fetches fresh data
            UserService.clearCache();
        } catch (e) {
            toast.error("Failed to save profile signature");
        }
    };

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await RadiologistService.getCase(caseId);
                console.log('[ReportEditorWindow] Fetched CaseData:', data);
                if (data.report?.docxUrl) {
                    const configBackend = (window as any).config?.backendUrl;
                    const apiBase = configBackend ? configBackend.replace(/\/api\/?$/, '') : (window.location.hostname.includes('armorray') ? 'https://api.armorray.com' : 'http://localhost:5000');
                    data.report.docxUrl = data.report.docxUrl.startsWith('http') ? data.report.docxUrl : `${apiBase}${data.report.docxUrl}`;
                    console.log('[ReportEditorWindow] Resolved DocxURL:', data.report.docxUrl);
                }
                setCaseData(data);
            } catch (e) { toast.error('Failed to load case'); }
            finally { setLoading(false); }
        };
        fetch();
    }, [caseId]);

    // AUTO-CREATE: Save an initial blank progress if no doc exists yet
    // This transitions the case status to 'In_Progress' in the worklist
    useEffect(() => {
        if (ready && caseData && !caseData.report?.jsonContent && !caseData.report?.docxUrl) {
            console.log('[ReportEditorWindow] No existing report found. Initializing persistent file...');
            const timer = setTimeout(() => {
                handleSave(false);
            }, 4000); // 4s buffer to allow first edits or header sync
            return () => clearTimeout(timer);
        }
    }, [ready, caseData]);

    useEffect(() => {
        const handleWinResize = () => {
            setPos(p => ({
                x: Math.min(p.x, window.innerWidth - 100),
                y: Math.min(p.y, window.innerHeight - 100)
            }));
            setSize(s => ({
                width: Math.min(s.width, window.innerWidth - 40),
                height: Math.min(s.height, window.innerHeight - 40)
            }));
        };
        window.addEventListener('resize', handleWinResize);
        return () => window.removeEventListener('resize', handleWinResize);
    }, []);

    useEffect(() => {
        if (snapshotQueue.length > 0 && ready && editorRef.current && caseId) {
            const proc = async () => {
                for (const b of snapshotQueue) {
                    try {
                        const { url } = await CaseService.addAttachment(caseId, b);
                        const configBackend = (window as any).config?.backendUrl;
                        const apiBase = configBackend ? configBackend.replace(/\/api\/?$/, '') : (window.location.hostname.includes('armorray') ? 'https://api.armorray.com' : 'http://localhost:5000');
                        await editorRef.current?.insertImage(`${apiBase}${url}`);
                    } catch { toast.error("Failed to save snapshot"); }
                }
                onSnapshotConsumed?.();
            };
            proc();
        }
    }, [snapshotQueue, ready, caseId, onSnapshotConsumed]);

    const handleSave = async (submit = false) => {
        try {
            setSaving(true);
            const blob = await editorRef.current?.exportToDocx();
            if (!blob) throw new Error();
            const form = new FormData();
            form.append('reportDoc', blob, `Report_${caseId}.docx`);
            const json = editorRef.current?.exportToJson();
            if (json) form.append('jsonContent', json);
            if (submit) {
                await RadiologistService.submitReport(caseId, form);
                toast.success('Report finalized');
                onClose();
            } else {
                const res = await RadiologistService.saveDraft(caseId, form);
                console.log('[ReportEditorWindow] Save Result:', res);
                toast.success('Draft saved');
            }
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const handleLoad = useCallback(() => {
        console.log('[ReportEditorWindow] Editor Loaded');
        setReady(true);
    }, []);

    <div className="fixed bottom-4 right-4 z-[100]">
        <button onClick={() => setIsMinimized(false)} className="bg-primary text-white rounded-md px-4 py-2 shadow-2xl flex items-center gap-2">
            <Icons.ByName name="clipboard" className="w-4 h-4" />
            Report - {patientName}
        </button>
    </div>

    const handleResizeMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isMaximized) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const startX = clientX;
        const startY = clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        const onMove = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const newWidth = Math.max(400, Math.min(window.innerWidth - pos.x - 20, startWidth + (currentX - startX)));
            const newHeight = Math.max(300, Math.min(window.innerHeight - pos.y - 20, startHeight + (currentY - startY)));
            setSize({ width: newWidth, height: newHeight });
        };

        const onEnd = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('touchend', onEnd);
    };

    return (
        <div
            className={cn(
                "fixed bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden z-[100]",
                isMaximized ? "inset-0 rounded-none" : "rounded-2xl"
            )}
            style={isMaximized ? {} : {
                top: pos.y,
                left: pos.x,
                width: size.width,
                height: size.height
            }}
        >
            <div className="h-14 bg-primary px-4 flex items-center justify-between cursor-move flex-shrink-0" onMouseDown={e => { if (!isMaximized) { const startX = e.clientX - pos.x; const startY = e.clientY - pos.y; const move = (ex: MouseEvent) => setPos({ x: ex.clientX - startX, y: ex.clientY - startY }); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); } }}>
                <div className="flex items-center gap-3 text-white font-bold">
                    <Icons.ByName name="GripVertical" className="w-5 h-5" />
                    <Icons.ByName name="clipboard" className="w-5 h-5" />
                    <span>{patientName}</span>
                </div>

                <div className="flex-1 mx-4 text-xs font-bold text-blue-200 animate-pulse truncate max-w-[200px]">
                    {listening && transcript ? transcript : ''}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSyncHeader}
                        className="flex items-center gap-2 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase transition-colors mr-1"
                        title="Inject patient demographics into report header"
                    >
                        <Icons.ByName name="LaunchArrow" className="w-3 h-3 rotate-180" />
                        Sync Header
                    </button>

                    <button
                        onClick={handleInsertSignature}
                        className="flex items-center gap-2 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase transition-colors mr-1"
                        title="Append your digital signature to the report"
                    >
                        <Icons.ByName name="Info" className="w-3 h-3" />
                        Sign Report
                    </button>

                    <div className="w-px h-4 bg-white/20 mx-1" />

                    {browserSupportsSpeechRecognition && (
                        <button
                            onClick={toggleDictation}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded text-xs font-bold uppercase transition-colors mr-2",
                                listening ? "bg-red-500 hover:bg-red-400 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                            )}
                        >
                            <Icons.ByName name="LaunchArrow" className={cn("w-3 h-3", listening && "animate-pulse origin-center")} />
                            {listening ? "Recording..." : "Dictate"}
                        </button>
                    )}
                    <button onClick={() => setIsMinimized(true)} className="text-white hover:bg-white/20 p-1 rounded">
                        <Icons.ByName name="Minus" className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsMaximized(!isMaximized)} className="text-white hover:bg-white/20 p-1 rounded">
                        <Icons.ByName name={isMaximized ? "ToolContract" : "ToolExpand"} className="w-5 h-5" />
                    </button>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded">
                        <Icons.ByName name="close" className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                {loading ? <div className="flex-1 flex items-center justify-center">Loading...</div> : (
                    <>
                        <div className="flex-1 overflow-hidden flex flex-row">
                            {!isMaximized && (
                                <div className={cn("border-r border-[#3a3f99] h-full flex-shrink-0 transition-all duration-300", isSidebarCollapsed ? "w-12" : "w-[300px]")}>
                                    <IntelligenceSidebar
                                        templates={templates}
                                        macros={macros}
                                        onApplyTemplate={handleApplyTemplate}
                                        onApplyMacro={handleApplyMacro}
                                        isCollapsed={isSidebarCollapsed}
                                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                    />
                                </div>
                            )}
                            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                                <DocxEditor ref={editorRef} macros={macros} docxUrl={caseData?.report?.docxUrl} jsonContent={caseData?.report?.jsonContent} onLoad={handleLoad} />
                            </div>
                        </div>
                        <div className="h-14 border-t bg-[#090c29] px-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-primary-light bg-primary-light/10 px-2 py-1 rounded">Dr. {user?.name || 'Radiologist'}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Case: {caseId}</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleSave()} disabled={saving} className="px-5 py-1.5 border border-[#3a3f99] rounded-xl text-white hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all">Save Draft</button>
                                <button onClick={() => handleSave(true)} disabled={saving} className="px-6 py-1.5 bg-primary-light text-black rounded-xl hover:bg-primary-light/90 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20">Finalize Report</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSaveBase64={handleSaveSignatureProfile}
            />

            {!isMaximized && (
                <div
                    onMouseDown={handleResizeMouseDown}
                    onTouchStart={handleResizeMouseDown}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-[110] flex items-end justify-end p-1 group"
                >
                    <div className="w-4 h-4 border-r-4 border-b-4 border-slate-300 group-hover:border-primary transition-colors rounded-br-sm opacity-50 group-hover:opacity-100" />
                </div>
            )}
        </div>
    );
}
