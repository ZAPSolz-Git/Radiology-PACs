// import { useState, useRef, useEffect, useCallback } from 'react';
// import { X, Minimize2, Maximize2, GripVertical, FileText, Mic } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { DocxEditor, DocxEditorHandle } from '@/features/radiologist/components/DocxEditor';
// import { toast } from 'sonner';
// import { RadiologistService } from '@/features/radiologist/services/RadiologistService';
// import { CaseService } from '@/features/technician/services/CaseService';
// import { cn } from '@/lib/utils';
// import api from '@/lib/axios';
// import { IntelligenceSidebar } from '@/features/radiologist/components/IntelligenceSidebar';
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
// import 'regenerator-runtime/runtime';
// interface ReportEditorWindowProps {
//     caseId: string;
//     patientName: string;
//     snapshotQueue?: Blob[];
//     onSnapshotConsumed?: () => void;
//     onClose: () => void;
// }

// export function ReportEditorWindow({ caseId, patientName, snapshotQueue = [], onSnapshotConsumed, onClose }: ReportEditorWindowProps) {
//     const [isMinimized, setIsMinimized] = useState(false);
//     const [isMaximized, setIsMaximized] = useState(false);
//     const [position, setPosition] = useState({ x: window.innerWidth / 2 - 600, y: window.innerHeight / 2 - 450 });
//     const [size, setSize] = useState({ width: 1200, height: 900 });
//     const [isDragging, setIsDragging] = useState(false);
//     const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//     const [caseData, setCaseData] = useState<any>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isEditorReady, setIsEditorReady] = useState(false);
//     const [templates, setTemplates] = useState<any[]>([]);
//     const [macros, setMacros] = useState<any[]>([]);

//     const editorRef = useRef<DocxEditorHandle>(null);
//     const windowRef = useRef<HTMLDivElement>(null);

//     const {
//         transcript,
//         listening,
//         resetTranscript,
//         browserSupportsSpeechRecognition
//     } = useSpeechRecognition();

//     // Fetch Intelligence Assets
//     useEffect(() => {
//         const fetchIntelligence = async () => {
//             try {
//                 const [tRes, mRes] = await Promise.all([
//                     RadiologistService.getTemplates(),
//                     RadiologistService.getMacros()
//                 ]);
//                 setTemplates(tRes || []);
//                 setMacros(mRes || []);
//             } catch (err) {
//                 console.error("Failed to fetch fresh intelligence");
//             }
//         };
//         fetchIntelligence();
//     }, []);

//     // Sync Dictation to Editor
//     useEffect(() => {
//         if (!listening && transcript && editorRef.current) {
//             editorRef.current.insertText(transcript + ' ');
//             resetTranscript();
//         }
//     }, [listening, transcript, resetTranscript]);

//     const handleApplyTemplate = useCallback(async (template: any) => {
//         if (editorRef.current) {
//             toast.loading(`Applying ${template.title}...`, { id: 'apply-tpl' });
//             await editorRef.current.insertText(template.content);
//             toast.success(`Template applied`, { id: 'apply-tpl' });
//         }
//     }, []);

//     const handleApplyMacro = useCallback(async (macro: any) => {
//         if (editorRef.current) {
//             await editorRef.current.insertText(macro.expansion);
//         }
//     }, []);

//     const toggleDictation = () => {
//         if (listening) {
//             SpeechRecognition.stopListening();
//         } else {
//             resetTranscript();
//             SpeechRecognition.startListening({ continuous: true });
//         }
//     };

//     // Auto-save Draft Every 30 seconds
//     useEffect(() => {
//         if (!caseId || !isEditorReady || !editorRef.current) return;

//         const intervalId = setInterval(async () => {
//             console.log('[ReportEditorWindow] Auto-saving draft...');
//             try {
//                 const docxBlob = await editorRef.current?.exportToDocx();
//                 const jsonContent = editorRef.current?.exportToJson();
//                 if (!docxBlob) return;

//                 const formData = new FormData();
//                 const fileName = `Report_${caseId}_${Date.now()}.docx`;
//                 formData.append('reportDoc', docxBlob, fileName);
//                 if (jsonContent) formData.append('jsonContent', jsonContent);

//                 await RadiologistService.saveDraft(caseId, formData);
//                 console.log('[ReportEditorWindow] Auto-save success');
//             } catch (error) {
//                 console.error('[ReportEditorWindow] Auto-save failed:', error);
//             }
//         }, 30000);

//         return () => clearInterval(intervalId);
//     }, [caseId, isEditorReady]);

//     // Fetch case data
//     useEffect(() => {
//         const fetchCaseData = async () => {
//             try {
//                 setIsLoading(true);
//                 // Use authenticated api client
//                 const response = await api.get(`/cases/${caseId}`);
//                 const data = response.data.data || response.data;
//                 console.log('[ReportEditorWindow] Loaded case data:', data);

//                 // Convert relative docxUrl to absolute URL
//                 if (data.report?.docxUrl) {
//                     const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
//                     // const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'https://api.armorray.com';
//                     data.report.docxUrl = data.report.docxUrl.startsWith('http')
//                         ? data.report.docxUrl
//                         : `${apiBase}${data.report.docxUrl}`;
//                 }

//                 setCaseData(data);
//             } catch (error) {
//                 console.error('Failed to load case data:', error);
//                 toast.error('Failed to load case data');
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchCaseData();
//     }, [caseId]);

//     // Handle snapshot insertion
//     useEffect(() => {
//         // console.log('[Snapshot Debug] Queue:', snapshotQueue.length, 'Editor Ready:', isEditorReady, 'Ref:', !!editorRef.current);

//         if (snapshotQueue.length > 0 && isEditorReady && editorRef.current && caseId) {
//             console.log('[Snapshot Debug] Processing queue items:', snapshotQueue.length);
//             // Insert all snapshots in queue
//             const processQueue = async () => {
//                 for (const blob of snapshotQueue) {
//                     try {
//                         // Upload first
//                         // toast.info("Uploading snapshot...");
//                         const { url } = await CaseService.addAttachment(caseId, blob);

//                         // Construct full URL since we don't have a proxy
//                         const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
//                         const fullUrl = `${apiBase}${url}`;

//                         console.log('[Snapshot Debug] Snapshot uploaded, inserting URL:', fullUrl);
//                         await editorRef.current?.insertImage(fullUrl);
//                         console.log('[Snapshot Debug] Image inserted');
//                     } catch (err) {
//                         console.error('[Snapshot Debug] Failed to insert image', err);
//                         toast.error("Failed to save snapshot to server");
//                     }
//                 }
//                 // Clear queue
//                 onSnapshotConsumed?.();
//             };
//             processQueue();
//         }
//     }, [snapshotQueue, isEditorReady, onSnapshotConsumed, caseId]);

//     // Handle dragging
//     const handleMouseDown = (e: React.MouseEvent) => {
//         if (isMaximized) return;
//         setIsDragging(true);
//         setDragOffset({
//             x: e.clientX - position.x,
//             y: e.clientY - position.y
//         });
//     };

//     useEffect(() => {
//         const handleMouseMove = (e: MouseEvent) => {
//             if (isDragging && !isMaximized) {
//                 setPosition({
//                     x: e.clientX - dragOffset.x,
//                     y: e.clientY - dragOffset.y
//                 });
//             }
//         };

//         const handleMouseUp = () => {
//             setIsDragging(false);
//         };

//         if (isDragging) {
//             document.addEventListener('mousemove', handleMouseMove);
//             document.addEventListener('mouseup', handleMouseUp);
//         }

//         return () => {
//             document.removeEventListener('mousemove', handleMouseMove);
//             document.removeEventListener('mouseup', handleMouseUp);
//         };
//     }, [isDragging, dragOffset, isMaximized]);

//     const handleSaveDraft = async () => {
//         try {
//             setIsSaving(true);
//             const docxBlob = await editorRef.current?.exportToDocx();
//             if (!docxBlob) {
//                 toast.error('Failed to export report');
//                 return;
//             }

//             // Create FormData for file upload
//             const formData = new FormData();
//             const fileName = `Report_${caseId}_${Date.now()}.docx`;
//             formData.append('reportDoc', docxBlob, fileName);

//             const jsonContent = editorRef.current?.exportToJson();
//             if (jsonContent) {
//                 formData.append('jsonContent', jsonContent);
//             }

//             await RadiologistService.saveDraft(caseId, formData);
//             toast.success('Draft saved successfully');
//         } catch (error) {
//             console.error('Failed to save draft:', error);
//             toast.error('Failed to save draft');
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleFinalize = async () => {
//         try {
//             setIsSaving(true);
//             const docxBlob = await editorRef.current?.exportToDocx();
//             if (!docxBlob) {
//                 toast.error('Failed to export report');
//                 return;
//             }

//             // Create FormData for file upload
//             const formData = new FormData();
//             const fileName = `Report_${caseId}_${Date.now()}.docx`;
//             formData.append('reportDoc', docxBlob, fileName);

//             const jsonContent = editorRef.current?.exportToJson();
//             if (jsonContent) {
//                 formData.append('jsonContent', jsonContent);
//             }

//             await RadiologistService.submitReport(caseId, formData);
//             toast.success('Report finalized and submitted to QA');
//             onClose();
//         } catch (error) {
//             console.error('Failed to finalize report:', error);
//             toast.error('Failed to finalize report');
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const toggleMaximize = () => {
//         setIsMaximized(!isMaximized);
//     };

//     if (isMinimized) {
//         return (
//             <div className="fixed bottom-4 right-4 z-50">
//                 <Button
//                     onClick={() => setIsMinimized(false)}
//                     className="bg-indigo-600 hover:bg-indigo-500 shadow-2xl gap-2"
//                 >
//                     <FileText className="w-4 h-4" />
//                     Report Editor - {patientName}
//                 </Button>
//             </div>
//         );
//     }

//     const windowStyle = isMaximized
//         ? { top: 0, left: 0, width: '100vw', height: '100vh' }
//         : { top: position.y, left: position.x, width: size.width, height: size.height };

//     return (
//         <div
//             ref={windowRef}
//             className={cn(
//                 "fixed bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden z-40",
//                 isMaximized && "rounded-none"
//             )}
//             style={windowStyle}
//         >
//             {/* Header */}
//             <div
//                 className={cn(
//                     "h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 flex items-center justify-between flex-shrink-0",
//                     !isMaximized && "cursor-move"
//                 )}
//                 onMouseDown={handleMouseDown}
//             >
//                 <div className="flex items-center gap-3">
//                     <GripVertical className="w-5 h-5 text-white/70" />
//                     <FileText className="w-5 h-5 text-white" />
//                     <div>
//                         <h2 className="text-sm font-bold text-white">Report Editor</h2>
//                         <p className="text-xs text-white/80">{patientName}</p>
//                     </div>
//                 </div>

//                 <div className="flex-1 px-8 text-[11px] font-bold text-indigo-200 animate-pulse truncate max-w-[300px]">
//                     {listening && transcript ? transcript : ''}
//                 </div>

//                 <div className="flex items-center gap-2">
//                     {browserSupportsSpeechRecognition && (
//                         <Button
//                             variant="ghost"
//                             size="sm"
//                             className={cn(
//                                 "h-8 gap-2 text-[10px] font-black uppercase transition-all mr-2",
//                                 listening ? "bg-red-500 hover:bg-red-400 text-white" : "text-white hover:bg-white/20 bg-indigo-500"
//                             )}
//                             onClick={toggleDictation}
//                         >
//                             <Mic className={cn("w-3.5 h-3.5", listening && "animate-pulse")} />
//                             {listening ? "Recording..." : "Dictate"}
//                         </Button>
//                     )}
//                     <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={() => setIsMinimized(true)}
//                         className="h-8 w-8 text-white hover:bg-white/20"
//                     >
//                         <Minimize2 className="w-4 h-4" />
//                     </Button>
//                     <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={toggleMaximize}
//                         className="h-8 w-8 text-white hover:bg-white/20"
//                     >
//                         <Maximize2 className="w-4 h-4" />
//                     </Button>
//                     <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={onClose}
//                         className="h-8 w-8 text-white hover:bg-white/20"
//                     >
//                         <X className="w-4 h-4" />
//                     </Button>
//                 </div>
//             </div>

//             {/* Content */}
//             <div className="flex-1 overflow-hidden flex flex-col">
//                 {isLoading ? (
//                     <div className="flex-1 flex items-center justify-center">
//                         <div className="text-center space-y-4">
//                             <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
//                             <p className="text-sm text-muted-foreground">Loading case data...</p>
//                         </div>
//                     </div>
//                 ) : (
//                     <>
//                         <div className="flex-1 overflow-hidden flex flex-row">
//                             {!isMaximized && (
//                                 <div className="w-[300px] border-r border-border h-full flex-shrink-0 bg-muted/10">
//                                     <IntelligenceSidebar
//                                         templates={templates}
//                                         macros={macros}
//                                         onApplyTemplate={handleApplyTemplate}
//                                         onApplyMacro={handleApplyMacro}
//                                     />
//                                 </div>
//                             )}
//                             <div className="flex-1 overflow-hidden flex flex-col min-w-0">
//                                 <DocxEditor
//                                     ref={editorRef}
//                                     macros={macros}
//                                     docxUrl={caseData?.report?.docxUrl}
//                                     jsonContent={caseData?.report?.jsonContent}
//                                     onLoad={() => {
//                                         console.log('[ReportEditorWindow] Editor Ready');
//                                         setIsEditorReady(true);
//                                     }}
//                                 />
//                             </div>
//                         </div>

//                         {/* Footer */}
//                         <div className="h-16 border-t border-border bg-muted/30 px-6 flex items-center justify-between flex-shrink-0">
//                             <div className="text-xs text-muted-foreground">
//                                 Case ID: <span className="font-mono">{caseId}</span>
//                             </div>
//                             <div className="flex items-center gap-3">
//                                 <Button
//                                     variant="outline"
//                                     onClick={handleSaveDraft}
//                                     disabled={isSaving}
//                                     className="gap-2"
//                                 >
//                                     {isSaving ? 'Saving...' : 'Save Draft'}
//                                 </Button>
//                                 <Button
//                                     onClick={handleFinalize}
//                                     disabled={isSaving}
//                                     className="bg-indigo-600 hover:bg-indigo-500 gap-2"
//                                 >
//                                     {isSaving ? 'Finalizing...' : 'Finalize Report'}
//                                 </Button>
//                             </div>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// }
