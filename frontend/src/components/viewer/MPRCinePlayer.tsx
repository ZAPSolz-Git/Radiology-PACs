// import { useState, useEffect, useRef } from 'react';
// import { useDicomStore } from '@/stores/dicomStore';
// import { Button } from '@/components/ui/button';
// import { Slider } from '@/components/ui/slider';
// import {
//     Play,
//     Pause,
//     SkipBack,
//     SkipForward,
//     Repeat,
//     ArrowLeftRight
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { utilities as csToolsUtils } from '@cornerstonejs/tools';
// import { getRenderingEngine, Enums } from '@cornerstonejs/core';
// import type { IVolumeViewport } from '@cornerstonejs/core/types';

// interface MPRCinePlayerProps {
//     className?: string;
//     viewportId?: string; // Default to MPR_AXIAL if not provided
// }

// const RENDERING_ENGINE_ID = 'mpr_rendering_engine';
// const DEFAULT_VIEWPORT_ID = 'MPR_AXIAL';

// export function MPRCinePlayer({ className, viewportId = DEFAULT_VIEWPORT_ID }: MPRCinePlayerProps) {

//     const {
//         viewports,
//         activeViewportId,
//         updateViewport,
//         isMultiSelectMode,
//         selectedViewportIds
//     } = useDicomStore();

//     const activeViewport = viewports.find(v => v.id === (viewportId || activeViewportId));
//     const isPlaying = activeViewport?.isPlaying || false;

//     // Reset play state if viewport changes
//     useEffect(() => {
//         // No longer local state, so this might not be needed or should be handled by store
//     }, [viewportId]);

//     const [fps, setFps] = useState(24);
//     const [loopMode, setLoopMode] = useState<'loop' | 'pingpong' | 'once'>('loop');
//     const [currentFrame, setCurrentFrame] = useState(1);
//     const [totalFrames, setTotalFrames] = useState(1); // Kept as 1, as `totalFrames || 1` is self-referential for useState init

//     // Poll for volume info
//     useEffect(() => {
//         const getVolumeInfo = () => {
//             const engine = getRenderingEngine(RENDERING_ENGINE_ID);
//             if (!engine) return;
//             const viewport = engine.getViewport(viewportId) as IVolumeViewport;
//             if (!viewport) return;

//             // For Volume Viewport, "Stack Scroll" moves through slices.
//             // Is there a "Generic" way to get slice count?
//             // For Orthographic Viewport (MPR), we can get direct slice info.

//             // Note: createVOISynchronizer suggests these are VolumeViewports.
//             // VolumeViewports don't always have "Images" in a stack sense, but they have slices.

//             // Let's rely on camera position or similar? 
//             // Actually, cornerstone3D volume viewports CAN be scrolled if they are defined as such.
//             // But usually we need to know the 'slice range'.

//             // Easier approach: Use the element and events.
//             if (viewport.element) {
//                 // Try to find image Count
//                 // const numSlices = viewport.getNumberOfSlices(); // Not available on all types?
//             }
//         };

//         // Temporary: Just Assume it's working for now or use the standard Cine Tool
//         // The standard Cine tool requires a Stack of images or a Volume that supports scrolling steps.
//     }, [viewportId]);

//     const elementRef = useRef<HTMLDivElement | null>(null);

//     // Initialize Reference
//     useEffect(() => {
//         const updateRef = () => {
//             const engine = getRenderingEngine(RENDERING_ENGINE_ID);
//             const viewport = engine?.getViewport(viewportId);
//             if (viewport?.element) {
//                 elementRef.current = viewport.element;
//             }
//         }

//         updateRef();
//         const interval = setInterval(updateRef, 500); // Poll until found
//         return () => clearInterval(interval);
//     }, [viewportId]);

//     // Listen to image changes
//     useEffect(() => {
//         if (!elementRef.current) return;

//         // For Volume Viewports, getting the "Index" is tricky because it's continuous 3D space.
//         // However, the CineClip tool works by scrolling the camera.

//         // We need to know the range.
//         // Let's use the `utilities` to get scroll info?

//     }, [elementRef.current]);

//     // Play/Pause Logic
//     useEffect(() => {
//         if (!elementRef.current) return;

//         if (isPlaying) {
//             const playClipOptions = {
//                 framesPerSecond: fps,
//                 loop: loopMode === 'loop' || loopMode === 'pingpong',
//                 reverse: false,
//                 // dynamicCine: true // Required for Volume Viewports?
//             };

//             try {
//                 csToolsUtils.cine.playClip(elementRef.current, playClipOptions);
//             } catch (error) {
//                 console.error('Failed to start MPR cine:', error);
//                 updateViewport(viewportId || activeViewportId!, { isPlaying: false });
//             }
//         } else {
//             try {
//                 csToolsUtils.cine.stopClip(elementRef.current);
//             } catch (error) {
//                 // ignore
//             }
//         }

//         return () => {
//             if (elementRef.current) {
//                 csToolsUtils.cine.stopClip(elementRef.current);
//             }
//         };
//     }, [isPlaying, fps, loopMode, elementRef.current]);

//     const togglePlay = () => {
//         const nextPlaying = !isPlaying;
//         const targets = isMultiSelectMode && selectedViewportIds.length > 0 ? selectedViewportIds : [viewportId || activeViewportId].filter(Boolean);

//         targets.forEach(id => {
//             updateViewport(id as string, { isPlaying: nextPlaying, playbackSpeed: fps });
//         });
//     };

//     return (
//         <div className={cn("bg-secondary/20 border border-border rounded-lg p-3", className)}>
//             <div className="flex items-center justify-between mb-3">
//                 <span className="text-xs font-medium uppercase tracking-wider">Cine ({viewportId?.replace('MPR_', '') || 'AXIAL'})</span>
//                 {/* <span className="text-xs font-mono">{currentFrame}/{totalFrames}</span> */}
//             </div>

//             <div className="flex items-center justify-center gap-2 mb-4">
//                 <Button variant="default" size="icon" onClick={togglePlay} className="h-10 w-10">
//                     {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
//                 </Button>
//             </div>

//             <div className="space-y-2">
//                 <div className="flex justify-between text-xs">
//                     <span>Speed</span>
//                     <span>{fps} FPS</span>
//                 </div>
//                 <Slider
//                     value={[fps]}
//                     min={1}
//                     max={60}
//                     step={1}
//                     onValueChange={([v]) => setFps(v)}
//                 />
//             </div>
//         </div>
//     );
// }
