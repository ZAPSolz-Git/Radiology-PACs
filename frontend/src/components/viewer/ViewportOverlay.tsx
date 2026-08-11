// import { useDicomStore } from "@/stores/dicomStore";
// import { useEffect, useRef, useMemo, useState } from "react";
// import { CornerstoneService } from "@/services/CornerstoneService";
// import { Enums, metaData } from "@cornerstonejs/core";
// import { IStackViewport } from "@cornerstonejs/core/types";
// import { Input } from "@/components/ui/input";

// import { displaySetService } from "@/services/DisplaySetService";
// import { observer } from 'mobx-react-lite';

// interface ViewportOverlayProps {
//     viewportId: string;
//     studyUID: string;
//     seriesUID: string;
//     displaySetInstanceUID: string;
// }

// // CRITICAL: Zero flicker overlay with pure DOM manipulation
// export const ViewportOverlay = observer(({ viewportId, studyUID, seriesUID, displaySetInstanceUID }: ViewportOverlayProps) => {
//     const { studies, activeTool, updateViewport, viewports } = useDicomStore();
//     const [isEditingWL, setIsEditingWL] = useState(false);
//     const [isEditingZoom, setIsEditingZoom] = useState(false);

//     // Get current W/L from store for initial input values
//     const currentViewport = viewports.find(v => v.id === viewportId);
//     const [editWw, setEditWw] = useState(currentViewport?.windowWidth?.toString() || "");
//     const [editWc, setEditWc] = useState(currentViewport?.windowCenter?.toString() || "");
//     const [editZoom, setEditZoom] = useState(currentViewport?.zoom ? Math.round(currentViewport.zoom * 100).toString() : "100");

//     // DOM element refs (bypasses React reconciliation)
//     const imageIndexRef = useRef<HTMLDivElement>(null);
//     const wwlcTextRef = useRef<HTMLSpanElement>(null);
//     const zoomRef = useRef<HTMLDivElement>(null);
//     const sliceLocRef = useRef<HTMLDivElement>(null);
//     const sliceThickRef = useRef<HTMLDivElement>(null);
//     const pixelValueRef = useRef<HTMLDivElement>(null);

//     // Stable series reference via DisplaySetService
//     const { study, series } = useMemo(() => {
//         const s = studies.find((st) => st.studyInstanceUID === studyUID);
//         const displaySet = displaySetService.getDisplaySet(displaySetInstanceUID);
//         return { study: s, series: displaySet };
//     }, [studies, studyUID, displaySetInstanceUID, displaySetService.displaySets.size]); // size check for reactivity fallback

//     useEffect(() => {
//         if (!CornerstoneService.isInitialized) return;

//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         const csViewport = renderingEngine.getViewport(viewportId) as IStackViewport;
//         if (!csViewport) return;

//         const element = csViewport.element;
//         if (!element) return;

//         // CRITICAL: Throttled updates for high FPS performance
//         let updateScheduled = false;

//         const scheduleUpdate = (updateFn: () => void) => {
//             if (!updateScheduled) {
//                 updateScheduled = true;
//                 requestAnimationFrame(() => {
//                     updateFn();
//                     updateScheduled = false;
//                 });
//             }
//         };

//         // Pixel value hover logic
//         const handleMouseMove = (evt: MouseEvent) => {
//             if (activeTool !== 'Probe' || !pixelValueRef.current) {
//                 if (pixelValueRef.current && pixelValueRef.current.textContent) {
//                     pixelValueRef.current.textContent = "";
//                 }
//                 return;
//             }

//             scheduleUpdate(() => {
//                 if (!pixelValueRef.current) return;
//                 const rect = element.getBoundingClientRect();
//                 const canvasPos: [number, number] = [
//                     evt.clientX - rect.left,
//                     evt.clientY - rect.top
//                 ];

//                 const valueStr = CornerstoneService.getPixelValue(csViewport, canvasPos);
//                 pixelValueRef.current.textContent = valueStr || "";
//             });
//         };

//         // Image info update (throttled for cine)
//         const updateImageInfo = () => {
//             scheduleUpdate(() => {
//                 if (!imageIndexRef.current) return;

//                 const index = csViewport.getCurrentImageIdIndex();
//                 const numSlices = csViewport.getNumberOfSlices();
//                 const imageId = csViewport.getCurrentImageId();

//                 // Direct DOM update (no React state)
//                 imageIndexRef.current.textContent = `IM: ${index + 1}/${numSlices}`;

//                 // Update slice location/thickness using Cornerstone's metadata provider (Standard Way)
//                 const imagePlane = metaData.get('imagePlaneModule', imageId);

//                 if (imagePlane) {
//                     if (sliceLocRef.current) {
//                         // Use sliceLocation if available, otherwise fallback to Z-position
//                         const loc = imagePlane.sliceLocation !== undefined
//                             ? imagePlane.sliceLocation
//                             : (imagePlane.imagePositionPatient ? imagePlane.imagePositionPatient[2] : 0);
//                         sliceLocRef.current.textContent = `Loc: ${loc.toFixed(2)} mm`;
//                     }
//                     if (sliceThickRef.current) {
//                         const thick = imagePlane.sliceThickness || 0;
//                         sliceThickRef.current.textContent = `Thk: ${thick.toFixed(2)} mm`;
//                     }
//                 } else {
//                     // Fallback to series-based search if metadata provider fails
//                     const instance = series?.instances.find((inst: any) => inst.imageId === imageId);
//                     if (instance) {
//                         if (sliceLocRef.current) {
//                             sliceLocRef.current.textContent = `Loc: ${instance.sliceLocation?.toFixed(2) || '0.00'} mm`;
//                         }
//                         if (sliceThickRef.current) {
//                             sliceThickRef.current.textContent = `Thk: ${instance.sliceThickness?.toFixed(2) || '0.00'} mm`;
//                         }
//                     }
//                 }
//             });
//         };

//         // VOI update (immediate, user feedback)
//         const updateVOI = (evt: any) => {
//             if (!wwlcTextRef.current || isEditingWL) return;

//             const { range } = evt.detail;
//             const ww = Math.round(range.upper - range.lower);
//             const wc = Math.round((range.upper + range.lower) / 2);

//             wwlcTextRef.current.textContent = `W: ${ww} L: ${wc}`;
//         };

//         // Camera update (throttled)
//         // ... existing updateCamera logic ...
//         const updateCamera = () => {
//             scheduleUpdate(() => {
//                 if (!zoomRef.current) return;

//                 try {
//                     const camera = csViewport.getCamera();
//                     if (camera && camera.parallelScale) {
//                         const zoomPercent = Math.round((1 / (camera.parallelScale / 500)) * 100) || 100;
//                         zoomRef.current.textContent = `Zoom: ${zoomPercent}%`;
//                     }
//                 } catch (error) {
//                     // Viewport not fully initialized yet, skip update
//                 }
//             });
//         };

//         // Initialize
//         updateImageInfo();
//         const props = csViewport.getProperties();
//         if (props.voiRange && wwlcTextRef.current) {
//             const ww = Math.round(props.voiRange.upper - props.voiRange.lower);
//             const wc = Math.round((props.voiRange.upper + props.voiRange.lower) / 2);
//             wwlcTextRef.current.textContent = `W: ${ww} L: ${wc}`;
//         }

//         try {
//             updateCamera();
//         } catch (error) { }

//         // Event listeners
//         element.addEventListener('mousemove', handleMouseMove);
//         element.addEventListener(Enums.Events.STACK_NEW_IMAGE, updateImageInfo);
//         element.addEventListener(Enums.Events.IMAGE_RENDERED, updateImageInfo); // Fallback for fast transit
//         element.addEventListener(Enums.Events.VOI_MODIFIED, updateVOI);
//         element.addEventListener(Enums.Events.CAMERA_MODIFIED, updateCamera);

//         return () => {
//             element.removeEventListener('mousemove', handleMouseMove);
//             element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, updateImageInfo);
//             element.removeEventListener(Enums.Events.IMAGE_RENDERED, updateImageInfo);
//             element.removeEventListener(Enums.Events.VOI_MODIFIED, updateVOI);
//             element.removeEventListener(Enums.Events.CAMERA_MODIFIED, updateCamera);
//         };
//     }, [viewportId, series?.seriesInstanceUID, activeTool, isEditingWL, isEditingZoom]);

//     const handleWLSubmit = (e?: React.FocusEvent) => {
//         // Only submit if we're not moving focus to another input in the same container
//         if (e?.relatedTarget && (e.relatedTarget as HTMLElement).closest('.wl-edit-container')) {
//             return;
//         }
//         setIsEditingWL(false);
//     };

//     const handleWLChange = (wwStr: string, wcStr: string) => {
//         setEditWw(wwStr);
//         setEditWc(wcStr);

//         const ww = parseFloat(wwStr);
//         const wc = parseFloat(wcStr);
//         if (!isNaN(ww) && !isNaN(wc)) {
//             // Instant feedback
//             updateViewport(viewportId, { windowWidth: ww, windowCenter: wc });
//         }
//     };

//     const handleZoomSubmit = (e?: React.FocusEvent) => {
//         if (e?.relatedTarget && (e.relatedTarget as HTMLElement).closest('.zoom-edit-container')) {
//             return;
//         }
//         setIsEditingZoom(false);
//     };

//     const handleZoomChange = (zoomStr: string) => {
//         setEditZoom(zoomStr);
//         const zoomPercent = parseFloat(zoomStr);
//         if (!isNaN(zoomPercent) && zoomPercent > 0) {
//             updateViewport(viewportId, { zoom: zoomPercent / 100 });
//         }
//     };

//     if (!series) return null;

//     return (
//         <>
//             {/* Top Left - Patient Info */}
//             <div className="absolute top-3 left-12 space-y-0.5 pointer-events-none text-[#56CCF2] text-sm z-10 select-none">
//                 <div className="font-bold uppercase tracking-tight">{study?.patientName || 'Anonymous'}</div>
//                 <div className="text-xs opacity-90">{study?.patientID || 'No ID'}</div>
//                 <div className="text-xs opacity-90">
//                     {study?.studyDate && study.studyDate.length >= 8
//                         ? `${study.studyDate.slice(0, 4)}-${study.studyDate.slice(4, 6)}-${study.studyDate.slice(6, 8)}`
//                         : (study?.studyDate || "")}
//                 </div>
//             </div>

//             {/* Top Right - Series Info */}
//             <div className="absolute top-3 right-3 text-right space-y-0.5 pointer-events-none text-[#56CCF2] text-sm z-10 select-none">
//                 <div className="font-bold uppercase tracking-tight">{series.modality || '??'}</div>
//                 <div className="text-xs opacity-90">
//                     {series.seriesDescription || (series.seriesNumber ? `Series ${series.seriesNumber}` : 'No Description')}
//                 </div>
//                 {series.seriesNumber !== undefined && (
//                     <div className="text-xs opacity-90">SE: {series.seriesNumber}</div>
//                 )}
//             </div>

//             {/* Bottom Left - Image Position */}
//             <div className="absolute bottom-3 left-12 space-y-0.5 pointer-events-none text-[#56CCF2] text-sm z-10 select-none">
//                 <div ref={imageIndexRef} className="font-medium tracking-tight">IM: 1/1</div>
//                 <div className="text-xs opacity-90 space-y-0.5">
//                     <div ref={sliceLocRef}>Loc: 0.00 mm</div>
//                     <div ref={sliceThickRef}>Thk: 0.00 mm</div>
//                 </div>
//                 <div ref={pixelValueRef} className="text-yellow-400 font-bold mt-1 min-h-[1.25rem]"></div>
//             </div>

//             <div className="absolute bottom-3 right-3 text-right space-y-0.5 text-[#56CCF2] text-sm z-20 select-none">
//                 <div
//                     className="font-medium tracking-tight cursor-pointer hover:text-white transition-colors pointer-events-auto"
//                     onClick={(e) => {
//                         e.stopPropagation();
//                         // Extract current values from display text
//                         if (wwlcTextRef.current) {
//                             const text = wwlcTextRef.current.textContent || "";
//                             const match = text.match(/W: (-?\d+) L: (-?\d+)/);
//                             if (match) {
//                                 setEditWw(match[1]);
//                                 setEditWc(match[2]);
//                             }
//                         }
//                         setIsEditingWL(true);
//                         setIsEditingZoom(false);
//                     }}
//                 >
//                     {isEditingWL ? (
//                         <div
//                             className="flex flex-col gap-1 items-end bg-black/80 p-2 rounded border border-white/20 mb-1 wl-edit-container"
//                             onClick={e => e.stopPropagation()}
//                         >
//                             <div className="flex items-center gap-2">
//                                 <span className="text-[10px] opacity-70 uppercase tracking-tighter">Width</span>
//                                 <Input
//                                     className="h-6 w-16 text-xs bg-black/50 border-white/20 text-white p-1 select-text"
//                                     value={editWw}
//                                     autoFocus
//                                     onChange={e => handleWLChange(e.target.value, editWc)}
//                                     onBlur={handleWLSubmit}
//                                     onKeyDown={e => e.key === 'Enter' && handleWLSubmit()}
//                                 />
//                             </div>
//                             <div className="flex items-center gap-2">
//                                 <span className="text-[10px] opacity-70 uppercase tracking-tighter">Level</span>
//                                 <Input
//                                     className="h-6 w-16 text-xs bg-black/50 border-white/20 text-white p-1 select-text"
//                                     value={editWc}
//                                     onChange={e => handleWLChange(editWw, e.target.value)}
//                                     onBlur={handleWLSubmit}
//                                     onKeyDown={e => e.key === 'Enter' && handleWLSubmit()}
//                                 />
//                             </div>
//                         </div>
//                     ) : (
//                         <span ref={wwlcTextRef}>
//                             W: {Math.round(currentViewport?.windowWidth || 0)} L: {Math.round(currentViewport?.windowCenter || 0)}
//                         </span>
//                     )}
//                 </div>

//                 <div
//                     className="cursor-pointer hover:text-white transition-colors pointer-events-auto"
//                     onClick={(e) => {
//                         e.stopPropagation();
//                         if (zoomRef.current) {
//                             const text = zoomRef.current.textContent || "";
//                             const match = text.match(/Zoom: (\d+)%/);
//                             if (match) {
//                                 setEditZoom(match[1]);
//                             }
//                         }
//                         setIsEditingZoom(true);
//                         setIsEditingWL(false);
//                     }}
//                 >
//                     {isEditingZoom ? (
//                         <div
//                             className="flex items-center gap-2 bg-black/80 p-2 rounded border border-white/20 zoom-edit-container"
//                             onClick={e => e.stopPropagation()}
//                         >
//                             <span className="text-[10px] opacity-70 uppercase tracking-tighter">Zoom %</span>
//                             <Input
//                                 className="h-6 w-16 text-xs bg-black/50 border-white/20 text-white p-1 select-text"
//                                 value={editZoom}
//                                 autoFocus
//                                 onChange={e => handleZoomChange(e.target.value)}
//                                 onBlur={handleZoomSubmit}
//                                 onKeyDown={e => e.key === 'Enter' && handleZoomSubmit()}
//                             />
//                         </div>
//                     ) : (
//                         <div ref={zoomRef} className="text-xs opacity-90">Zoom: 100%</div>
//                     )}
//                 </div>
//             </div>

//             {/* Orientation Markers */}
//             <div className="absolute top-4 left-1/2 -translate-x-1/2 font-bold text-[#56CCF2] pointer-events-none select-none z-10">A</div>
//             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-bold text-[#56CCF2] pointer-events-none select-none z-10">P</div>
//             <div className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-[#56CCF2] pointer-events-none select-none z-10">R</div>
//             <div className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-[#56CCF2] pointer-events-none select-none z-10">L</div>
//         </>
//     );
// });
