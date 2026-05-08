// import { useDicomStore } from '@/stores/dicomStore';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import {
//   CornerstoneService,
//   RENDERING_ENGINE_ID,
// } from '@/services/CornerstoneService';
// import { syncGroupService } from '@/services/SyncGroupService';
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from '@/components/ui/tooltip';
// import { Separator } from '@/components/ui/separator';
// import { LayoutSelector } from './LayoutSelector';
// import {
//   Search,
//   Target,
//   Type,
//   Rows,
//   Sun,
//   Move,
//   ZoomIn,
//   Layers,
//   RotateCcw,
//   Ruler,
//   CornerUpRight,
//   Square,
//   Circle,
//   Crosshair,
//   Info,
//   RefreshCw,
//   Grid2x2,
//   Grid3x3,
//   LayoutGrid,
//   FlipHorizontal,
//   FlipVertical,
//   Contrast,
//   Bone,
//   Brain,
//   Stethoscope,
//   ArrowRightLeft
// } from 'lucide-react';
// import type { ToolType, LayoutConfig } from '@/types/dicom';

// interface ToolButtonProps {
//   tool: ToolType;
//   icon: React.ReactNode;
//   label: string;
//   shortcut?: string;
// }

// const tools: ToolButtonProps[] = [
//   { tool: 'WindowLevel', icon: <Sun className="w-4 h-4" />, label: 'Window/Level', shortcut: 'W' },
//   { tool: 'Pan', icon: <Move className="w-4 h-4" />, label: 'Pan', shortcut: 'P' },
//   { tool: 'Zoom', icon: <ZoomIn className="w-4 h-4" />, label: 'Zoom', shortcut: 'Z' },
//   { tool: 'Magnify', icon: <Search className="w-4 h-4" />, label: 'Magnifier', shortcut: 'M' },
//   { tool: 'StackScroll', icon: <Rows className="w-4 h-4" />, label: 'Stack Scroll', shortcut: 'S' },
//   { tool: 'PlanarRotate', icon: <RotateCcw className="w-4 h-4" />, label: 'Rotate (360)', shortcut: 'R' },
//   { tool: 'Probe', icon: <Target className="w-4 h-4" />, label: 'HU Values', shortcut: 'Q' },
// ];

// const measurementTools: ToolButtonProps[] = [
//   { tool: 'Length', icon: <Ruler className="w-4 h-4" />, label: 'Length', shortcut: 'L' },
//   { tool: 'Angle', icon: <CornerUpRight className="w-4 h-4" />, label: 'Angle', shortcut: 'A' },
//   { tool: 'RectangleROI', icon: <Square className="w-4 h-4" />, label: 'Rectangle ROI' },
//   { tool: 'EllipticalROI', icon: <Circle className="w-4 h-4" />, label: 'Ellipse ROI' },
//   { tool: 'Bidirectional', icon: <ArrowRightLeft className="w-4 h-4" />, label: 'Bidirectional' },
//   { tool: 'ArrowAnnotate', icon: <Type className="w-4 h-4" />, label: 'Annotation' },
//   { tool: 'Crosshairs', icon: <Crosshair className="w-4 h-4" />, label: 'Crosshairs' },
// ];

// interface PresetButtonProps {
//   icon: React.ReactNode;
//   label: string;
//   ww: number;
//   wc: number;
// }


// const windowPresets: PresetButtonProps[] = [
//   { icon: <Brain className="w-4 h-4" />, label: 'Brain', ww: 80, wc: 40 },
//   { icon: <Bone className="w-4 h-4" />, label: 'Bone', ww: 2000, wc: 500 },
//   { icon: <Stethoscope className="w-4 h-4" />, label: 'Lung', ww: 1500, wc: -600 },
//   { icon: <Contrast className="w-4 h-4" />, label: 'Soft Tissue', ww: 400, wc: 40 },
// ];

// export function ToolContent() {
//   const {
//     activeTool,
//     setActiveTool,
//     activeViewportId,
//     updateViewport,
//     resetViewport,
//     viewports,
//     isMultiSelectMode,
//     setMultiSelectMode,
//     selectedViewportIds,
//     toggleViewportSelection,
//     clearViewportSelection
//   } = useDicomStore();

//   const handleToolClick = (tool: ToolType) => {
//     setActiveTool(tool);
//   };

//   const handleCompareClick = () => {
//     const nextMode = !isMultiSelectMode;
//     setMultiSelectMode(nextMode);
//     if (nextMode && activeViewportId && !selectedViewportIds.includes(activeViewportId)) {
//       toggleViewportSelection(activeViewportId);
//     } else if (!nextMode) {
//       clearViewportSelection();
//     }
//   };

//   const handleReset = () => {
//     const targets = isMultiSelectMode
//       ? (selectedViewportIds.length > 0 ? selectedViewportIds : viewports.map(v => v.id))
//       : [activeViewportId].filter(Boolean);
//     targets.forEach(id => resetViewport(id as string));
//   };

//   const handleFlipH = () => {
//     const targets = isMultiSelectMode
//       ? (selectedViewportIds.length > 0 ? selectedViewportIds : viewports.map(v => v.id))
//       : [activeViewportId].filter(Boolean);
//     targets.forEach(id => {
//       const viewport = viewports.find(v => v.id === id);
//       if (viewport) updateViewport(id as string, { flipH: !viewport.flipH });
//     });
//   };

//   const handleFlipV = () => {
//     const targets = isMultiSelectMode
//       ? (selectedViewportIds.length > 0 ? selectedViewportIds : viewports.map(v => v.id))
//       : [activeViewportId].filter(Boolean);
//     targets.forEach(id => {
//       const viewport = viewports.find(v => v.id === id);
//       if (viewport) updateViewport(id as string, { flipV: !viewport.flipV });
//     });
//   };

//   const handleInvert = () => {
//     const targets = isMultiSelectMode
//       ? (selectedViewportIds.length > 0 ? selectedViewportIds : viewports.map(v => v.id))
//       : [activeViewportId].filter(Boolean);
//     targets.forEach(id => {
//       const viewport = viewports.find(v => v.id === id);
//       if (viewport) updateViewport(id as string, { invert: !viewport.invert });
//     });
//   };

//   const handleRotate = () => {
//     const targets = isMultiSelectMode
//       ? (selectedViewportIds.length > 0 ? selectedViewportIds : viewports.map(v => v.id))
//       : [activeViewportId].filter(Boolean);
//     targets.forEach(id => {
//       const viewport = viewports.find(v => v.id === id);
//       if (viewport) updateViewport(id as string, { rotation: (viewport.rotation + 90) % 360 });
//     });
//   };

//   return (
//     <div className="flex flex-col gap-6 p-4 h-full overflow-y-auto custom-scrollbar">
//       {/* Layout Section */}
//       <section className="space-y-3">
//         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Layout</h3>
//         <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
//           <LayoutSelector className="w-full" />
//         </div>
//       </section>

//       {/* Basic Tools */}
//       <section className="space-y-3">
//         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation Tools</h3>
//         <div className="grid grid-cols-4 gap-2">
//           {tools.map(({ tool, icon, label, shortcut }) => (
//             <Tooltip key={tool}>
//               <TooltipTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   className={cn(
//                     "w-10 h-10 rounded-lg transition-all duration-200",
//                     activeTool === tool
//                       ? "bg-primary text-primary-foreground shadow-lg scale-110 z-10"
//                       : "bg-muted/50 hover:bg-primary/20 hover:text-primary"
//                   )}
//                   onClick={() => handleToolClick(tool)}
//                 >
//                   {icon}
//                 </Button>
//               </TooltipTrigger>
//               <TooltipContent side="right">
//                 <p>{label} {shortcut && <span className="text-muted-foreground ml-1">({shortcut})</span>}</p>
//               </TooltipContent>
//             </Tooltip>
//           ))}
//         </div>
//       </section>

//       {/* Viewport Sync */}
//       <section className="space-y-3">
//         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Viewport Actions</h3>
//         <div className="grid grid-cols-2 gap-2">
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className={cn(
//                   "h-10 px-3 gap-2 font-medium rounded-lg border transition-all duration-200",
//                   isMultiSelectMode
//                     ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30"
//                     : "bg-muted/50 border-border/50 hover:bg-primary/10 hover:border-primary/30"
//                 )}
//                 onClick={handleCompareClick}
//               >
//                 <Crosshair className={cn("w-4 h-4", isMultiSelectMode && "animate-pulse")} />
//                 <span className="text-xs">Compare</span>
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">
//               <p>{isMultiSelectMode ? "Exit Compare Mode" : "Enable Multi-Select Compare"}</p>
//             </TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className={cn(
//                   "h-10 px-3 gap-2 font-medium rounded-lg border bg-muted/50 border-border/50 hover:bg-primary/10 hover:border-primary/30",
//                 )}
//                 onClick={() => {
//                   const targets = isMultiSelectMode ? selectedViewportIds : [activeViewportId].filter(Boolean) as string[];
//                   if (targets.length < 2) return;
//                   targets.forEach(id => {
//                     syncGroupService.addViewportToSyncGroup(id, RENDERING_ENGINE_ID, 'axialSyncGroup');
//                   });
//                 }}
//               >
//                 <ArrowRightLeft className="w-4 h-4" />
//                 <span className="text-xs">Link</span>
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">
//               <p>Synchronize Viewports</p>
//             </TooltipContent>
//           </Tooltip>
//         </div>
//       </section>

//       {/* Measurement Tools */}
//       <section className="space-y-3">
//         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Measurements</h3>
//         <div className="grid grid-cols-4 gap-2">
//           {measurementTools.map(({ tool, icon, label, shortcut }) => (
//             <Tooltip key={tool}>
//               <TooltipTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   className={cn(
//                     "w-10 h-10 rounded-lg transition-all duration-200",
//                     activeTool === tool
//                       ? "bg-primary text-primary-foreground shadow-lg scale-110 z-10"
//                       : "bg-muted/50 hover:bg-primary/20 hover:text-primary"
//                   )}
//                   onClick={() => handleToolClick(tool)}
//                 >
//                   {icon}
//                 </Button>
//               </TooltipTrigger>
//               <TooltipContent side="right">
//                 <p>{label} {shortcut && <span className="text-muted-foreground ml-1">({shortcut})</span>}</p>
//               </TooltipContent>
//             </Tooltip>
//           ))}
//         </div>
//       </section>

//       {/* Image Manipulation */}
//       <section className="space-y-3 pb-4">
//         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Manipulation</h3>
//         <div className="grid grid-cols-4 gap-2">
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="w-10 h-10 bg-muted/50 rounded-lg hover:bg-primary/20 hover:text-primary transition-all duration-200"
//                 onClick={handleRotate}
//               >
//                 <RotateCcw className="w-4 h-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">Rotate 90°</TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="w-10 h-10 bg-muted/50 rounded-lg hover:bg-primary/20 hover:text-primary transition-all duration-200"
//                 onClick={handleFlipH}
//               >
//                 <FlipHorizontal className="w-4 h-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">Flip Horizontal</TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="w-10 h-10 bg-muted/50 rounded-lg hover:bg-primary/20 hover:text-primary transition-all duration-200"
//                 onClick={handleFlipV}
//               >
//                 <FlipVertical className="w-4 h-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">Flip Vertical</TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="w-10 h-10 bg-muted/50 rounded-lg hover:bg-primary/20 hover:text-primary transition-all duration-200"
//                 onClick={handleInvert}
//               >
//                 <Contrast className="w-4 h-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">Invert</TooltipContent>
//           </Tooltip>

//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="w-10 h-10 bg-muted/50 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
//                 onClick={handleReset}
//               >
//                 <RefreshCw className="w-4 h-4" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent side="right">Reset Viewport</TooltipContent>
//           </Tooltip>
//         </div>
//       </section>
//     </div>
//   );
// }

// export function Toolbar() {
//   return null; // Bottom toolbar is being retired
// }
