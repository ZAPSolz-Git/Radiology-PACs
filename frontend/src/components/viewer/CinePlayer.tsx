// import { useState, useEffect, useRef } from 'react';
// import { useDicomStore } from '@/stores/dicomStore';
// import { Button } from '@/components/ui/button';
// import { Slider } from '@/components/ui/slider';
// import {
//   Play,
//   Pause,
//   SkipBack,
//   SkipForward,
//   Repeat,
//   ArrowLeftRight
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { CornerstoneService } from '@/services/CornerstoneService';
// import { utilities as csToolsUtils } from '@cornerstonejs/tools';
// import { Enums } from '@cornerstonejs/core';
// import { Input } from '../ui/input';

// interface CinePlayerProps {
//   className?: string;
// }

// export function CinePlayer({ className }: CinePlayerProps) {
//   const {
//     viewports,
//     activeViewportId,
//     updateViewport,
//     studies,
//     isMultiSelectMode,
//     selectedViewportIds
//   } = useDicomStore();

//   const activeViewport = viewports.find(v => v.id === activeViewportId);
//   const isPlaying = activeViewport?.isPlaying || false;

//   const [fps, setFps] = useState(30);
//   const [loopMode, setLoopMode] = useState<'loop' | 'pingpong' | 'once'>('loop');

//   const elementRef = useRef<HTMLDivElement | null>(null);

//   const study = studies.find(s => s.studyInstanceUID === activeViewport?.studyUID);
//   const series = study?.series.find(s => s.seriesInstanceUID === activeViewport?.seriesUID);
//   const totalFrames = series?.instances.length || 0;

//   // Track current frame from viewport
//   const [localFrameIndex, setLocalFrameIndex] = useState(0);

//   // ... (elementRef effect remains same) ...

//   // Sync local frame index with viewport
//   useEffect(() => {
//     if (activeViewport?.currentImageIndex === undefined) return;
//     setLocalFrameIndex(activeViewport.currentImageIndex);
//   }, [activeViewport?.currentImageIndex]);

//   // Listen to image changes to update UI
//   useEffect(() => {
//     if (!elementRef.current) return;

//     const handleImageChange = (evt: any) => {
//       const { imageIndex, newImageIdIndex, imageIdIndex } = evt.detail;
//       const actualIndex = newImageIdIndex ?? imageIndex ?? imageIdIndex;
//       if (actualIndex !== undefined) {
//         setLocalFrameIndex(actualIndex);
//       }
//     };

//     elementRef.current.addEventListener(Enums.Events.STACK_NEW_IMAGE, handleImageChange);

//     return () => {
//       elementRef.current?.removeEventListener(Enums.Events.STACK_NEW_IMAGE, handleImageChange);
//     };
//   }, [elementRef.current]);

//   // Polling frame index during playback
//   useEffect(() => {
//     if (!isPlaying || !activeViewportId) return;

//     let rafId: number;

//     const pollFrameIndex = () => {
//       try {
//         const renderingEngine = CornerstoneService.getRenderingEngine();
//         const csViewport = renderingEngine.getViewport(activeViewportId);
//         if (csViewport && 'getCurrentImageIdIndex' in csViewport) {
//           const currentIndex = (csViewport as any).getCurrentImageIdIndex();
//           setLocalFrameIndex(currentIndex);
//         }
//       } catch (error) { }
//       rafId = requestAnimationFrame(pollFrameIndex);
//     };

//     rafId = requestAnimationFrame(pollFrameIndex);
//     return () => cancelAnimationFrame(rafId);
//   }, [isPlaying, activeViewportId]);

//   // Note: Cine triggering is now handled by the Viewport component itself reacting to store.isPlaying
//   // We just need to update the store here.

//   const handlePlayPause = () => {
//     if (!series || series.instances.length <= 1) return;

//     const nextPlaying = !isPlaying;
//     const targets = isMultiSelectMode && selectedViewportIds.length > 0 ? selectedViewportIds : [activeViewportId].filter(Boolean);

//     targets.forEach(id => {
//       updateViewport(id as string, { isPlaying: nextPlaying, playbackSpeed: fps });
//     });
//   };

//   const handleSkipBack = () => {
//     if (activeViewportId && series) {
//       updateViewport(activeViewportId, { isPlaying: false, currentImageIndex: 0 });
//       setLocalFrameIndex(0);
//     }
//   };

//   const handleSkipForward = () => {
//     if (activeViewportId && series) {
//       const lastIndex = series.instances.length - 1;
//       updateViewport(activeViewportId, { isPlaying: false, currentImageIndex: lastIndex });
//       setLocalFrameIndex(lastIndex);
//     }
//   };

//   const handleFrameSliderChange = (value: number[]) => {
//     if (activeViewportId) {
//       const newIndex = value[0] - 1;
//       updateViewport(activeViewportId, { isPlaying: false, currentImageIndex: newIndex });
//       setLocalFrameIndex(newIndex);
//     }
//   };

//   const cycleLoopMode = () => {
//     const modes: Array<'loop' | 'pingpong' | 'once'> = ['loop', 'pingpong', 'once'];
//     const currentIndex = modes.indexOf(loopMode);
//     setLoopMode(modes[(currentIndex + 1) % modes.length]);
//   };

//   const isDisabled = !series || series.instances.length <= 1;
//   const currentFrame = localFrameIndex + 1;

//   // Track manual frame input entry
//   const [frameInputValue, setFrameInputValue] = useState(currentFrame.toString());

//   useEffect(() => {
//     // Only sync if not focused to avoid snapping back while typing
//     if (document.activeElement?.id !== `cine-frame-input-${activeViewportId}`) {
//       setFrameInputValue(currentFrame.toString());
//     }
//   }, [currentFrame, activeViewportId]);

//   const handleFrameInputBlur = () => {
//     const val = parseInt(frameInputValue);
//     if (!isNaN(val) && val >= 1 && val <= totalFrames) {
//       handleFrameSliderChange([val]);
//     } else {
//       setFrameInputValue(currentFrame.toString());
//     }
//   };

//   return (
//     <div className={cn("bg-card border border-border rounded-lg p-3", className)}>
//       <div className="flex items-center justify-between mb-3">
//         <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
//           Cine Player
//         </span>
//         <div className="flex items-center gap-1">
//           <Input
//             id={`cine-frame-input-${activeViewportId}`}
//             className="h-6 w-12 text-[11px] bg-black/50 border-white/20 text-white p-1 text-center font-mono"
//             value={frameInputValue}
//             onChange={(e) => setFrameInputValue(e.target.value)}
//             onBlur={handleFrameInputBlur}
//             onKeyDown={(e) => e.key === 'Enter' && handleFrameInputBlur()}
//             onFocus={(e) => e.target.select()}
//           />
//           <span className="text-xs font-mono text-muted-foreground">
//             / {totalFrames}
//           </span>
//         </div>
//       </div>

//       <div className="mb-4">
//         <Slider
//           value={[currentFrame]}
//           min={1}
//           max={Math.max(1, totalFrames)}
//           step={1}
//           onValueChange={handleFrameSliderChange}
//           disabled={isDisabled}
//           className="w-full"
//         />
//       </div>

//       <div className="flex items-center justify-center gap-2 mb-4">
//         <Button
//           variant="ghost"
//           size="icon"
//           onClick={handleSkipBack}
//           disabled={isDisabled}
//           className="h-8 w-8"
//         >
//           <SkipBack className="h-4 w-4" />
//         </Button>

//         <Button
//           variant="default"
//           size="icon"
//           onClick={handlePlayPause}
//           disabled={isDisabled}
//           className="h-10 w-10"
//         >
//           {isPlaying ? (
//             <Pause className="h-5 w-5" />
//           ) : (
//             <Play className="h-5 w-5 ml-0.5" />
//           )}
//         </Button>

//         <Button
//           variant="ghost"
//           size="icon"
//           onClick={handleSkipForward}
//           disabled={isDisabled}
//           className="h-8 w-8"
//         >
//           <SkipForward className="h-4 w-4" />
//         </Button>

//         <div className="w-px h-6 bg-border mx-2" />

//         <Button
//           variant={loopMode === 'once' ? 'ghost' : 'secondary'}
//           size="icon"
//           onClick={cycleLoopMode}
//           disabled={isDisabled}
//           className="h-8 w-8"
//           title={`Loop mode: ${loopMode}`}
//         >
//           {loopMode === 'pingpong' ? (
//             <ArrowLeftRight className="h-4 w-4" />
//           ) : (
//             <Repeat className={cn("h-4 w-4", loopMode === 'once' && 'opacity-50')} />
//           )}
//         </Button>
//       </div>

//       {/* 90 FPS SUPPORT */}
//       <div className="space-y-2">
//         <div className="flex justify-between text-xs">
//           <span className="text-muted-foreground">Frame Rate</span>
//           <span className="font-mono text-primary">{fps} FPS</span>
//         </div>
//         <Slider
//           value={[fps]}
//           min={1}
//           max={90}
//           step={1}
//           onValueChange={([value]) => setFps(value)}
//           disabled={isDisabled}
//           className="w-full"
//         />
//       </div>

//       <div className="mt-3 text-center">
//         <span className="text-xs text-muted-foreground">
//           {loopMode === 'loop' && 'Loop continuously'}
//           {loopMode === 'pingpong' && 'Ping-pong (back & forth)'}
//           {loopMode === 'once' && 'Play once'}
//         </span>
//       </div>
//     </div>
//   );
// }