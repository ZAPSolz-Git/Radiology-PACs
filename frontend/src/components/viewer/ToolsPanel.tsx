// import { useDicomStore } from '@/stores/dicomStore';
// import { Slider } from '@/components/ui/slider';
// import { Separator } from '@/components/ui/separator';
// import { MeasurementPanel } from './MeasurementPanel';
// import { CinePlayer } from './CinePlayer';
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/components/ui/accordion';
// import { Sliders, Ruler, Info, Film } from 'lucide-react';

// export function ToolsPanel() {
//   const {
//     viewports,
//     activeViewportId,
//     updateViewport,
//     studies,
//     selectedSeriesUID
//   } = useDicomStore();

//   const activeViewport = viewports.find(v => v.id === activeViewportId);
//   const study = studies.find(s => s.studyInstanceUID === activeViewport?.studyUID);
//   const series = study?.series.find(s => s.seriesInstanceUID === activeViewport?.seriesUID);

//   const handleWindowWidthChange = (value: number[]) => {
//     if (activeViewportId) {
//       updateViewport(activeViewportId, { windowWidth: value[0] });
//     }
//   };

//   const handleWindowCenterChange = (value: number[]) => {
//     if (activeViewportId) {
//       updateViewport(activeViewportId, { windowCenter: value[0] });
//     }
//   };

//   const handleZoomChange = (value: number[]) => {
//     if (activeViewportId) {
//       updateViewport(activeViewportId, { zoom: value[0] / 100 });
//     }
//   };

//   return (
//     <div className="h-full overflow-y-auto">
//       <Accordion type="multiple" defaultValue={['cine', 'viewport', 'measurements']} className="w-full">
//         {/* Cine Player */}
//         <AccordionItem value="cine" className="border-b-0">
//           <AccordionTrigger className="panel-header hover:no-underline">
//             <div className="flex items-center gap-2">
//               <Film className="w-4 h-4" />
//               <span>Cine Player</span>
//             </div>
//           </AccordionTrigger>
//           <AccordionContent className="px-3 py-2">
//             <CinePlayer />
//           </AccordionContent>
//         </AccordionItem>

//         <AccordionItem value="viewport" className="border-b-0">
//           <AccordionTrigger className="panel-header hover:no-underline">
//             <div className="flex items-center gap-2">
//               <Sliders className="w-4 h-4" />
//               <span>Viewport Controls</span>
//             </div>
//           </AccordionTrigger>
//           <AccordionContent className="px-3 py-4 space-y-6">
//             <div className="space-y-2">
//               <div className="flex justify-between text-sm">
//                 <span className="text-muted-foreground">Window Width</span>
//                 <span className="font-mono text-xs text-primary">{(activeViewport?.windowWidth ?? 400).toFixed(0)}</span>
//               </div>
//               <Slider
//                 value={[activeViewport?.windowWidth ?? 400]}
//                 min={1}
//                 max={4000}
//                 step={1}
//                 onValueChange={handleWindowWidthChange}
//               />
//             </div>
//             <div className="space-y-2">
//               <div className="flex justify-between text-sm">
//                 <span className="text-muted-foreground">Window Center</span>
//                 <span className="font-mono text-xs text-primary">{(activeViewport?.windowCenter ?? 40).toFixed(0)}</span>
//               </div>
//               <Slider
//                 value={[activeViewport?.windowCenter || 40]}
//                 min={-1000}
//                 max={3000}
//                 step={1}
//                 onValueChange={handleWindowCenterChange}
//               />
//             </div>
//             <div className="space-y-2">
//               <div className="flex justify-between text-sm">
//                 <span className="text-muted-foreground">Zoom</span>
//                 <span className="font-mono text-xs text-primary">{((activeViewport?.zoom ?? 1) * 100).toFixed(0)}%</span>
//               </div>
//               <Slider
//                 value={[(activeViewport?.zoom || 1) * 100]}
//                 min={10}
//                 max={500}
//                 step={1}
//                 onValueChange={handleZoomChange}
//               />
//             </div>
//           </AccordionContent>
//         </AccordionItem>
//         <AccordionItem value="measurements" className="border-b-0">
//           <AccordionTrigger className="panel-header hover:no-underline">
//             <div className="flex items-center gap-2">
//               <Ruler className="w-4 h-4" />
//               <span>Measurements</span>
//             </div>
//           </AccordionTrigger>
//           <AccordionContent className="p-0">
//             <MeasurementPanel />
//           </AccordionContent>
//         </AccordionItem>
//         <AccordionItem value="info" className="border-b-0">
//           <AccordionTrigger className="panel-header hover:no-underline">
//             <div className="flex items-center gap-2">
//               <Info className="w-4 h-4" />
//               <span>Image Information</span>
//             </div>
//           </AccordionTrigger>
//           <AccordionContent className="px-3 py-4">
//             {series ? (
//               <div className="space-y-2 text-sm">
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Modality</span>
//                   <span>{series.modality}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Series</span>
//                   <span className="truncate max-w-[120px]">{series.seriesDescription}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Images</span>
//                   <span>{series.instances.length}</span>
//                 </div>
//                 {study && (
//                   <>
//                     <Separator className="my-3" />
//                     <div className="flex justify-between">
//                       <span className="text-muted-foreground">Institution</span>
//                       <span className="truncate max-w-[120px]">{study.institutionName || 'Unknown'}</span>
//                     </div>
//                   </>
//                 )}
//               </div>
//             ) : (
//               <p className="text-sm text-muted-foreground text-center">No series selected</p>
//             )}
//           </AccordionContent>
//         </AccordionItem>
//       </Accordion>
//     </div>
//   );
// }
