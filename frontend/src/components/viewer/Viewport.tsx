// import { useDicomStore } from "@/stores/dicomStore";
// import { cn } from "@/lib/utils";
// import React, { useEffect, useRef, useMemo } from "react";
// import {
//   CornerstoneService,
//   RENDERING_ENGINE_ID,
// } from "@/services/CornerstoneService";
// import {
//   Enums,
//   eventTarget,
//   imageLoader,
//   utilities as csUtils,
// } from "@cornerstonejs/core";
// import {
//   Enums as csToolsEnums,
//   utilities as csToolsUtils,
// } from "@cornerstonejs/tools";
// import { IStackViewport } from "@cornerstonejs/core/types";
// import { useResizeObserver } from "@/hooks/useResizeObserver";
// import type { ViewportState } from "@/types/dicom";
// import { ViewportOverlay } from "./ViewportOverlay";
// import MetadataService from "@/services/MetadataService";

// import { ViewportActionCorners } from "./ViewportActionCorners";
// import { prefetchService } from "@/services/ImagePrefetchService";
// import { cacheManager } from "@/services/CacheManager";
// import { WindowLevelMenu } from "./WindowLevelMenu";
// import { ImageScrollbar } from "./ImageScrollbar";
// import { RotateCcw } from "lucide-react";
// import { displaySetService } from "@/services/DisplaySetService";
// import { cornerstoneViewportService } from "@/services/CornerstoneViewportService";
// import { toolGroupService } from "@/services/ToolGroupService";
// import type { ToolType } from "@/types/dicom";

// interface ViewportProps {
//   viewport: ViewportState;
// }

// // Stable reference hook
// const useStableReference = <T,>(
//   value: T,
//   compareFn: (a: T, b: T) => boolean,
// ): T => {
//   const ref = useRef<T>(value);

//   if (!compareFn(ref.current, value)) {
//     ref.current = value;
//   }

//   return ref.current;
// };

// // --- Helper Types for Scroll Data ---
// interface ScrollData {
//   value: number;
//   max: number;
// }

// export const Viewport = React.memo(
//   ({ viewport }: ViewportProps) => {
//     const {
//       studies,
//       activeViewportId,
//       setActiveViewport,
//       activeTool,
//       updateViewport,
//       addMeasurement,
//       maximizedViewportId,
//       setMaximizedViewport,
//       selectedViewportIds,
//       toggleViewportSelection,
//       isMultiSelectMode,
//       loadSeriesToViewport,
//     } = useDicomStore();
//     const elementRef = useRef<HTMLDivElement>(null);
//     const isInitializedRef = useRef(false);
//     const stackLoadedRef = useRef(false);
//     const isDestroyingRef = useRef(false); // CRITICAL: Prevents render during cleanup

//     // Track local interaction to prevent "Fighting" between Store and Viewport
//     const isInteractingRef = useRef(false);
//     const interactionTimerRef = useRef<number | null>(null);

//     const isActive = activeViewportId === viewport.id;
//     const isSelected = selectedViewportIds.includes(viewport.id);
//     const isMaximized = maximizedViewportId === viewport.id;

//     // Helper for multi-select and regular click
//     const handleClick = (e: React.MouseEvent) => {
//       isInteractingRef.current = true;
//       if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
//       interactionTimerRef.current = window.setTimeout(() => {
//         isInteractingRef.current = false;
//       }, 1000);

//       if (isMultiSelectMode) {
//         e.stopPropagation();
//         toggleViewportSelection(viewport.id);
//         setActiveViewport(viewport.id); // Also make it active for side panel updates
//       } else {
//         setActiveViewport(viewport.id);
//       }
//     };

//     // Helper for double-click maximization
//     const handleDoubleClick = (e: React.MouseEvent) => {
//       isInteractingRef.current = true;
//       if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
//       interactionTimerRef.current = window.setTimeout(() => {
//         isInteractingRef.current = false;
//       }, 1000);

//       e.stopPropagation();
//       if (isMaximized) {
//         setMaximizedViewport(null);
//       } else {
//         setMaximizedViewport(viewport.id);
//       }
//     };

//     // --- Drag and Drop Handlers ---
//     const [isDragOver, setIsDragOver] = React.useState(false);

//     const handleDragOver = (e: React.DragEvent) => {
//       e.preventDefault();
//       e.stopPropagation();
//       setIsDragOver(true);
//       e.dataTransfer.dropEffect = 'move';
//     };

//     const handleDragLeave = (e: React.DragEvent) => {
//       e.preventDefault();
//       e.stopPropagation();
//       setIsDragOver(false);
//     };

//     const handleDrop = (e: React.DragEvent) => {
//       e.preventDefault();
//       e.stopPropagation();
//       setIsDragOver(false);

//       const dsUID = e.dataTransfer.getData('displaySetInstanceUID');
//       if (dsUID) {
//         console.log(`[Viewport] Dropped DisplaySet: ${dsUID} onto viewport ${viewport.id}`);
//         const ds = displaySetService.getDisplaySet(dsUID);
//         if (ds) {
//           loadSeriesToViewport(viewport.id, ds.studyInstanceUID, dsUID);
//         }
//       }
//     };

//     // Stable series reference via DisplaySetService
//     const displaySet = useMemo(() => {
//       return viewport.displaySetInstanceUID
//         ? displaySetService.getDisplaySet(viewport.displaySetInstanceUID)
//         : undefined;
//     }, [viewport.displaySetInstanceUID]);

//     // For legacy compatibility within the component
//     const series = displaySet;

//     // Memoize overlay
//     const overlay = useMemo(() => {
//       if (!series) return null;
//       return (
//         <ViewportOverlay
//           key={`overlay-${viewport.id}`}
//           viewportId={viewport.id}
//           studyUID={viewport.studyUID!}
//           seriesUID={viewport.seriesUID!}
//           displaySetInstanceUID={viewport.displaySetInstanceUID!}
//         />
//       );
//     }, [
//       viewport.id,
//       viewport.studyUID,
//       viewport.seriesUID,
//       viewport.displaySetInstanceUID,
//       series?.seriesInstanceUID,
//     ]);

//     // CRITICAL: Initialize Viewport with proper cleanup
//     useEffect(() => {
//       if (
//         !elementRef.current ||
//         isInitializedRef.current ||
//         !CornerstoneService.isInitialized
//       ) return;

//       const element = elementRef.current;
//       isInitializedRef.current = true;
//       isDestroyingRef.current = false;

//       const type = viewport.viewportType || Enums.ViewportType.STACK;

//       // 1. Initialize Viewport via Service
//       cornerstoneViewportService.enableViewport(viewport.id, element, type);

//       // 2. Setup Listeners
//       let voiTimer: number | null = null;
//       const handleVOIChange = (evt: any) => {
//         if (isDestroyingRef.current) return;
//         if (voiTimer) window.clearTimeout(voiTimer);
//         voiTimer = window.setTimeout(() => {
//           if (isDestroyingRef.current) return;
//           try {
//             const { range } = evt.detail;
//             updateViewport(viewport.id, {
//               windowWidth: Math.round(range.upper - range.lower),
//               windowCenter: Math.round((range.upper + range.lower) / 2),
//             });
//           } catch (err) { }
//         }, 50);
//       };

//       let cameraTimer: number | null = null;
//       const handleCameraChange = () => {
//         if (isDestroyingRef.current) return;
//         if (cameraTimer) window.clearTimeout(cameraTimer);
//         cameraTimer = window.setTimeout(() => {
//           if (isDestroyingRef.current) return;
//           try {
//             const csViewport = cornerstoneViewportService.getViewport(viewport.id) as IStackViewport;
//             if (!csViewport) return;
//             const camera = csViewport.getCamera();
//             if (!camera.parallelScale) return;
//             updateViewport(viewport.id, {
//               zoom: Math.round((500 / camera.parallelScale) * 100) / 100,
//               rotation: Math.round(camera.rotation || 0),
//             });
//           } catch (err) { }
//         }, 100);
//       };

//       let imageIndexTimer: number | null = null;
//       const handleImageChange = (evt: any) => {
//         if (isDestroyingRef.current) return;
//         try {
//           const { imageIndex, newImageIdIndex, imageIdIndex } = evt.detail;
//           const val = newImageIdIndex ?? imageIndex ?? imageIdIndex;
//           if (val === undefined || val === null || isNaN(val)) return;
//           const actualIndex = Number(val);

//           isInteractingRef.current = true;
//           if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
//           interactionTimerRef.current = window.setTimeout(() => {
//             isInteractingRef.current = false;
//           }, 1000);

//           prefetchService.onViewportChange(actualIndex);

//           if (imageIndexTimer) window.clearTimeout(imageIndexTimer);
//           imageIndexTimer = window.setTimeout(() => {
//             if (isDestroyingRef.current) return;
//             updateViewport(viewport.id, { currentImageIndex: actualIndex });
//           }, 150);
//         } catch (err) { }
//       };

//       element.addEventListener(Enums.Events.STACK_NEW_IMAGE, handleImageChange);
//       element.addEventListener(Enums.Events.VOI_MODIFIED, handleVOIChange);
//       element.addEventListener(Enums.Events.CAMERA_MODIFIED, handleCameraChange);

//       return () => {
//         isDestroyingRef.current = true;
//         isInitializedRef.current = false;

//         if (voiTimer) window.clearTimeout(voiTimer);
//         if (cameraTimer) window.clearTimeout(cameraTimer);
//         if (imageIndexTimer) window.clearTimeout(imageIndexTimer);

//         element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, handleImageChange);
//         element.removeEventListener(Enums.Events.VOI_MODIFIED, handleVOIChange);
//         element.removeEventListener(Enums.Events.CAMERA_MODIFIED, handleCameraChange);

//         cornerstoneViewportService.disableViewport(viewport.id);
//       };
//     }, [viewport.id, CornerstoneService.isInitialized]);

//     // Load Image Stack
//     useEffect(() => {
//       if (
//         !CornerstoneService.isInitialized ||
//         !series ||
//         isDestroyingRef.current
//       ) return;

//       const loadData = async () => {
//         try {
//           // Check if already loaded to avoid flicker
//           const csViewport = cornerstoneViewportService.getViewport(viewport.id) as IStackViewport;
//           const currentImageIds = csViewport?.getImageIds?.() || [];
//           const newImageIds = series.instances.map(inst => inst.imageId);

//           if (
//             currentImageIds.length > 0 &&
//             currentImageIds[0] === newImageIds[0] &&
//             currentImageIds.length === newImageIds.length &&
//             stackLoadedRef.current
//           ) {
//             return;
//           }

//           // Use Universal Service Method
//           await cornerstoneViewportService.setViewportData(viewport.id, {
//             studyInstanceUID: viewport.studyUID!,
//             displaySetInstanceUID: viewport.displaySetInstanceUID!,
//             imageIds: newImageIds,
//             viewportType: viewport.viewportType || Enums.ViewportType.STACK
//           });

//           stackLoadedRef.current = true;

//           // Initialize Prefetch Service with Full Stack
//           prefetchService.initialize(newImageIds, viewport.displaySetInstanceUID!);

//           // Start Cache Monitor
//           cacheManager.startMonitoring();

//           // Trigger initial prefetch
//           prefetchService.onViewportChange(viewport.currentImageIndex || 0);

//           // [Fix] Ensure a full resize and render happens after stack load
//           // This prevents black screen if the viewport was initialized while layout was changing
//           const renderingEngine = CornerstoneService.getRenderingEngine();
//           if (renderingEngine) {
//             renderingEngine.resize(true, true);
//             const vp = renderingEngine.getViewport(viewport.id);
//             if (vp) vp.render();
//           }
//         } catch (e) {
//           console.error("Stack load error:", e);
//         }
//       };

//       loadData();
//     }, [
//       series?.seriesInstanceUID,
//       series?.instances.length,
//       viewport.id,
//       CornerstoneService.isInitialized,
//     ]);

//     // Pre-populate Metadata Cache
//     useEffect(() => {
//       if (!series || !series.instances.length) return;

//       series.instances.forEach((instance: any) => {
//         // Register either the raw DICOM dataset OR the naturalized instance object
//         // MetadataService.getVal handles both formats.
//         MetadataService.addMetadata(instance.imageId, instance.rawDataset || instance);
//       });
//     }, [series?.seriesInstanceUID, series?.instances.length]);

//     // Handle Active Tool Changes
//     useEffect(() => {
//       if (!CornerstoneService.isInitialized || isDestroyingRef.current) return;

//       const toolMap: Record<string, ToolType> = {
//         WindowLevel: 'WindowLevel',
//         Pan: 'Pan',
//         Zoom: 'Zoom',
//         StackScroll: 'StackScroll',
//         Length: 'Length',
//         Angle: 'Angle',
//         RectangleROI: 'RectangleROI',
//         EllipticalROI: 'EllipticalROI',
//         Bidirectional: 'Bidirectional',
//         ArrowAnnotate: 'ArrowAnnotate',
//         Probe: 'Probe',
//         TrackballRotate: 'TrackballRotate',
//         Magnify: 'Magnify',
//         PlanarRotate: 'PlanarRotate',
//         Crosshairs: 'Crosshairs',
//       };

//       try {
//         const csToolName = toolMap[activeTool] || activeTool;
//         const toolGroup = toolGroupService.getToolGroup();
//         if (!toolGroup) return;

//         // Reset all to passive first
//         Object.values(toolMap).forEach((t) => toolGroup.setToolPassive(t));

//         // Set mandatory active bindings
//         toolGroup.setToolActive('Pan', { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }] });
//         toolGroup.setToolActive('Zoom', { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }] });
//         toolGroup.setToolActive('StackScroll', { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }] });

//         // Set primary tool
//         if (toolGroup.getToolOptions(csToolName)) {
//           toolGroup.setToolActive(csToolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }] });
//         }
//       } catch (err) { }
//     }, [activeTool, CornerstoneService.isInitialized]);

//     // Sync Viewport Properties (W/L)
//     useEffect(() => {
//       if (!stackLoadedRef.current || isDestroyingRef.current) return;

//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         if (!renderingEngine) return;

//         const csViewport = renderingEngine.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (!csViewport || !csViewport.element) return; // Ensure element is still attached

//         const props = csViewport.getProperties();
//         const currentWw = props.voiRange
//           ? props.voiRange.upper - props.voiRange.lower
//           : 0;
//         const currentWc = props.voiRange
//           ? (props.voiRange.upper + props.voiRange.lower) / 2
//           : 0;

//         const ww = Math.round(viewport.windowWidth || currentWw || 400);
//         const wc = Math.round(viewport.windowCenter || currentWc || 40);

//         // [Fix] Robustness: Never apply NaN or zero width
//         if (isNaN(ww) || isNaN(wc) || ww <= 0) return;

//         if (Math.abs(currentWw - ww) > 1 || Math.abs(currentWc - wc) > 1) {
//           csViewport.setProperties({
//             voiRange: {
//               lower: wc - ww / 2,
//               upper: wc + ww / 2,
//             },
//           });
//           // Cornerstone automatically renders when properties change
//         }
//       } catch (err) {
//         // Silent fail
//       }
//     }, [viewport.windowCenter, viewport.windowWidth, viewport.id]);



//     // Sync Image Index (only for external updates like sliders)
//     useEffect(() => {
//       // 1. Safety checks
//       if (!stackLoadedRef.current || isDestroyingRef.current) return;
//       // 2. If Cine is playing, Viewport is the Source of Truth. Ignore Store.
//       if (viewport.isPlaying) return;
//       // 3. If User is interacting (scrolling), Viewport is Source of Truth. Ignore Store lag.
//       if (isInteractingRef.current) return;

//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         if (!renderingEngine) return;

//         const csViewport = renderingEngine.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (!csViewport) return;

//         const currentIndex = csViewport.getCurrentImageIdIndex();
//         const numSlices = csViewport.getNumberOfSlices();

//         // 4. Only sync if the discrepancy is real and meaningful 
//         // (and we are not protecting local interaction)
//         if (
//           currentIndex !== viewport.currentImageIndex &&
//           viewport.currentImageIndex >= 0 &&
//           viewport.currentImageIndex < numSlices
//         ) {
//           csViewport.setImageIdIndex(viewport.currentImageIndex);
//         }
//       } catch (err) {
//         // Silent fail
//       }
//     }, [viewport.currentImageIndex, viewport.id, viewport.isPlaying]);

//     // Sync Transforms
//     useEffect(() => {
//       if (!stackLoadedRef.current || isDestroyingRef.current) return;

//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         if (!renderingEngine) return;

//         const csViewport = renderingEngine.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (!csViewport) return;

//         const camera = csViewport.getCamera();
//         const props = csViewport.getProperties() as any;

//         const needsRotationUpdate =
//           Math.round(camera.rotation || 0) !== viewport.rotation;
//         const needsFlipUpdate =
//           !!props.flipHorizontal !== viewport.flipH ||
//           !!props.flipVertical !== viewport.flipV;
//         const needsInvertUpdate = !!props.invert !== viewport.invert;

//         if (needsRotationUpdate || needsFlipUpdate || needsInvertUpdate) {
//           if (needsInvertUpdate)
//             (csViewport as any).setProperties({ invert: viewport.invert });
//           if (needsFlipUpdate)
//             (csViewport as any).flip?.({
//               flipHorizontal: viewport.flipH,
//               flipVertical: viewport.flipV,
//             });
//           if (needsRotationUpdate)
//             csViewport.setCamera({ rotation: viewport.rotation });
//           // Cornerstone automatically renders when properties/camera change
//         }
//       } catch (err) {
//         // Silent fail
//       }
//     }, [
//       viewport.flipH,
//       viewport.flipV,
//       viewport.invert,
//       viewport.rotation,
//       viewport.id,
//     ]);

//     // Handle Resize
//     const prevDimensions = useRef({ width: 0, height: 0 });

//     const onResize = React.useCallback(
//       (entries: ResizeObserverEntry[]) => {
//         if (
//           !stackLoadedRef.current ||
//           isDestroyingRef.current ||
//           !elementRef.current ||
//           !entries.length
//         )
//           return;

//         const entry = entries[0];
//         const { width, height } = entry.contentRect;

//         // Check if dimensions actually changed
//         if (
//           width === prevDimensions.current.width &&
//           height === prevDimensions.current.height
//         ) {
//           return;
//         }

//         prevDimensions.current = { width, height };

//         try {
//           const renderingEngine = CornerstoneService.getRenderingEngine();
//           if (!renderingEngine) return;

//           // Only resize if the viewport exists
//           const csViewport = renderingEngine.getViewport(viewport.id);
//           if (csViewport) {
//             renderingEngine.resize(true, false);
//           }
//         } catch (err) {
//           // Silent fail
//         }
//       },
//       [viewport.id],
//     );

//     useResizeObserver(elementRef, onResize);

//     // --- Handlers for UI Components ---
//     const [scrollData, setScrollData] = React.useState<ScrollData>({
//       value: 0,
//       max: 1,
//     });
//     const viewportStateRef = useRef<ViewportState & { colormap?: string }>(
//       viewport,
//     );

//     // Update ref but preserve local state like colormap that isn't in global store yet
//     useEffect(() => {
//       viewportStateRef.current = {
//         ...viewport,
//         colormap: viewportStateRef.current.colormap,
//       };
//     }, [viewport]);

//     useEffect(() => {
//       if (!stackLoadedRef.current || isDestroyingRef.current) return;

//       const updateScroll = () => {
//         try {
//           const renderingEngine = CornerstoneService.getRenderingEngine();
//           if (!renderingEngine) return;
//           const csViewport = renderingEngine.getViewport(
//             viewport.id,
//           ) as IStackViewport;
//           if (!csViewport) return;

//           const current = csViewport.getCurrentImageIdIndex();
//           const max = csViewport.getNumberOfSlices();
//           setScrollData({ value: current, max });
//         } catch (e) {
//           /* silent */
//         }
//       };

//       const handleNewImage = () => {
//         updateScroll();

//         try {
//           const renderingEngine = CornerstoneService.getRenderingEngine();
//           const csViewport = renderingEngine?.getViewport(
//             viewport.id,
//           ) as IStackViewport;

//           if (csViewport) {
//             // W/L Persistence
//             if (viewportStateRef.current.windowWidth) {
//               const { windowWidth, windowCenter } = viewportStateRef.current;
//               csViewport.setProperties({
//                 voiRange: {
//                   lower: windowCenter - windowWidth / 2,
//                   upper: windowCenter + windowWidth / 2,
//                 },
//               });
//             }

//             // Color LUT Persistence
//             if (
//               viewportStateRef.current.colormap &&
//               viewportStateRef.current.colormap !== "Grayscale"
//             ) {
//               csViewport.setProperties({
//                 colormap: { name: viewportStateRef.current.colormap },
//               });
//             }
//           }
//         } catch (e) { }
//       };

//       // Initial update
//       updateScroll();

//       // Listen to scroll events
//       const element = elementRef.current;
//       if (element) {
//         element.addEventListener(Enums.Events.STACK_NEW_IMAGE, handleNewImage);
//         return () =>
//           element.removeEventListener(
//             Enums.Events.STACK_NEW_IMAGE,
//             handleNewImage,
//           );
//       }
//     }, [stackLoadedRef.current, viewport.id]);

//     const setViewportWLPreset = (preset: any) => {
//       viewportStateRef.current = {
//         ...viewportStateRef.current,
//         windowWidth: preset.window,
//         windowCenter: preset.level,
//         colormap: viewportStateRef.current.colormap,
//       };

//       // 1. Immediate visual update
//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         const csViewport = renderingEngine?.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (csViewport) {
//           csViewport.setProperties({
//             voiRange: {
//               lower: preset.level - preset.window / 2,
//               upper: preset.level + preset.window / 2,
//             },
//           });
//           csViewport.render();
//         }
//       } catch (e) { }

//       // 2. Persist to store (triggers React update eventually)
//       updateViewport(viewport.id, {
//         windowWidth: preset.window,
//         windowCenter: preset.level,
//       });
//     };

//     const setViewportColorLUT = (colormapName: string) => {
//       // 1. Update Ref for persistence (Immediate local)
//       viewportStateRef.current = {
//         ...viewportStateRef.current,
//         colormap: colormapName,
//       };

//       // 2. Immediate visual update
//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         const csViewport = renderingEngine?.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (csViewport) {
//           if (colormapName === "Grayscale") {
//             csViewport.setProperties({ colormap: { name: "grayscale" } });
//           } else {
//             csViewport.setProperties({ colormap: { name: colormapName } });
//           }
//           csViewport.render();
//         }
//       } catch (e) {
//         console.error("Failed to set Colormap", e);
//       }

//       // 3. Persist to Global Store
//       updateViewport(viewport.id, { colormap: colormapName });
//     };

//     const resetViewport = () => {
//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         const csViewport = renderingEngine?.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (csViewport) {
//           csViewport.resetCamera();
//           csViewport.resetProperties(); // Resets VOI to metadata defaults
//           csViewport.render();

//           // Sync back to store (optional, but good for UI consistency)
//           // We'd need to read the metadata defaults here to update the store perfectly,
//           // or just clear the overrides in the store?
//           // For now, let's just let the visual reset happen.
//           // To persist the *reset*, we should probably clear the overrides in the store.
//           updateViewport(viewport.id, {
//             windowWidth: undefined,
//             windowCenter: undefined,
//             zoom: 1,
//             rotation: 0,
//             invert: false,
//             flipH: false,
//             flipV: false,
//           });
//         }
//       } catch (e) {
//         console.error("Failed to reset viewport", e);
//       }
//     };

//     const onScrollChange = (value: number) => {
//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         const csViewport = renderingEngine?.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (csViewport) {
//           csViewport.setImageIdIndex(Math.round(value));
//         }
//       } catch (e) {
//         console.error("Failed to scroll", e);
//       }
//     };

//     // Sync Colormap
//     useEffect(() => {
//       if (!stackLoadedRef.current || isDestroyingRef.current) return;

//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         if (!renderingEngine) return;

//         const csViewport = renderingEngine.getViewport(
//           viewport.id,
//         ) as IStackViewport;
//         if (!csViewport) return;

//         if (viewport.colormap) {
//           csViewport.setProperties({ colormap: { name: viewport.colormap } });
//           csViewport.render();
//         }
//       } catch (err) {
//         // Silent fail
//       }
//     }, [viewport.colormap, viewport.id]);

//     // Sync Cine Playback from Store
//     useEffect(() => {
//       if (
//         !stackLoadedRef.current ||
//         isDestroyingRef.current ||
//         !elementRef.current
//       )
//         return;

//       const element = elementRef.current;

//       try {
//         if (viewport.isPlaying) {
//           csToolsUtils.cine.playClip(element, {
//             framesPerSecond: viewport.playbackSpeed || 30,
//           });
//         } else {
//           csToolsUtils.cine.stopClip(element);
//         }
//       } catch (err) {
//         console.warn("Cine sync error:", err);
//       }

//       return () => {
//         try {
//           csToolsUtils.cine.stopClip(element);
//         } catch (e) { }
//       };
//     }, [
//       viewport.isPlaying,
//       viewport.playbackSpeed,
//       viewport.id,
//       stackLoadedRef.current,
//     ]);

//     return (
//       <div
//         className={cn(
//           "viewport-container relative w-full h-full select-none overflow-hidden bg-black group",
//           "border-2 transition-all duration-200",
//           isDragOver ? "border-primary border-[3px] bg-primary/5" :
//             isSelected
//               ? "border-yellow-400 border-[3px]"
//               : isActive
//                 ? "border-primary"
//                 : "border-transparent",
//         )}
//         onClick={handleClick}
//         onDoubleClick={handleDoubleClick}
//         onContextMenu={(e) => e.preventDefault()}
//         onDragOver={handleDragOver}
//         onDragLeave={handleDragLeave}
//         onDrop={handleDrop}
//       >
//         <div ref={elementRef} className="w-full h-full" />
//         {overlay}

//         {/* UI Overlays */}
//         {series && (
//           <>
//             {/* Removed OrientationMenu as per request */}

//             <ViewportActionCorners corner="bottom-left">
//               <WindowLevelMenu
//                 onPresetChange={(p) => setViewportWLPreset(p)}
//                 onColorLUTChange={(c) => setViewportColorLUT(c)}
//               />
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   resetViewport();
//                 }}
//                 className="h-7 w-7 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 transition-colors text-white/70 hover:text-white"
//                 title="Reset Viewport"
//               >
//                 <RotateCcw className="w-4 h-4" />
//               </button>
//             </ViewportActionCorners>
//             <ImageScrollbar
//               value={scrollData.value}
//               max={scrollData.max}
//               onChange={(v) => onScrollChange(v)}
//               className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
//             />
//           </>
//         )}

//         {!series && (
//           <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
//             Drop a series here
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prevProps, nextProps) => {
//     return (
//       prevProps.viewport.id === nextProps.viewport.id &&
//       prevProps.viewport.studyUID === nextProps.viewport.studyUID &&
//       prevProps.viewport.seriesUID === nextProps.viewport.seriesUID &&
//       prevProps.viewport.windowWidth === nextProps.viewport.windowWidth &&
//       prevProps.viewport.windowCenter === nextProps.viewport.windowCenter &&
//       prevProps.viewport.invert === nextProps.viewport.invert &&
//       prevProps.viewport.flipH === nextProps.viewport.flipH &&
//       prevProps.viewport.flipV === nextProps.viewport.flipV &&
//       prevProps.viewport.rotation === nextProps.viewport.rotation &&
//       prevProps.viewport.zoom === nextProps.viewport.zoom &&
//       prevProps.viewport.currentImageIndex ===
//       nextProps.viewport.currentImageIndex &&
//       prevProps.viewport.isPlaying === nextProps.viewport.isPlaying &&
//       prevProps.viewport.playbackSpeed === nextProps.viewport.playbackSpeed
//     );
//   },
// );

// Viewport.displayName = "Viewport";
