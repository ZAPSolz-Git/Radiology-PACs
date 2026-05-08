// import { useEffect, useState } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import { useDicomStore } from '@/stores/dicomStore';
// import { CornerstoneService } from '@/services/CornerstoneService';
// import { cn } from '@/lib/utils';
// import { Header } from './Header';
// import { StudyBrowser } from './StudyBrowser';
// import { ViewportGrid } from './ViewportGrid';
// import { ToolsPanel } from './ToolsPanel';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { ToolContent } from './Toolbar';
// import { MPRViewer } from './MPRViewer';
// import { ReportEditorWindow } from './ReportEditorWindow';
// import { Settings2, Wrench } from 'lucide-react';

// export default function DicomViewerLayout() {
//   const {
//     showUploadScreen,
//     leftPanelOpen,
//     rightPanelOpen,
//     studies,
//     viewports,
//     loadSeriesToViewport,
//     setLayout,
//     setShowUploadScreen,
//     selectedStudyUID
//   } = useDicomStore();

//   const [searchParams] = useSearchParams();
//   const [showMPR, setShowMPR] = useState(false);
//   const [showReportEditor, setShowReportEditor] = useState(false);
//   const [initialized, setInitialized] = useState(false);
//   const [caseId, setCaseId] = useState<string | null>(null);
//   const [patientName, setPatientName] = useState<string>('');
//   const [snapshotQueue, setSnapshotQueue] = useState<Blob[]>([]);

//   // Get case ID from URL params
//   useEffect(() => {
//     const caseIdParam = searchParams.get('caseId');
//     if (caseIdParam) {
//       setCaseId(caseIdParam);
//     }
//   }, [searchParams]);

//   // Update patient name when study is selected
//   useEffect(() => {
//     if (selectedStudyUID) {
//       const study = studies.find(s => s.studyInstanceUID === selectedStudyUID);
//       if (study) {
//         setPatientName(study.patientName);
//       }
//     }
//   }, [selectedStudyUID, studies]);

//   useEffect(() => {
//     const init = async () => {
//       await CornerstoneService.init();
//       setInitialized(true);
//     };
//     init();
//   }, []);

//   // Handle auto-assignment to viewport when studies are present
//   // This logic is UI-specific (layout management), so it stays here for now.
//   useEffect(() => {
//     if (!initialized || !studies.length) return;

//     // Check if any viewport has a study assigned
//     const hasStudyInAnyViewport = viewports.some(vp => vp.studyUID !== null);

//     if (!hasStudyInAnyViewport && studies.length > 0) {
//       // Set layout to 1x1 when loading a study
//       setLayout({ rows: 1, cols: 1 });

//       // Auto-assign the first study to the first viewport
//       const firstStudy = studies[0];
//       if (firstStudy.series.length > 0) {
//         const firstSeries = firstStudy.series[0];
//         loadSeriesToViewport('viewport-0', firstStudy.studyInstanceUID, firstSeries.seriesInstanceUID);
//       }
//     }
//   }, [initialized, studies.length, viewports.length]);

//   // Handle snapshot capture
//   const handleSnapshot = async () => {
//     if (!caseId) {
//       return;
//     }

//     try {
//       const activeViewportId = useDicomStore.getState().activeViewportId;
//       if (!activeViewportId) return;

//       const renderingEngine = CornerstoneService.getRenderingEngine();
//       if (!renderingEngine) {
//         console.error('[Snapshot] No rendering engine found');
//         return;
//       }

//       const viewport = renderingEngine.getViewport(activeViewportId);
//       if (!viewport) {
//         console.error('[Snapshot] Viewport not found:', activeViewportId);
//         return;
//       }

//       const canvasElement = viewport.canvas;

//       if (!canvasElement) {
//         console.error('[Snapshot] Canvas not found for viewport:', activeViewportId);
//         return;
//       }

//       canvasElement.toBlob((blob) => {
//         if (blob) {
//           setSnapshotQueue(prev => [...prev, blob]);
//           if (!showReportEditor) {
//             setShowReportEditor(true);
//           }
//         }
//       }, 'image/png');
//     } catch (error) {
//       console.error('[Snapshot] Error capturing:', error);
//     }
//   };

//   // Wait for Cornerstone Init
//   if (!initialized) {
//     return (
//       <div className="h-screen w-screen flex flex-col items-center justify-center bg-background space-y-4">
//         <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
//         <div className="text-xl font-medium">Initializing Cornerstone3D...</div>
//       </div>
//     );
//   }

//   // Show MPR if active
//   if (showMPR) {
//     return <MPRViewer onClose={() => setShowMPR(false)} />;
//   }

//   return (
//     <div className="h-screen flex flex-col bg-background overflow-hidden font-inter">
//       {/* Header */}
//       <Header
//         onOpenMPR={() => setShowMPR(true)}
//         onOpenReport={caseId ? () => setShowReportEditor(true) : undefined}
//         onSnapshot={caseId ? handleSnapshot : undefined}
//       />

//       {/* Main Content */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Left Panel - Study Browser */}
//         <div
//           className={cn(
//             "w-64 bg-panel border-r border-border flex flex-col transition-all duration-300 overflow-hidden",
//             leftPanelOpen ? "translate-x-0" : "-translate-x-full w-0"
//           )}
//         >
//           <div className="panel-header flex-shrink-0">
//             Study Browser
//           </div>
//           <div className="flex-1 overflow-hidden">
//             <StudyBrowser />
//           </div>
//         </div>

//         {/* Center - Viewport Grid */}
//         <ViewportGrid />

//         {/* Right Panel - Tools & Advanced */}
//         <div
//           className={cn(
//             "w-80 bg-panel border-l border-border flex flex-col transition-all duration-300 overflow-hidden",
//             rightPanelOpen ? "translate-x-0" : "translate-x-full w-0"
//           )}
//         >
//           <Tabs defaultValue="tools" className="flex-1 flex flex-col">
//             <div className="px-4 pt-4 pb-2">
//               <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
//                 <TabsTrigger value="tools" className="gap-2">
//                   <Wrench className="w-3.5 h-3.5" />
//                   <span>Tools</span>
//                 </TabsTrigger>
//                 <TabsTrigger value="advanced" className="gap-2">
//                   <Settings2 className="w-3.5 h-3.5" />
//                   <span>Advanced</span>
//                 </TabsTrigger>
//               </TabsList>
//             </div>

//             <div className="flex-1 overflow-hidden">
//               <TabsContent value="tools" className="h-full m-0 p-0 focus-visible:ring-0">
//                 <ToolContent />
//               </TabsContent>
//               <TabsContent value="advanced" className="h-full m-0 p-0 focus-visible:ring-0">
//                 <ToolsPanel />
//               </TabsContent>
//             </div>
//           </Tabs>
//         </div>
//       </div>

//       {/* Report Editor Window */}
//       {showReportEditor && caseId && (
//         <ReportEditorWindow
//           caseId={caseId}
//           patientName={patientName}
//           snapshotQueue={snapshotQueue}
//           onSnapshotConsumed={() => setSnapshotQueue([])}
//           onClose={() => setShowReportEditor(false)}
//         />
//       )}
//     </div>
//   );
// }
