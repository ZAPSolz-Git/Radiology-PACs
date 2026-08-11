// import { useDicomStore } from "@/stores/dicomStore";
// import { useEffect, useRef, useMemo, useState } from "react";
// import { CornerstoneService } from "@/services/CornerstoneService";
// import { Enums, getRenderingEngine } from "@cornerstonejs/core";
// import { IVolumeViewport } from "@cornerstonejs/core/types";
// import { Input } from "@/components/ui/input";
// import { cache } from '@cornerstonejs/core';

// interface MPRViewportOverlayProps {
//     viewportId: string;
//     studyUID: string;
//     seriesUID: string;
//     label: string; // e.g. "AXIAL"
//     labelColor?: string;
//     engineId?: string;
//     activeTool?: string;
//     slabThickness?: number;
//     onWLChange?: (ww: number, wc: number) => void;
//     onSlabThicknessChange?: (thickness: number) => void;
// }

// export const MPRViewportOverlay = ({
//     viewportId, studyUID, seriesUID, label, labelColor = "text-cyan-400",
//     engineId, activeTool, slabThickness, onWLChange, onSlabThicknessChange
// }: MPRViewportOverlayProps) => {
//     const { studies } = useDicomStore();
//     const [isEditingWL, setIsEditingWL] = useState(false);
//     const [isEditingThickness, setIsEditingThickness] = useState(false);

//     const [editWw, setEditWw] = useState("");
//     const [editWc, setEditWc] = useState("");
//     const [editThickness, setEditThickness] = useState(slabThickness?.toString() || "0");

//     // DOM refs
//     const wwlcTextRef = useRef<HTMLSpanElement>(null);
//     const zoomRef = useRef<HTMLDivElement>(null);
//     const sliceLocRef = useRef<HTMLDivElement>(null);
//     const pixelValueRef = useRef<HTMLDivElement>(null);
//     const thicknessTextRef = useRef<HTMLSpanElement>(null);

//     const { study, series } = useMemo(() => {
//         const s = studies.find((st) => st.studyInstanceUID === studyUID);
//         const ser = s?.series.find((sr) => sr.seriesInstanceUID === seriesUID);
//         return { study: s, series: ser };
//     }, [studies, studyUID, seriesUID]);

//     useEffect(() => {
//         const actualEngineId = engineId || 'mpr_rendering_engine';

//         const updateOverlay = () => {
//             const renderingEngine = getRenderingEngine(actualEngineId);
//             if (!renderingEngine) return;

//             const viewport = renderingEngine.getViewport(viewportId) as IVolumeViewport;
//             if (!viewport) return;

//             // VOI (Window Level) & Geometry Safety
//             if (wwlcTextRef.current && !isEditingWL) {
//                 const props = viewport.getProperties();
//                 const voiRange = props?.voiRange;
//                 const volumeId = viewport.getVolumeId();
//                 const volume = CornerstoneService.isInitialized ? cache.getVolume(volumeId) : null;
//                 const hasGeom = volume && volume.spacing && volume.spacing[0] > 0;

//                 let text = '';
//                 if (!hasGeom) text += '[NO GEOM] ';

//                 if (voiRange) {
//                     const ww = Math.round(voiRange.upper - voiRange.lower);
//                     const wc = Math.round((voiRange.upper + voiRange.lower) / 2);
//                     text += `W: ${ww} L: ${wc}`;
//                 } else {
//                     text += `W: - L: -`;
//                 }
//                 wwlcTextRef.current.textContent = text;
//                 wwlcTextRef.current.style.color = hasGeom ? 'white' : '#ff4d4d';
//             }

//             // Slice Info (IM: X/Y and Loc)
//             if (sliceLocRef.current && label !== '3D VOLUME') {
//                 try {
//                     const { focalPoint } = viewport.getCamera();
//                     const volumeId = viewport.getVolumeId();
//                     const volume = CornerstoneService.isInitialized ? cache.getVolume(volumeId) : null;

//                     if (focalPoint && volume) {
//                         const { origin, spacing, dimensions } = volume;
//                         // Calculate index based on focal point relative to origin in the dominant direction
//                         let index = 0;
//                         let total = 0;
//                         let loc = 0;

//                         if (label === 'AXIAL') {
//                             index = Math.round((focalPoint[2] - origin[2]) / spacing[2]);
//                             total = dimensions[2];
//                             loc = focalPoint[2];
//                         } else if (label === 'SAGITTAL') {
//                             index = Math.round((focalPoint[0] - origin[0]) / spacing[0]);
//                             total = dimensions[0];
//                             loc = focalPoint[0];
//                         } else if (label === 'CORONAL') {
//                             index = Math.round((focalPoint[1] - origin[1]) / spacing[1]);
//                             total = dimensions[1];
//                             loc = focalPoint[1];
//                         }

//                         // Ensure positive index starting from 1
//                         const displayIndex = Math.abs(index) + 1;
//                         sliceLocRef.current.innerHTML = `
//                             <div class="font-medium tracking-tight">IM: ${displayIndex}/${total}</div>
//                             <div class="text-xs opacity-90">Loc: ${loc.toFixed(2)} mm</div>
//                         `;
//                     }
//                 } catch (e) {
//                     // Fail silently if metadata not ready
//                 }
//             }
//         };

//         const handleMouseMove = (evt: MouseEvent) => {
//             if (activeTool !== 'Probe' || !pixelValueRef.current) {
//                 if (pixelValueRef.current && pixelValueRef.current.textContent) {
//                     pixelValueRef.current.textContent = "";
//                 }
//                 return;
//             }

//             const renderingEngine = getRenderingEngine(actualEngineId);
//             const viewport = renderingEngine?.getViewport(viewportId);
//             if (!viewport || !viewport.element) return;

//             const rect = viewport.element.getBoundingClientRect();
//             const canvasPos: [number, number] = [
//                 evt.clientX - rect.left,
//                 evt.clientY - rect.top
//             ];

//             const valueStr = CornerstoneService.getPixelValue(viewport, canvasPos);
//             pixelValueRef.current.textContent = valueStr || "";
//         };

//         const onRender = () => {
//             updateOverlay();
//         };

//         let attachedElement: HTMLElement | null = null;
//         const interval = setInterval(() => {
//             const engine = getRenderingEngine(actualEngineId);
//             const viewport = engine?.getViewport(viewportId);
//             if (viewport && viewport.element) {
//                 attachedElement = viewport.element;
//                 attachedElement.addEventListener(Enums.Events.IMAGE_RENDERED, onRender);
//                 attachedElement.addEventListener(Enums.Events.CAMERA_MODIFIED, onRender);
//                 attachedElement.addEventListener('mousemove', handleMouseMove);
//                 clearInterval(interval);
//                 updateOverlay();
//             }
//         }, 100);

//         return () => {
//             clearInterval(interval);
//             if (attachedElement) {
//                 attachedElement.removeEventListener(Enums.Events.IMAGE_RENDERED, onRender);
//                 attachedElement.removeEventListener('mousemove', handleMouseMove);
//             }
//         };
//     }, [viewportId, engineId, activeTool, isEditingWL, isEditingThickness]);

//     const handleWLSubmit = (e?: React.FocusEvent) => {
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
//             onWLChange?.(ww, wc);
//         }
//     };

//     const handleThicknessSubmit = (e?: React.FocusEvent) => {
//         if (e?.relatedTarget && (e.relatedTarget as HTMLElement).closest('.thickness-edit-container')) {
//             return;
//         }
//         setIsEditingThickness(false);
//     };

//     const handleThicknessChange = (tStr: string) => {
//         setEditThickness(tStr);
//         const t = parseFloat(tStr);
//         if (!isNaN(t)) {
//             onSlabThicknessChange?.(t);
//         }
//     };

//     if (!study || !series) return null;

//     return (
//         <div className="absolute inset-0 pointer-events-none p-2 select-none overflow-hidden">
//             {/* Top Left: Patient Info */}
//             <div className="absolute top-2 left-2 text-[#56CCF2] text-sm z-10 font-sans">
//                 <div className="font-bold uppercase">{study.patientName}</div>
//                 <div className="text-xs opacity-90">{study.patientID}</div>
//                 <div className="text-xs opacity-90">
//                     {study.studyDate} {study.studyTime}
//                 </div>
//             </div>

//             {/* Top Right: Label / Series Info */}
//             <div className="absolute top-2 right-2 text-right text-[#56CCF2] text-sm z-10 font-sans">
//                 <div className={`font-bold uppercase ${labelColor}`}>{label}</div>
//                 <div className="text-xs opacity-90">{series.seriesDescription}</div>
//                 <div ref={pixelValueRef} className="text-yellow-400 font-bold mt-1 min-h-[1.25rem]"></div>
//             </div>

//             {/* Bottom Right: W/L & Thickness */}
//             <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 text-[#56CCF2] text-sm z-20 font-sans">
//                 <div
//                     className="font-medium font-mono cursor-pointer hover:text-white pointer-events-auto"
//                     onClick={(e) => {
//                         e.stopPropagation();
//                         // Extract current values from the text ref if possible
//                         if (wwlcTextRef.current) {
//                             const text = wwlcTextRef.current.textContent || "";
//                             const match = text.match(/W: (-?\d+) L: (-?\d+)/);
//                             if (match) {
//                                 setEditWw(match[1]);
//                                 setEditWc(match[2]);
//                             }
//                         }
//                         setIsEditingWL(true);
//                         setIsEditingThickness(false);
//                     }}
//                 >
//                     {isEditingWL ? (
//                         <div
//                             className="flex flex-col gap-1 items-end bg-black/80 p-2 rounded border border-white/20 wl-edit-container"
//                             onClick={e => e.stopPropagation()}
//                         >
//                             <div className="flex items-center gap-2">
//                                 <span className="text-[10px] opacity-70 uppercase">W</span>
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
//                                 <span className="text-[10px] opacity-70 uppercase">L</span>
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
//                         <span ref={wwlcTextRef}>W: - L: -</span>
//                     )}
//                 </div>

//                 <div
//                     className="font-medium font-mono cursor-pointer hover:text-white flex items-center gap-1 pointer-events-auto"
//                     onClick={(e) => {
//                         e.stopPropagation();
//                         setIsEditingThickness(true);
//                         setIsEditingWL(false);
//                     }}
//                 >
//                     {isEditingThickness ? (
//                         <div
//                             className="flex items-center gap-2 bg-black/80 p-1 rounded border border-white/20 thickness-edit-container"
//                             onClick={e => e.stopPropagation()}
//                         >
//                             <span className="text-[10px] opacity-70 uppercase">Thk</span>
//                             <Input
//                                 className="h-6 w-14 text-xs bg-black/50 border-white/20 text-white p-1 select-text"
//                                 value={editThickness}
//                                 autoFocus
//                                 onChange={e => handleThicknessChange(e.target.value)}
//                                 onBlur={handleThicknessSubmit}
//                                 onKeyDown={e => e.key === 'Enter' && handleThicknessSubmit()}
//                             />
//                         </div>
//                     ) : (
//                         <span>Thk: {slabThickness?.toFixed(1) || '0.0'} mm</span>
//                     )}
//                 </div>
//             </div>

//             {/* Bottom Left: Metadata */}
//             <div ref={sliceLocRef} className="absolute bottom-2 left-2 text-[#56CCF2] text-sm z-10 pointer-events-none">
//             </div>
//         </div>
//     );
// }
