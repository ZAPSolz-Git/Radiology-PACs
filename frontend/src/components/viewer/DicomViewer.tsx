// import { useEffect, useState, useRef } from 'react';
// import { useDicomStore } from '@/stores/dicomStore';
// import { CornerstoneService } from '@/services/CornerstoneService';
// import { useSearchParams } from 'react-router-dom';
// import { StudyLoaderService, loadStudyById } from '@/services/StudyLoaderService';

// import { cn } from '@/lib/utils';
// import { Header } from './Header';
// import { StudyBrowser } from './StudyBrowser';
// import { ViewportGrid } from './ViewportGrid';
// import { ToolsPanel } from './ToolsPanel';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { ToolContent } from './Toolbar';
// import { FileUpload } from './FileUpload';
// import { MPRViewer } from './MPRViewer';
// import { seriesPrefetchService } from '@/services/SeriesPrefetchService';
// import { displaySetService } from '@/services/DisplaySetService';
// import { Settings2, Wrench } from 'lucide-react';

// export function DicomViewer() {
//   const { showUploadScreen, leftPanelOpen, rightPanelOpen, studies, viewports, loadSeriesToViewport, setLayout, setShowUploadScreen } = useDicomStore();
//   const [showMPR, setShowMPR] = useState(false);
//   const [initialized, setInitialized] = useState(false);
//   const [searchParams] = useSearchParams();

//   useEffect(() => {
//     const init = async () => {
//       await CornerstoneService.init();
//       setInitialized(true);
//     };
//     init();
//   }, []);

//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // On mount, if there's a studyId in URL, hide upload screen and try to load the study
//   useEffect(() => {
//     if (initialized) {
//       const urlStudyId = searchParams.get('studyId');

//       // If we have a study ID and NO studies loaded (or different study), load it
//       if (urlStudyId) {
//         const needsLoad = studies.length === 0 || studies[0].studyInstanceUID !== urlStudyId;

//         if (needsLoad) {
//           const loadStudyFromUrl = async () => {
//             setIsLoading(true);
//             setError(null);
//             try {
//               // Load the study metadata
//               await StudyLoaderService.loadStudyFromServer(urlStudyId);
//             } catch (error) {
//               console.error('Failed to load study from URL:', error);
//               setError(error instanceof Error ? error.message : 'Failed to load study');
//             } finally {
//               setIsLoading(false);
//             }
//           };

//           loadStudyFromUrl();
//         }

//         // If there's a studyId in the URL, ensure we're not showing the upload screen
//         setShowUploadScreen(false);
//       }
//     }
//   }, [initialized, searchParams, studies.length, setShowUploadScreen]);

//   // Handle URL-based study loading and auto-assignment to viewport
//   useEffect(() => {
//     if (!initialized || !studies.length) return;

//     // Check if THE FIRST viewport is empty. We only auto-assign if it's a fresh load.
//     const firstViewport = viewports[0];
//     const needsAutoAssign = firstViewport && firstViewport.studyUID === null;

//     if (needsAutoAssign && studies.length > 0) {
//       // Auto-assign the first study to the first viewport
//       const firstStudy = studies[0];
//       if (firstStudy.series.length > 0) {
//         const firstSeries = firstStudy.series[0];
//         console.log(`[DicomViewer] Auto-assigning study ${firstStudy.studyInstanceUID} to viewport-0`);
//         loadSeriesToViewport('viewport-0', firstStudy.studyInstanceUID, firstSeries.seriesInstanceUID);
//       }
//     }
//   }, [initialized, studies.length, viewports.length]); // [OPTIMIZED] Logic depends on studies/viewports availability

//   // Prefetch: When studies load, start preloading the first reconstructable series
//   // so MPR opens faster (data is already partially loaded)
//   useEffect(() => {
//     if (!initialized || studies.length === 0) return;

//     const firstStudy = studies[0];
//     if (!firstStudy) return;

//     // Create display sets if not already done
//     const displaySets = displaySetService.getDisplaySetsForStudy(firstStudy.studyInstanceUID);
//     if (displaySets.length === 0) {
//       displaySetService.makeDisplaySetsForStudy(firstStudy.studyInstanceUID);
//     }

//     // Find the first reconstructable series and prefetch it
//     const allSets = displaySetService.getDisplaySetsForStudy(firstStudy.studyInstanceUID);
//     const reconstructable = allSets.find(ds => ds.isReconstructable);

//     if (reconstructable) {
//       console.log(`[DicomViewer] Prefetching reconstructable series: ${reconstructable.seriesInstanceUID}`);
//       seriesPrefetchService.prefetchSeries(reconstructable);
//     }
//   }, [initialized, studies.length]);

//   if (!initialized) {
//     return (
//       <div className="h-screen w-screen flex flex-col items-center justify-center bg-background space-y-4">
//         <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
//         <div className="text-xl font-medium">Initializing Cornerstone3D...</div>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return (
//       <div className="h-screen w-screen flex flex-col items-center justify-center bg-background space-y-4">
//         <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
//         <div className="text-xl font-medium slide-in-bottom">Loading Study...</div>
//         <div className="text-sm text-muted-foreground animate-pulse">Fetching DICOM metadata</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="h-screen w-screen flex flex-col items-center justify-center bg-background space-y-4">
//         <div className="text-red-500 font-bold text-xl">Error Loading Study</div>
//         <div className="text-muted-foreground">{error}</div>
//         <button onClick={() => window.location.href = '/dashboard/technician'} className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80">
//           Return to Dashboard
//         </button>
//       </div>
//     );
//   }

//   if (showUploadScreen) {
//     return <FileUpload />;
//   }

//   // [Fix] Handle "Limbo" state where loading finished but no study is present (e.g. empty metadata)
//   // This replaces the confusing "Blank" screen with a helpful error
//   if (!isLoading && studies.length === 0 && !error) {
//     return (
//       <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white space-y-4">
//         <h2 className="text-2xl font-bold text-red-500">Study Not Found</h2>
//         <p className="text-gray-400">The requested study could not be loaded or contains no images.</p>
//         <p className="text-xs text-gray-500">
//           (URL Study ID: {searchParams.get('studyId') || 'None'})
//         </p>
//         <button onClick={() => window.location.href = '/dashboard/technician'} className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80 text-white">
//           Back to Dashboard
//         </button>
//       </div>
//     );
//   }

//   if (showMPR) {
//     return <MPRViewer onClose={() => setShowMPR(false)} />;
//   }

//   return (
//     <div className="h-screen flex flex-col bg-background overflow-hidden">
//       {/* Header */}
//       <Header onOpenMPR={() => setShowMPR(true)} />

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
//           <div className="flex-1 overflow-hidden font-inter">
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
//     </div>
//   );
// }
