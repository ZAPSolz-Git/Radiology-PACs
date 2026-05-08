// import { useState } from 'react';
// import { getRenderingEngine, utilities as csUtils } from '@cornerstonejs/core';
// import { useDicomStore } from '@/stores/dicomStore';
// import { MPRViewport } from './MPRViewport';
// import { MPRSettingsPanel } from './MPRSettingsPanel';
// import { StudyBrowser } from './StudyBrowser';
// import { Button } from '@/components/ui/button';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter
// } from "@/components/ui/dialog";
// import { X, Crosshair, ChevronRight, ChevronLeft } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface MPRViewerProps {
//   onClose: () => void;
// }

// export function MPRViewer({ onClose }: MPRViewerProps) {
//   const { selectedSeriesUID } = useDicomStore();
//   const [layout, setLayout] = useState<'1x3' | '2x2'>('1x3');
//   const [blendMode, setBlendMode] = useState<string>('COMPOSITE');
//   const [slabThickness, setSlabThickness] = useState(0.1);
//   const [voiPreset, setVoiPreset] = useState<{ window: number, level: number } | null>(null);
//   const [activeOrientation, setActiveOrientation] = useState<'AXIAL' | 'SAGITTAL' | 'CORONAL' | null>(null);
//   const [activeTool, setActiveTool] = useState<string>('Crosshairs');
//   const [activeViewportId, setActiveViewportId] = useState<string | null>('MPR_AXIAL');
//   const [isPanelOpen, setIsPanelOpen] = useState(true);

//   const [comparisonSeriesUID, setComparisonSeriesUID] = useState<string | null>(null);
//   const [isSeriesSelectorOpen, setIsSeriesSelectorOpen] = useState(false);
//   const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);

//   // Helper to start comparison
//   const openComparisonSelector = () => {
//     setIsSeriesSelectorOpen(true);
//   };

//   const handleComparisonSelect = (seriesUID: string) => {
//     setComparisonSeriesUID(seriesUID);
//     setIsSeriesSelectorOpen(false);
//   };

//   const batchExportSeries = async () => {
//     if (!activeViewportId) return;

//     // Extract seriesUID from unique activeViewportId (Format: MPR_AXIAL_seriesUID)
//     const parts = activeViewportId.split('_');
//     const seriesUID = parts.slice(2).join('_');
//     if (!seriesUID) return;

//     const RENDERING_ENGINE_ID = `mpr_engine_${seriesUID}`;
//     const engine = getRenderingEngine(RENDERING_ENGINE_ID);
//     const viewport = engine?.getViewport(activeViewportId) as any;
//     if (!viewport) return;

//     const { numberOfSlices } = csUtils.getImageSliceDataForVolumeViewport(viewport);
//     if (!numberOfSlices) return;

//     setBatchProgress({ current: 0, total: numberOfSlices });

//     for (let i = 0; i < numberOfSlices; i++) {
//       setBatchProgress({ current: i + 1, total: numberOfSlices });

//       // Jump to slice
//       csUtils.jumpToSlice(viewport.element, { imageIndex: i });
//       viewport.render();

//       // Wait a bit for render to finish
//       await new Promise(resolve => setTimeout(resolve, 50));

//       const canvas = viewport.canvas;
//       if (canvas) {
//         const link = document.createElement('a');
//         link.href = canvas.toDataURL('image/png');
//         link.download = `batch_${activeViewportId.toLowerCase()}_slice_${i + 1}.png`;
//         link.click();
//       }

//       // Anti-overwhelm break
//       if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     setBatchProgress(null);
//   };

//   const exportActiveViewport = () => {
//     if (!activeViewportId) return;

//     const parts = activeViewportId.split('_');
//     const seriesUID = parts.slice(2).join('_');
//     if (!seriesUID) return;

//     const RENDERING_ENGINE_ID = `mpr_engine_${seriesUID}`;
//     const engine = getRenderingEngine(RENDERING_ENGINE_ID);
//     const viewport = engine?.getViewport(activeViewportId);
//     if (!viewport || !viewport.canvas) return;

//     const canvas = viewport.canvas;
//     const link = document.createElement('a');
//     link.href = canvas.toDataURL('image/png');
//     link.download = `mpr_${activeViewportId.toLowerCase()}_${Date.now()}.png`;
//     link.click();
//   };

//   if (!selectedSeriesUID) {
//     return (
//       <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
//         <div className="text-center p-6 bg-card border rounded shadow-lg">
//           <p className="mb-4">No Series Selected</p>
//           <Button onClick={onClose}>Close</Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="fixed inset-0 z-50 bg-background flex flex-col">
//       {/* Header */}
//       <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
//         <div className="flex items-center gap-4">
//           <div className="flex items-center gap-2">
//             <Crosshair className="w-5 h-5 text-primary" />
//             <span className="font-semibold">MPR Viewer (Cornerstone3D)</span>
//             {comparisonSeriesUID && (
//               <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Comparison Mode</span>
//             )}
//           </div>
//         </div>

//         <div className="flex items-center gap-4">
//           <div className="text-xs text-muted-foreground mr-4">
//             Left Click: Crosshairs | Right Click: Zoom | Middle: Pan | Wheel: Scroll
//           </div>
//           {/* Close button */}
//           <Button variant="ghost" size="icon" onClick={onClose}>
//             <X className="w-5 h-5" />
//           </Button>
//         </div>
//       </div>

//       {/* Main Content Area: Flex Row */}
//       <div className="flex-1 w-full h-full overflow-hidden flex flex-row">

//         {/* Viewports Container */}
//         <div className="flex-1 h-full overflow-hidden flex flex-row">
//           {/* Primary Series */}
//           <div className={cn("h-full overflow-hidden transition-all", comparisonSeriesUID ? "w-1/2 border-r border-border" : "w-full")}>
//             <MPRViewport
//               seriesInstanceUID={selectedSeriesUID}
//               uniqueKey="primary"
//               onClose={onClose}
//               layout={layout}
//               blendMode={blendMode}
//               slabThickness={slabThickness}
//               voiPreset={voiPreset}
//               activeOrientation={activeOrientation}
//               activeTool={activeTool}
//               activeViewportId={activeViewportId}
//               onViewportClick={setActiveViewportId}
//             />
//           </div>

//           {/* Comparison Series */}
//           {comparisonSeriesUID && (
//             <div className="w-1/2 h-full overflow-hidden">
//               <MPRViewport
//                 seriesInstanceUID={comparisonSeriesUID}
//                 uniqueKey="comparison"
//                 onClose={onClose}
//                 layout={layout}
//                 blendMode={blendMode}
//                 slabThickness={slabThickness}
//                 voiPreset={voiPreset}
//                 activeOrientation={activeOrientation}
//                 activeTool={activeTool}
//                 activeViewportId={activeViewportId}
//                 onViewportClick={setActiveViewportId}
//                 className="border-l border-border"
//               />
//               {/* Floating Close Button for Comparison */}
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="absolute top-14 right-[340px] z-50 bg-black/50 hover:bg-black/80 text-white border border-white/20"
//                 onClick={() => setComparisonSeriesUID(null)}
//               >
//                 <X className="w-4 h-4" />
//               </Button>
//             </div>
//           )}
//         </div>

//         {/* Right: Settings Panel Wrapper */}
//         <div className={cn("relative transition-all duration-300 ease-in-out border-l border-border bg-card",
//           isPanelOpen ? "w-80" : "w-0"
//         )}>
//           {/* Toggle Button */}
//           <Button
//             variant="ghost"
//             size="icon"
//             className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-6 bg-card border border-border rounded-l-md rounded-r-none z-10 shadow-sm hover:bg-accent"
//             onClick={() => setIsPanelOpen(!isPanelOpen)}
//           >
//             {isPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
//           </Button>

//           {/* Panel Content */}
//           <div className={cn("h-full w-full overflow-hidden", isPanelOpen ? "opacity-100" : "opacity-0 invisible")}>
//             <MPRSettingsPanel
//               layout={layout}
//               setLayout={setLayout}
//               blendMode={blendMode}
//               setBlendMode={setBlendMode}
//               slabThickness={slabThickness}
//               setSlabThickness={setSlabThickness}
//               applyWLPreset={setVoiPreset}
//               applyOrientation={setActiveOrientation}
//               activeTool={activeTool}
//               setActiveTool={setActiveTool}
//               activeViewportId={activeViewportId}
//               onExport={exportActiveViewport}
//               onBatchExport={batchExportSeries}
//               batchProgress={batchProgress}
//               onCompare={openComparisonSelector}
//               isComparisonActive={!!comparisonSeriesUID}
//             />
//           </div>
//         </div>

//       </div>

//       {/* Series Selection Dialog */}
//       <Dialog open={isSeriesSelectorOpen} onOpenChange={setIsSeriesSelectorOpen}>
//         <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
//           <DialogHeader className="px-6 py-4 border-b">
//             <DialogTitle>Select Series for Comparison</DialogTitle>
//             <DialogDescription>
//               Choose a series to display side-by-side with the current MPR view.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="flex-1 overflow-hidden p-0">
//             {/* We need a version of StudyBrowser that accepts an onSelect callback */}
//             <StudyBrowser onSelectSeries={handleComparisonSelect} />
//           </div>
//           <DialogFooter className="px-6 py-4 border-t">
//             <Button variant="outline" onClick={() => setIsSeriesSelectorOpen(false)}>Cancel</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//     </div>
//   );
// }
