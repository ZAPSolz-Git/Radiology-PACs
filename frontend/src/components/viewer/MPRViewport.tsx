// import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
// import {
//   RenderingEngine,
//   Enums,
//   type Types,
//   getRenderingEngine,
//   utilities as csUtils,
//   CONSTANTS,
//   cache
// } from '@cornerstonejs/core';
// import type { IVolumeViewport } from '@cornerstonejs/core/types';
// import * as csTools from '@cornerstonejs/tools';
// import {
//   synchronizers,
//   SynchronizerManager,
//   utilities as csToolsUtils,
// } from '@cornerstonejs/tools';
// const { createVOISynchronizer } = synchronizers;
// import { cn } from '@/lib/utils';
// import { useDicomStore } from '@/stores/dicomStore';
// import { MPRViewportOverlay } from './MPRViewportOverlay';
// import { ImageScrollbar } from './ImageScrollbar';
// import { ViewportActionCorners } from './ViewportActionCorners';
// import { OrientationMenu } from './OrientationMenu';
// import { WindowLevelMenu } from './WindowLevelMenu';
// import { Loader2 } from 'lucide-react';
// import { cancelVolumeRequests, estimateLoadTime } from '@/services/ImageLoadStrategy';
// import { memoryMonitor } from '@/utils/MemoryMonitor';
// import { displaySetService } from '@/services/DisplaySetService';
// import { streamingVolumeLoader } from '@/services/StreamingVolumeLoader';
// import { cacheManager } from '@/services/CacheManager';
// import { useAdaptiveResolution } from '@/hooks/useAdaptiveResolution';

// interface MPRViewportProps {
//   seriesInstanceUID: string;
//   uniqueKey?: string; // Add this to ensure unique IDs in comparison mode
//   className?: string;
//   onClose?: () => void;
//   // State lifted up
//   layout: '1x3' | '2x2';
//   blendMode: string;
//   slabThickness: number;
//   voiPreset: { window: number, level: number } | null;
//   activeOrientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | null;
//   activeTool: string;
//   activeViewportId: string | null;
//   onViewportClick: (viewportId: string) => void;
// }

// export function MPRViewport({ seriesInstanceUID, uniqueKey = 'primary', className, onClose, layout, blendMode, slabThickness, voiPreset, activeOrientation, activeTool, activeViewportId, onViewportClick }: MPRViewportProps) {
//   const {
//     studies,
//     viewports,
//     maximizedViewportId: globalMaximizedId,
//     setMaximizedViewport: setGlobalMaximized,
//     isMultiSelectMode,
//     selectedViewportIds,
//     toggleViewportSelection
//   } = useDicomStore();

//   // Unique IDs for this series instance + unique key to avoid collision in comparison
//   const instanceId = `${seriesInstanceUID}_${uniqueKey}`;
//   const RENDERING_ENGINE_ID = `mpr_engine_${instanceId}`;
//   const TOOL_GROUP_ID = `mpr_tools_${instanceId}`;
//   const VOI_SYNC_ID = `mpr_voi_sync_${instanceId}`;

//   const viewportIds = useMemo(() => ({
//     AXIAL: `MPR_AXIAL_${instanceId}`,
//     SAGITTAL: `MPR_SAGITTAL_${instanceId}`,
//     CORONAL: `MPR_CORONAL_${instanceId}`,
//     VOLUME_3D: `MPR_3D_${instanceId}`,
//   }), [instanceId]);

//   const elementRefAxial = useRef<HTMLDivElement>(null);
//   const elementRefSagittal = useRef<HTMLDivElement>(null);
//   const elementRefCoronal = useRef<HTMLDivElement>(null);
//   const elementRef3D = useRef<HTMLDivElement>(null);
//   const renderingEngineRef = useRef<RenderingEngine | null>(null);
//   const synchronizersRef = useRef<any[]>([]);
//   const isMountedRef = useRef(true); // Track mount status for async operations
//   const [isVolumeLoaded, setIsVolumeLoaded] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [loadingProgress, setLoadingProgress] = useState<number>(0);
//   const [estimatedTime, setEstimatedTime] = useState<number>(0);

//   // Track last loaded series for cache invalidation
//   const lastLoadedSeriesRef = useRef<string | null>(null);
//   const volumeIdRef = useRef<string | null>(null);

//   // Per-viewport slab thickness overrides
//   const [viewportSlabThickness, setViewportSlabThickness] = useState<Record<string, number>>({});

//   // Use a ref to store the actual rendering engine ID used (with timestamp)
//   const actualEngineIdRef = useRef<string>(RENDERING_ENGINE_ID);

//   // Scrollbar State
//   const [scrollData, setScrollData] = useState<Record<string, { value: number, max: number }>>({});

//   // Debounce ref for scroll data updates
//   const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const pendingScrollUpdatesRef = useRef<Record<string, { value: number; max: number }>>({});

//   // Helper for maximization
//   const handleViewportDoubleClick = useCallback((viewportId: string) => {
//     if (globalMaximizedId === viewportId) {
//       setGlobalMaximized(null);
//     } else {
//       setGlobalMaximized(viewportId);
//     }
//   }, [globalMaximizedId, setGlobalMaximized]);

//   const handleViewportClick = useCallback((viewportId: string) => {
//     if (isMultiSelectMode) {
//       toggleViewportSelection(viewportId);
//       onViewportClick(viewportId); // Also make it active
//     } else {
//       onViewportClick(viewportId);
//     }
//   }, [isMultiSelectMode, toggleViewportSelection, onViewportClick]);

//   // Helper to update individual viewport slab thickness
//   const setIndividualSlabThickness = useCallback((viewportId: string, thickness: number) => {
//     setViewportSlabThickness(prev => ({ ...prev, [viewportId]: thickness }));

//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     const viewport = engine?.getViewport(viewportId) as IVolumeViewport;
//     if (viewport) {
//       viewport.setSlabThickness(thickness);
//       viewport.render();
//     }
//   }, []);

//   // Helper to update scroll data — debounced to prevent 500+ state updates during loading
//   const updateScrollData = useCallback((viewportId: string) => {
//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     const viewport = engine?.getViewport(viewportId) as IVolumeViewport;

//     if (!viewport) return;

//     try {
//       const { numberOfSlices, imageIndex } = csUtils.getImageSliceDataForVolumeViewport(viewport);

//       // Batch scroll updates with 100ms debounce
//       pendingScrollUpdatesRef.current[viewportId] = {
//         value: imageIndex,
//         max: numberOfSlices - 1
//       };

//       if (scrollDebounceRef.current) {
//         clearTimeout(scrollDebounceRef.current);
//       }
//       scrollDebounceRef.current = setTimeout(() => {
//         setScrollData(prev => ({
//           ...prev,
//           ...pendingScrollUpdatesRef.current
//         }));
//         pendingScrollUpdatesRef.current = {};
//       }, 100);
//     } catch (e) {
//       // Ignore errors during transition or if viewport not ready
//     }
//   }, []);

//   const onScrollChange = useCallback((viewportId: string, value: number) => {
//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     const viewport = engine?.getViewport(viewportId) as IVolumeViewport;
//     if (!viewport) return;

//     csUtils.jumpToSlice(viewport.element, { imageIndex: value });
//   }, []);

//   const setViewportOrientation = useCallback((viewportId: string, orientation: string) => {
//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     const viewport = engine?.getViewport(viewportId) as IVolumeViewport;
//     if (!viewport) return;

//     const axis = Enums.OrientationAxis[orientation as keyof typeof Enums.OrientationAxis];
//     if (axis) {
//       viewport.setOrientation(axis);
//       viewport.resetCamera();
//       viewport.render();
//     }
//   }, []);

//   const setViewportWLPreset = useCallback((viewportId: string, preset: { window: number, level: number }) => {
//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     const viewport = engine?.getViewport(viewportId) as IVolumeViewport;
//     if (!viewport) return;

//     const { lower, upper } = csUtils.windowLevel.toLowHighRange(preset.window, preset.level);
//     const volumeId = viewport.getVolumeId();

//     viewport.setProperties({
//       voiRange: { upper, lower }
//     }, volumeId);
//     viewport.render();
//   }, []);

//   const setViewportColorLUT = useCallback((viewportId: string, lutName: string) => {
//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     const viewport = engine?.getViewport(viewportId) as IVolumeViewport;
//     if (!viewport) return;

//     const volumeId = viewport.getVolumeId();

//     viewport.setProperties({
//       colormap: {
//         name: lutName
//       }
//     }, volumeId);
//     viewport.render();
//   }, []);


//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   // Apply Blend Mode and Slab Thickness changes
//   useEffect(() => {
//     if (!renderingEngineRef.current || !isVolumeLoaded) return;

//     const engine = renderingEngineRef.current;

//     // Helper to apply settings to all viewports
//     const updateViewports = () => {
//       const viewports = [
//         engine.getViewport(viewportIds.AXIAL),
//         engine.getViewport(viewportIds.SAGITTAL),
//         engine.getViewport(viewportIds.CORONAL),
//       ] as IVolumeViewport[];

//       viewports.forEach(vp => {
//         if (!vp) return;

//         // Set Blend Mode
//         // @ts-ignore - accessing Enums dynamically
//         const mode = Enums.BlendModes[blendMode];
//         if (mode !== undefined) {
//           vp.setBlendMode(mode);
//         }

//         // Set Slab Thickness
//         vp.setSlabThickness(slabThickness);
//       });

//       try { engine.render(); } catch (e) { }
//     };

//     updateViewports();
//   }, [blendMode, slabThickness, isVolumeLoaded]);

//   // Sync Cine Playback and W/L from Store for MPR viewports
//   useEffect(() => {
//     if (!isVolumeLoaded) return;
//     const engine = getRenderingEngine(actualEngineIdRef.current);
//     if (!engine) return;

//     const ids = [viewportIds.AXIAL, viewportIds.SAGITTAL, viewportIds.CORONAL, viewportIds.VOLUME_3D];

//     ids.forEach(id => {
//       const vp = engine.getViewport(id) as IVolumeViewport;
//       if (!vp || !vp.element) return;

//       const vpState = viewports.find(v => v.id === id);
//       if (!vpState) return;

//       // 1. Sync Cine
//       if (vpState.isPlaying) {
//         csToolsUtils.cine.playClip(vp.element, {
//           framesPerSecond: vpState.playbackSpeed || 24,
//         });
//       } else {
//         csToolsUtils.cine.stopClip(vp.element);
//       }

//       // 2. Sync W/L
//       if (vpState.windowWidth !== undefined && vpState.windowCenter !== undefined) {
//         const { windowWidth, windowCenter } = vpState;
//         const currentProps = vp.getProperties();
//         const currentWw = currentProps.voiRange ? currentProps.voiRange.upper - currentProps.voiRange.lower : 0;
//         const currentWc = currentProps.voiRange ? (currentProps.voiRange.upper + currentProps.voiRange.lower) / 2 : 0;

//         if (Math.abs(currentWw - windowWidth) > 1 || Math.abs(currentWc - windowCenter) > 1) {
//           const { lower, upper } = csUtils.windowLevel.toLowHighRange(windowWidth, windowCenter);
//           vp.setProperties({ voiRange: { lower, upper } }, vp.getVolumeId());
//           vp.render();
//         }
//       }
//     });

//     return () => {
//       ids.forEach(id => {
//         const vp = engine.getViewport(id);
//         if (vp?.element) csToolsUtils.cine.stopClip(vp.element);
//       });
//     };
//   }, [isVolumeLoaded, viewports, actualEngineIdRef.current]);

//   // Apply VOI Preset - Set on Axial viewport, let Synchronizer propagate
//   useEffect(() => {
//     if (!renderingEngineRef.current || !isVolumeLoaded || !voiPreset) return;

//     const engine = renderingEngineRef.current;

//     // Set properties on the reference viewport (Axial)
//     const viewport = engine.getViewport(viewportIds.AXIAL) as IVolumeViewport;
//     if (viewport) {
//       const { lower, upper } = csUtils.windowLevel.toLowHighRange(voiPreset.window, voiPreset.level);
//       const volumeId = viewport.getVolumeId();

//       viewport.setProperties({
//         voiRange: { upper, lower }
//       }, volumeId);
//       viewport.render();
//     }
//   }, [voiPreset, isVolumeLoaded]);

//   // Apply Orientation Change
//   useEffect(() => {
//     if (!renderingEngineRef.current || !isVolumeLoaded || !activeOrientation) return;
//     const engine = renderingEngineRef.current;

//     let viewportId = viewportIds.AXIAL;
//     if (activeOrientation === 'SAGITTAL') viewportId = viewportIds.SAGITTAL;
//     if (activeOrientation === 'CORONAL') viewportId = viewportIds.CORONAL;

//     const viewport = engine.getViewport(viewportId) as IVolumeViewport;
//     if (viewport) {
//       viewport.resetCamera();
//       viewport.render();
//     }

//   }, [activeOrientation, isVolumeLoaded]);

//   // Handle Active Tool Changes dynamically
//   useEffect(() => {
//     if (!renderingEngineRef.current || !isVolumeLoaded) return;

//     const toolGroup = csTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
//     if (!toolGroup) return;

//     // Reset primary bindings
//     const tools = [
//       csTools.CrosshairsTool.toolName,
//       csTools.LengthTool.toolName,
//       csTools.AngleTool.toolName,
//       csTools.BidirectionalTool.toolName,
//       csTools.WindowLevelTool.toolName,
//       csTools.PanTool.toolName,
//       csTools.ZoomTool.toolName,
//       csTools.StackScrollTool.toolName
//     ];

//     tools.forEach(toolName => {
//       toolGroup.setToolPassive(toolName);
//     });

//     const toolName = activeTool || csTools.CrosshairsTool.toolName;

//     // Explicit mappings if names differ (e.g. from UI)
//     let actualToolName = toolName;
//     if (toolName === 'Length') actualToolName = csTools.LengthTool.toolName;
//     if (toolName === 'Angle') actualToolName = csTools.AngleTool.toolName;
//     if (toolName === 'Bidirectional') actualToolName = csTools.BidirectionalTool.toolName;
//     if (toolName === 'Crosshairs') actualToolName = csTools.CrosshairsTool.toolName;

//     // Activate the selected tool
//     if (toolGroup.hasTool(actualToolName)) {
//       toolGroup.setToolActive(actualToolName, {
//         bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
//       });
//     }

//     // [Fix] Keep Crosshairs visible even when not the primary active tool
//     if (actualToolName !== csTools.CrosshairsTool.toolName) {
//       toolGroup.setToolPassive(csTools.CrosshairsTool.toolName);
//     } else {
//       // If Crosshairs is active, ReferenceLines usually go with it
//       toolGroup.setToolEnabled(csTools.ReferenceLinesTool.toolName);
//     }

//   }, [activeTool, isVolumeLoaded]);

//   // Listen for Scroll Events (to update sync/scrollbars)
//   useEffect(() => {
//     if (!isVolumeLoaded) return;
//     const elementAxial = elementRefAxial.current;
//     const elementSagittal = elementRefSagittal.current;
//     const elementCoronal = elementRefCoronal.current;

//     // Elements to listen to
//     const elements = [
//       { el: elementAxial, id: viewportIds.AXIAL },
//       { el: elementSagittal, id: viewportIds.SAGITTAL },
//       { el: elementCoronal, id: viewportIds.CORONAL }
//     ].filter(item => item.el) as { el: HTMLDivElement, id: string }[];

//     const handleNewImage = (evt: any) => {
//       const targetId = evt.detail.viewportId;
//       if (targetId) updateScrollData(targetId);
//     };

//     const handleVOISelection = (evt: any) => {
//       const { viewportId, range } = evt.detail;
//       if (!viewportId || !range) return;

//       const windowWidth = Math.round(range.upper - range.lower);
//       const windowCenter = Math.round((range.upper + range.lower) / 2);

//       // Sync back to store for persistence (update all viewports that might be interest, or at least active)
//       // Since this is MPR, we usually want these values to stick when we return to Stack
//       useDicomStore.getState().updateViewport('viewport-0', { windowWidth, windowCenter });
//     };

//     const handleCameraModified = (evt: any) => {
//       const { viewportId, camera } = evt.detail;
//       if (!viewportId || !camera || !camera.parallelScale) return;

//       const zoom = 500 / camera.parallelScale;
//       useDicomStore.getState().updateViewport('viewport-0', { zoom });
//     };

//     elements.forEach(({ el }) => {
//       el.addEventListener(Enums.Events.VOLUME_NEW_IMAGE, handleNewImage);
//       el.addEventListener(Enums.Events.VOI_MODIFIED, handleVOISelection);
//       el.addEventListener(Enums.Events.CAMERA_MODIFIED, handleCameraModified);

//       // Initial update
//       const viewportId = elements.find(e => e.el === el)?.id;
//       if (viewportId) updateScrollData(viewportId);
//     });

//     return () => {
//       elements.forEach(({ el }) => {
//         el.removeEventListener(Enums.Events.VOLUME_NEW_IMAGE, handleNewImage);
//         el.removeEventListener(Enums.Events.VOI_MODIFIED, (handleVOISelection as any));
//         el.removeEventListener(Enums.Events.CAMERA_MODIFIED, (handleCameraModified as any));
//       });
//     };
//   }, [isVolumeLoaded, layout]);

//   // Stable DisplaySet reference
//   const displaySet = useMemo(() => {
//     return displaySetService.getDisplaySet(seriesInstanceUID);
//   }, [seriesInstanceUID]);

//   const { studyUID } = useMemo(() => {
//     if (!displaySet) return { studyUID: null };
//     return { studyUID: displaySet.studyInstanceUID };
//   }, [displaySet]);

//   // RadiAnt-style adaptive resolution: lower quality during interaction, full on idle
//   const adaptiveViewportIds = useMemo(() => [
//     viewportIds.AXIAL, viewportIds.SAGITTAL, viewportIds.CORONAL
//   ], [viewportIds]);

//   const adaptiveElementRefs = useMemo(() => [
//     elementRefAxial, elementRefSagittal, elementRefCoronal
//   ], []);

//   useAdaptiveResolution(
//     renderingEngineRef,
//     adaptiveViewportIds,
//     adaptiveElementRefs,
//     {
//       interactionScale: 0.5,  // Half resolution during interaction
//       restoreDelay: 300,      // Restore after 300ms idle
//       enabled: isVolumeLoaded, // Only active when volume is ready
//     }
//   );

//   useEffect(() => {
//     if (!displaySet || !elementRefAxial.current || !elementRefSagittal.current || !elementRefCoronal.current) return;

//     // If layout is 2x2, check if 3D element ref is ready using a small delay or check
//     if (layout === '2x2' && !elementRef3D.current) return;

//     // 1. Setup Rendering Engine and Tool Group
//     const setup = async () => {
//       console.log(`[MPRViewport] Setting up engine for ${instanceId}`);

//       // 0. Stale Volume Cleanup (Robust)
//       // Check existing cached volumes and remove if they belong to a DIFFERENT series
//       // This ensures we don't leak memory when switching patients/studies
//       try {
//         const { cache } = await import('@cornerstonejs/core');
//         const cachedVolumes = cache.getVolumes();

//         cachedVolumes.forEach((vol: any) => {
//           // Identify if volume is from a different series (simple heuristic or metadata check)
//           // Ideally we check if it matches current seriesInstanceUID.
//           // Volume ID format: `cornerstoneStreamingImageVolume:${seriesInstanceUID}`
//           if (vol.volumeId.includes('cornerstoneStreamingImageVolume') &&
//             !vol.volumeId.includes(seriesInstanceUID)) {
//             console.log(`[MPRViewport] Cleaning up stale volume from different series: ${vol.volumeId}`);
//             cache.removeVolumeLoadObject(vol.volumeId);
//           }
//         });
//       } catch (e) {
//         console.warn('[MPRViewport] Failed to clean stale volumes:', e);
//       }

//       const engineId = RENDERING_ENGINE_ID;
//       actualEngineIdRef.current = engineId;

//       lastLoadedSeriesRef.current = seriesInstanceUID;



//       // Clean up previous engines if any
//       const existingEngine = getRenderingEngine(engineId);
//       if (existingEngine) {
//         existingEngine.destroy();
//       }

//       // Create new Rendering Engine
//       const renderingEngine = new RenderingEngine(engineId);
//       renderingEngineRef.current = renderingEngine;

//       // CRITICAL FIX: Clean up pre-existing synchronizers to avoid "already exists" error
//       // First destroy any existing synchronizers from previous instances
//       synchronizersRef.current.forEach(s => {
//         try {
//           s.destroy();
//         } catch (e) {
//           console.warn('[MPRViewport] Failed to destroy synchronizer:', e);
//         }
//       });
//       synchronizersRef.current = [];

//       // Check and destroy any stray synchronizers in global manager
//       try {
//         const straySync = SynchronizerManager.getSynchronizer(VOI_SYNC_ID);
//         if (straySync) {
//           console.log(`[MPRViewport] Destroying stray synchronizer: ${VOI_SYNC_ID}`);
//           straySync.destroy();
//         }
//       } catch (e) {
//         // Synchronizer doesn't exist, which is fine
//       }

//       // Define Viewport Inputs based on Layout
//       const viewportInput = [
//         {
//           viewportId: viewportIds.AXIAL,
//           type: Enums.ViewportType.ORTHOGRAPHIC,
//           element: elementRefAxial.current,
//           defaultOptions: {
//             orientation: Enums.OrientationAxis.AXIAL,
//             background: [0, 0, 0] as Types.Point3,
//           },
//         },
//         {
//           viewportId: viewportIds.SAGITTAL,
//           type: Enums.ViewportType.ORTHOGRAPHIC,
//           element: elementRefSagittal.current,
//           defaultOptions: {
//             orientation: Enums.OrientationAxis.SAGITTAL,
//             background: [0, 0, 0] as Types.Point3,
//           },
//         },
//         {
//           viewportId: viewportIds.CORONAL,
//           type: Enums.ViewportType.ORTHOGRAPHIC,
//           element: elementRefCoronal.current,
//           defaultOptions: {
//             orientation: Enums.OrientationAxis.CORONAL,
//             background: [0, 0, 0] as Types.Point3,
//           },
//         },
//       ];

//       // Add 3D Viewport if 2x2
//       if (layout === '2x2' && elementRef3D.current) {
//         viewportInput.push({
//           viewportId: viewportIds.VOLUME_3D,
//           type: Enums.ViewportType.VOLUME_3D, // specialized 3D type
//           element: elementRef3D.current,
//           defaultOptions: {
//             orientation: Enums.OrientationAxis.CORONAL, // Start with coronal/frontal view
//             background: [0, 0, 0] as Types.Point3,
//           }
//         });
//       }

//       try {
//         // Enable elements individually to be safe
//         viewportInput.forEach(input => {
//           renderingEngine.enableElement(input);
//         });

//         // Add WebGL context loss handlers — catch GPU crashes gracefully
//         const canvasElements = [elementRefAxial.current, elementRefSagittal.current, elementRefCoronal.current, elementRef3D.current].filter(Boolean);
//         canvasElements.forEach(el => {
//           const canvas = el?.querySelector('canvas');
//           if (canvas) {
//             canvas.addEventListener('webglcontextlost', (e) => {
//               e.preventDefault(); // Allow context restoration
//               console.error('[MPRViewport] WebGL context lost! GPU could not handle volume size.');
//               if (isMountedRef.current) {
//                 setError('GPU memory exceeded — this study is too large for MPR on this browser. Try closing other tabs or reducing the browser window size.');
//               }
//             });
//             canvas.addEventListener('webglcontextrestored', () => {
//               console.log('[MPRViewport] WebGL context restored, re-rendering...');
//               renderingEngine?.render();
//             });
//           }
//         });
//       } catch (e) {
//         console.error("Error enabling elements:", e);
//       }

//       // Create/Get ToolGroup
//       let toolGroup = csTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
//       if (toolGroup) {
//         csTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
//       }
//       toolGroup = csTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

//       if (toolGroup) {
//         // Add tools
//         toolGroup.addTool(csTools.WindowLevelTool.toolName);
//         toolGroup.addTool(csTools.PanTool.toolName);
//         toolGroup.addTool(csTools.ZoomTool.toolName);
//         toolGroup.addTool(csTools.StackScrollTool.toolName);
//         toolGroup.addTool(csTools.CrosshairsTool.toolName);
//         toolGroup.addTool(csTools.ReferenceLinesTool.toolName);
//         toolGroup.addTool(csTools.TrackballRotateTool.toolName);
//         toolGroup.addTool(csTools.LengthTool.toolName);
//         toolGroup.addTool(csTools.AngleTool.toolName);
//         toolGroup.addTool(csTools.BidirectionalTool.toolName);

//         // Set Active Tools
//         // Default to Crosshairs or incoming tool
//         const primaryTool = activeTool === 'Crosshairs' || !activeTool ? csTools.CrosshairsTool.toolName : activeTool;

//         if (primaryTool === csTools.CrosshairsTool.toolName) {
//           toolGroup.setToolActive(csTools.CrosshairsTool.toolName, {
//             bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
//           });
//         } else {
//           toolGroup.setToolActive(primaryTool as string, {
//             bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
//           });
//           // Ensure Crosshairs is passive/enabled if needed, or disabled to avoid conflict
//           toolGroup.setToolPassive(csTools.CrosshairsTool.toolName);
//         }

//         // Use TrackballRotate for 3D Viewport interactions if needed, or middle click
//         toolGroup.setToolActive(csTools.TrackballRotateTool.toolName, {
//           bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary, modifierKey: csTools.Enums.KeyboardBindings.Shift }],
//         });
//         toolGroup.setToolActive(csTools.PanTool.toolName, {
//           bindings: [{ mouseButton: csTools.Enums.MouseBindings.Auxiliary }],
//         });
//         toolGroup.setToolActive(csTools.ZoomTool.toolName, {
//           bindings: [{ mouseButton: csTools.Enums.MouseBindings.Secondary }],
//         });
//         toolGroup.setToolActive(csTools.StackScrollTool.toolName, {
//           bindings: [{ mouseButton: csTools.Enums.MouseBindings.Wheel }],
//         });

//         // Enable Reference Lines
//         toolGroup.setToolEnabled(csTools.ReferenceLinesTool.toolName);

//         // Add viewports to toolgroup
//         toolGroup.addViewport(viewportIds.AXIAL, engineId);
//         toolGroup.addViewport(viewportIds.SAGITTAL, engineId);
//         toolGroup.addViewport(viewportIds.CORONAL, engineId);
//         if (layout === '2x2') {
//           toolGroup.addViewport(viewportIds.VOLUME_3D, engineId);
//         }
//       }

//       // 2. Create and Load Volume using StreamingVolumeLoader
//       setEstimatedTime(estimateLoadTime(displaySet.imageIds.length));

//       try {
//         // We call this but DON'T await the full 100% load here.
//         // It will return as soon as the "Jumpstart" batch (100 images) is ready.
//         const volume = await streamingVolumeLoader.createAndLoadVolume(
//           displaySet,
//           (progress) => {
//             if (isMountedRef.current) setLoadingProgress(progress);
//           }
//         );

//         const volumeId = volume.volumeId;
//         volumeIdRef.current = volumeId;

//         // 3. Set Volumes on Viewports
//         const viewports = renderingEngine.getViewports() as IVolumeViewport[];
//         await Promise.all(viewports.map(vp => vp.setVolumes([{ volumeId }])));

//         // Update CacheManager with active volume
//         cacheManager.setVisibleData([], [volumeId]);

//         // 4. Apply VOI properties and camera reset — single pass, no redundant renders
//         const modality = displaySet.modality;
//         const presets = CONSTANTS.VIEWPORT_PRESETS;

//         viewports.forEach(vp => {
//           const is3D = vp.type === Enums.ViewportType.VOLUME_3D;
//           const properties: any = {};

//           // Apply initial VOI range
//           const ww = voiPreset?.window || 400;
//           const wc = voiPreset?.level || 40;
//           const { lower, upper } = csUtils.windowLevel.toLowHighRange(ww, wc);
//           properties.voiRange = { upper, lower };

//           if (is3D) {
//             const presetName = modality === 'MR' ? 'MIP' : 'CT-Bone';
//             let preset = null;
//             if (Array.isArray(presets)) {
//               preset = presets.find(p => p.name === presetName) || presets[0];
//             } else {
//               preset = presets?.[presetName] || presets?.[Object.keys(presets)[0]];
//             }
//             if (preset) properties.preset = preset;
//           }

//           vp.setProperties(properties, volumeId);
//           vp.resetCamera();
//         });

//         // 5. Create Synchronizers
//         const voiSynchronizer = createVOISynchronizer(VOI_SYNC_ID, {
//           syncInvertState: true,
//           syncColormap: true,
//         });

//         // Add viewports to synchronizer
//         voiSynchronizer.add({ renderingEngineId: engineId, viewportId: viewportIds.AXIAL });
//         voiSynchronizer.add({ renderingEngineId: engineId, viewportId: viewportIds.SAGITTAL });
//         voiSynchronizer.add({ renderingEngineId: engineId, viewportId: viewportIds.CORONAL });
//         if (layout === '2x2') {
//           voiSynchronizer.add({ renderingEngineId: engineId, viewportId: viewportIds.VOLUME_3D });
//         }

//         synchronizersRef.current.push(voiSynchronizer);

//         // 6. Single render call
//         renderingEngine.render();

//         // 7. Start loading remaining volume in background
//         streamingVolumeLoader.createAndLoadVolume(
//           displaySet,
//           (progress) => {
//             if (isMountedRef.current) {
//               setLoadingProgress(progress);
//               // [NEW] Refresh viewports every 10% to show streaming progress
//               if (progress % 10 === 0) {
//                 getRenderingEngine(actualEngineIdRef.current)?.render();
//               }
//             }
//           }
//         ).then(() => {
//           if (isMountedRef.current) {
//             setIsVolumeLoaded(true);
//             setLoadingProgress(100);
//           }
//         }).catch(err => {
//           console.error('[MPRViewport] Background volume load failed:', err);
//         });

//         // Set initial true if jumpstart batch finished
//         setIsVolumeLoaded(true);
//         setError(null);

//         console.log(`[MPRViewport] Volume ready. Cache: ${Math.round(cache.getCacheSize() / 1024 / 1024)}MB`);

//       } catch (error: any) {
//         console.error("MPR Volume loading failed:", error);
//         setError(error.message || "Failed to load MPR volume");
//       }
//     };

//     setup();

//     return () => {
//       console.log(`[MPRViewport] Cleaning up engine ${actualEngineIdRef.current}`);
//       const engineId = actualEngineIdRef.current;
//       const engine = getRenderingEngine(engineId);

//       if (engine) {
//         Object.values(viewportIds).forEach(id => {
//           try { engine.disableElement(id); } catch (e) { }
//         });
//         engine.destroy();
//       }

//       // CRITICAL UPDATE: CACHE PERSISTENCE
//       // We DO NOT remove the volume from cache here.
//       // This allows instant re-opening of the same series.
//       // Stale volumes are cleaned up at the START of the next setup() call if needed.

//       const cleanupResources = () => {
//         // Clear request pools only if we are sure we want to stop loading
//         // But since we want to keep cache, maybe we let it finish?
//         // However, to save bandwidth on close, we might want to pause/cancel pending?
//         // Decide: If we close, we probably don't want to keep downloading 2000 images in backgoud immediately.
//         // BUT cancelling might corrupt the volume state if we try to resume.
//         // Safe bet: Don't cancel volume requests if we intend to keep the volume.
//       };

//       cleanupResources();

//       // Destroy tool group and synchronizers
//       try {
//         csTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
//       } catch (e) {
//         console.warn(`[MPRViewport] Failed to destroy tool group: ${TOOL_GROUP_ID}`, e);
//       }

//       synchronizersRef.current.forEach(sync => {
//         try {
//           sync.destroy();
//         } catch (e) {
//           console.warn('[MPRViewport] Failed to destroy synchronizer in cleanup:', e);
//         }
//       });
//       synchronizersRef.current = [];

//       // Also try to cleanup from global manager
//       try {
//         const straySync = SynchronizerManager.getSynchronizer(VOI_SYNC_ID);
//         if (straySync) {
//           straySync.destroy();
//         }
//       } catch (e) {
//         // Already destroyed or doesn't exist
//       }
//     };
//   }, [displaySet, layout]);

//   // Determine grid classes
//   const gridClass = globalMaximizedId
//     ? "grid-cols-1 grid-rows-1"
//     : (layout === '1x3'
//       ? "grid-cols-3 grid-rows-1"
//       : "grid-cols-2 grid-rows-2");

//   return (
//     <div className={cn("grid gap-1 w-full h-full bg-black p-1 relative", gridClass, className)}>

//       {/* Loading Progress Overlay */}
//       {!isVolumeLoaded && loadingProgress < 100 && (
//         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
//           <div className="text-center space-y-4">
//             <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
//             <div className="text-white space-y-2">
//               <p className="text-lg font-medium">Loading MPR Volume...</p>
//               <p className="text-sm text-gray-400">
//                 {loadingProgress === 0 ? 'Initializing center-out loading...' :
//                   loadingProgress < 5 ? 'Loading center slices (most important)...' :
//                     loadingProgress < 50 ? 'Building volume progressively...' :
//                       'Completing remaining slices...'}
//               </p>
//               <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
//                 <div
//                   className="h-full bg-primary transition-all duration-300"
//                   style={{ width: `${loadingProgress}%` }}
//                 />
//               </div>
//               <div className="flex justify-between items-center text-xs text-gray-500 w-64">
//                 <span>{loadingProgress}% complete</span>
//                 {estimatedTime > 0 && loadingProgress > 0 && (
//                   <span>~{Math.round(estimatedTime * (1 - loadingProgress / 100))}s remaining</span>
//                 )}
//               </div>
//               <p className="text-xs text-gray-600 mt-2">
//                 💡 Center anatomy visible at ~5%, full navigation at 100%
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Error Overlay */}
//       {error && (
//         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
//           <div className="text-center space-y-4 p-6 bg-red-900/20 border border-red-500 rounded-lg">
//             <p className="text-red-500 font-semibold">MPR Loading Failed</p>
//             <p className="text-white text-sm">{error}</p>
//           </div>
//         </div>
//       )}

//       {/* Axial Viewport */}
//       {(!globalMaximizedId || globalMaximizedId === viewportIds.AXIAL) && (
//         <div className={cn(
//           "relative w-full h-full border border-gray-800 bg-black group transition-all duration-200",
//           selectedViewportIds.includes(viewportIds.AXIAL) ? "ring-2 ring-yellow-400 z-10" : ""
//         )}>
//           <div
//             ref={elementRefAxial}
//             className={cn("w-full h-full cursor-crosshair", activeViewportId === viewportIds.AXIAL ? "border-2 border-primary" : "")}
//             onContextMenu={(e) => e.preventDefault()}
//             onMouseDown={() => handleViewportClick(viewportIds.AXIAL)}
//             onDoubleClick={() => handleViewportDoubleClick(viewportIds.AXIAL)}
//           />
//           {displaySet && studyUID && (
//             <>
//               <MPRViewportOverlay
//                 viewportId={viewportIds.AXIAL}
//                 seriesUID={displaySet.seriesInstanceUID}
//                 studyUID={studyUID}
//                 label="AXIAL"
//                 labelColor="text-cyan-400"
//                 engineId={actualEngineIdRef.current}
//                 activeTool={activeTool}
//                 slabThickness={viewportSlabThickness[viewportIds.AXIAL] ?? slabThickness}
//                 onWLChange={(ww, wc) => {
//                   const engine = getRenderingEngine(actualEngineIdRef.current);
//                   const vp = engine?.getViewport(viewportIds.AXIAL) as IVolumeViewport;
//                   const { lower, upper } = csUtils.windowLevel.toLowHighRange(ww, wc);
//                   vp?.setProperties({ voiRange: { upper, lower } }, vp.getVolumeId());
//                   vp?.render();
//                 }}
//                 onSlabThicknessChange={(t) => setIndividualSlabThickness(viewportIds.AXIAL, t)}
//               />
//               <ViewportActionCorners corner="top-left">
//                 <OrientationMenu
//                   currentOrientation="AXIAL"
//                   onOrientationChange={(o) => setViewportOrientation(viewportIds.AXIAL, o)}
//                 />
//               </ViewportActionCorners>
//               <ViewportActionCorners corner="bottom-left">
//                 <WindowLevelMenu
//                   onPresetChange={(p) => setViewportWLPreset(viewportIds.AXIAL, p)}
//                   onColorLUTChange={(c) => setViewportColorLUT(viewportIds.AXIAL, c)}
//                 />
//               </ViewportActionCorners>
//               <ImageScrollbar
//                 value={scrollData[viewportIds.AXIAL]?.value || 0}
//                 max={scrollData[viewportIds.AXIAL]?.max || 1}
//                 onChange={(v) => onScrollChange(viewportIds.AXIAL, v)}
//                 className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
//               />
//             </>
//           )}
//         </div>
//       )}

//       {/* 3D Viewport (OHIF Pos 1 in 2x2) */}
//       {layout === '2x2' && (!globalMaximizedId || globalMaximizedId === viewportIds.VOLUME_3D) && (
//         <div className={cn(
//           "relative w-full h-full border border-gray-800 bg-black group transition-all duration-200",
//           selectedViewportIds.includes(viewportIds.VOLUME_3D) ? "ring-2 ring-yellow-400 z-10" : ""
//         )}>
//           <div
//             ref={elementRef3D}
//             className={cn("w-full h-full", activeViewportId === viewportIds.VOLUME_3D ? "border-2 border-primary" : "")}
//             onContextMenu={(e) => e.preventDefault()}
//             onMouseDown={() => handleViewportClick(viewportIds.VOLUME_3D)}
//             onDoubleClick={() => handleViewportDoubleClick(viewportIds.VOLUME_3D)}
//           />
//           {displaySet && studyUID && (
//             <>
//               <MPRViewportOverlay
//                 viewportId={viewportIds.VOLUME_3D}
//                 seriesUID={displaySet.seriesInstanceUID}
//                 studyUID={studyUID}
//                 label="3D VOLUME"
//                 labelColor="text-yellow-400"
//                 engineId={actualEngineIdRef.current}
//                 activeTool={activeTool}
//                 onWLChange={(ww, wc) => {
//                   const engine = getRenderingEngine(actualEngineIdRef.current);
//                   const vp = engine?.getViewport(viewportIds.VOLUME_3D) as IVolumeViewport;
//                   const { lower, upper } = csUtils.windowLevel.toLowHighRange(ww, wc);
//                   vp?.setProperties({ voiRange: { upper, lower } }, vp.getVolumeId());
//                   vp?.render();
//                 }}
//               />
//               <ViewportActionCorners corner="bottom-left">
//                 <WindowLevelMenu
//                   onPresetChange={(p) => setViewportWLPreset(viewportIds.VOLUME_3D, p)}
//                   onColorLUTChange={(c) => setViewportColorLUT(viewportIds.VOLUME_3D, c)}
//                 />
//               </ViewportActionCorners>
//             </>
//           )}
//         </div>
//       )}

//       {layout === '1x3' && (!globalMaximizedId || globalMaximizedId === viewportIds.SAGITTAL) && (
//         /* In 1x3, the second slot is Sagittal */
//         <div className={cn(
//           "relative w-full h-full border border-gray-800 bg-black group transition-all duration-200",
//           selectedViewportIds.includes(viewportIds.SAGITTAL) ? "ring-2 ring-yellow-400 z-10" : ""
//         )}>
//           <div
//             ref={elementRefSagittal}
//             className={cn("w-full h-full cursor-crosshair", activeViewportId === viewportIds.SAGITTAL ? "border-2 border-primary" : "")}
//             onContextMenu={(e) => e.preventDefault()}
//             onMouseDown={() => handleViewportClick(viewportIds.SAGITTAL)}
//             onDoubleClick={() => handleViewportDoubleClick(viewportIds.SAGITTAL)}
//           />
//           {displaySet && studyUID && (
//             <>
//               <MPRViewportOverlay
//                 viewportId={viewportIds.SAGITTAL}
//                 seriesUID={displaySet.seriesInstanceUID}
//                 studyUID={studyUID}
//                 label="SAGITTAL"
//                 labelColor="text-purple-400"
//                 engineId={actualEngineIdRef.current}
//                 activeTool={activeTool}
//                 slabThickness={viewportSlabThickness[viewportIds.SAGITTAL] ?? slabThickness}
//                 onWLChange={(ww, wc) => {
//                   const engine = getRenderingEngine(actualEngineIdRef.current);
//                   const vp = engine?.getViewport(viewportIds.SAGITTAL) as IVolumeViewport;
//                   const { lower, upper } = csUtils.windowLevel.toLowHighRange(ww, wc);
//                   vp?.setProperties({ voiRange: { upper, lower } }, vp.getVolumeId());
//                   vp?.render();
//                 }}
//                 onSlabThicknessChange={(t) => setIndividualSlabThickness(viewportIds.SAGITTAL, t)}
//               />
//               <ViewportActionCorners corner="top-left">
//                 <OrientationMenu
//                   currentOrientation="SAGITTAL"
//                   onOrientationChange={(o) => setViewportOrientation(viewportIds.SAGITTAL, o)}
//                 />
//               </ViewportActionCorners>
//               <ViewportActionCorners corner="bottom-left">
//                 <WindowLevelMenu
//                   onPresetChange={(p) => setViewportWLPreset(viewportIds.SAGITTAL, p)}
//                   onColorLUTChange={(c) => setViewportColorLUT(viewportIds.SAGITTAL, c)}
//                 />
//               </ViewportActionCorners>
//               <ImageScrollbar
//                 value={scrollData[viewportIds.SAGITTAL]?.value || 0}
//                 max={scrollData[viewportIds.SAGITTAL]?.max || 1}
//                 onChange={(v) => onScrollChange(viewportIds.SAGITTAL, v)}
//                 className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
//               />
//             </>
//           )}
//         </div>
//       )}

//       {/* Coronal Viewport (Always Pos 2) */}
//       {(!globalMaximizedId || globalMaximizedId === viewportIds.CORONAL) && (
//         <div className={cn(
//           "relative w-full h-full border border-gray-800 bg-black group transition-all duration-200",
//           selectedViewportIds.includes(viewportIds.CORONAL) ? "ring-2 ring-yellow-400 z-10" : ""
//         )}>
//           <div
//             ref={elementRefCoronal}
//             className={cn("w-full h-full cursor-crosshair", activeViewportId === viewportIds.CORONAL ? "border-2 border-primary" : "")}
//             onContextMenu={(e) => e.preventDefault()}
//             onMouseDown={() => handleViewportClick(viewportIds.CORONAL)}
//             onDoubleClick={() => handleViewportDoubleClick(viewportIds.CORONAL)}
//           />
//           {displaySet && studyUID && (
//             <>
//               <MPRViewportOverlay
//                 viewportId={viewportIds.CORONAL}
//                 seriesUID={displaySet.seriesInstanceUID}
//                 studyUID={studyUID}
//                 label="CORONAL"
//                 labelColor="text-orange-400"
//                 engineId={actualEngineIdRef.current}
//                 activeTool={activeTool}
//                 slabThickness={viewportSlabThickness[viewportIds.CORONAL] ?? slabThickness}
//                 onWLChange={(ww, wc) => {
//                   const engine = getRenderingEngine(actualEngineIdRef.current);
//                   const vp = engine?.getViewport(viewportIds.CORONAL) as IVolumeViewport;
//                   const { lower, upper } = csUtils.windowLevel.toLowHighRange(ww, wc);
//                   vp?.setProperties({ voiRange: { upper, lower } }, vp.getVolumeId());
//                   vp?.render();
//                 }}
//                 onSlabThicknessChange={(t) => setIndividualSlabThickness(viewportIds.CORONAL, t)}
//               />
//               <ViewportActionCorners corner="top-left">
//                 <OrientationMenu
//                   currentOrientation="CORONAL"
//                   onOrientationChange={(o) => setViewportOrientation(viewportIds.CORONAL, o)}
//                 />
//               </ViewportActionCorners>
//               <ViewportActionCorners corner="bottom-left">
//                 <WindowLevelMenu
//                   onPresetChange={(p) => setViewportWLPreset(viewportIds.CORONAL, p)}
//                   onColorLUTChange={(c) => setViewportColorLUT(viewportIds.CORONAL, c)}
//                 />
//               </ViewportActionCorners>
//               <ImageScrollbar
//                 value={scrollData[viewportIds.CORONAL]?.value || 0}
//                 max={scrollData[viewportIds.CORONAL]?.max || 1}
//                 onChange={(v) => onScrollChange(viewportIds.CORONAL, v)}
//                 className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
//               />
//             </>
//           )}
//         </div>
//       )}

//       {/* Fourth Position: Sagittal in 2x2 */}
//       {layout === '2x2' && (!globalMaximizedId || globalMaximizedId === viewportIds.SAGITTAL) && (
//         <div className={cn(
//           "relative w-full h-full border border-gray-800 bg-black group transition-all duration-200",
//           selectedViewportIds.includes(viewportIds.SAGITTAL) ? "ring-2 ring-yellow-400 z-10" : ""
//         )}>
//           <div
//             ref={elementRefSagittal}
//             className={cn("w-full h-full cursor-crosshair", activeViewportId === viewportIds.SAGITTAL ? "border-2 border-primary" : "")}
//             onContextMenu={(e) => e.preventDefault()}
//             onMouseDown={() => handleViewportClick(viewportIds.SAGITTAL)}
//             onDoubleClick={() => handleViewportDoubleClick(viewportIds.SAGITTAL)}
//           />
//           {displaySet && studyUID && (
//             <>
//               <MPRViewportOverlay
//                 viewportId={viewportIds.SAGITTAL}
//                 seriesUID={displaySet.seriesInstanceUID}
//                 studyUID={studyUID}
//                 label="SAGITTAL"
//                 labelColor="text-purple-400"
//                 engineId={actualEngineIdRef.current}
//                 activeTool={activeTool}
//                 slabThickness={viewportSlabThickness[viewportIds.SAGITTAL] ?? slabThickness}
//                 onWLChange={(ww, wc) => {
//                   const engine = getRenderingEngine(actualEngineIdRef.current);
//                   const vp = engine?.getViewport(viewportIds.SAGITTAL) as IVolumeViewport;
//                   const { lower, upper } = csUtils.windowLevel.toLowHighRange(ww, wc);
//                   vp?.setProperties({ voiRange: { upper, lower } }, vp.getVolumeId());
//                   vp?.render();
//                 }}
//                 onSlabThicknessChange={(t) => setIndividualSlabThickness(viewportIds.SAGITTAL, t)}
//               />
//               <ViewportActionCorners corner="top-left">
//                 <OrientationMenu
//                   currentOrientation="SAGITTAL"
//                   onOrientationChange={(o) => setViewportOrientation(viewportIds.SAGITTAL, o)}
//                 />
//               </ViewportActionCorners>
//               <ViewportActionCorners corner="bottom-left">
//                 <WindowLevelMenu
//                   onPresetChange={(p) => setViewportWLPreset(viewportIds.SAGITTAL, p)}
//                   onColorLUTChange={(c) => setViewportColorLUT(viewportIds.SAGITTAL, c)}
//                 />
//               </ViewportActionCorners>
//               <ImageScrollbar
//                 value={scrollData[viewportIds.SAGITTAL]?.value || 0}
//                 max={scrollData[viewportIds.SAGITTAL]?.max || 1}
//                 onChange={(v) => onScrollChange(viewportIds.SAGITTAL, v)}
//                 className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
//               />
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }


