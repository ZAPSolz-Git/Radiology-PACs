// import React from 'react';
// import { Sun, Rotate3D } from 'lucide-react';
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";
// import { Slider } from "@/components/ui/slider";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Ruler, Activity, MousePointer2, Copy, Combine, Download, Image as ImageIcon, Triangle, MoveDiagonal2 } from "lucide-react";
// import { MPRCinePlayer } from "./MPRCinePlayer";

// interface MPRSettingsPanelProps {
//     layout: '1x3' | '2x2';
//     setLayout: (layout: '1x3' | '2x2') => void;
//     blendMode: string;
//     setBlendMode: (mode: string) => void;
//     slabThickness: number;
//     setSlabThickness: (thickness: number) => void;
//     applyWLPreset: (preset: { window: number, level: number }) => void;
//     applyOrientation: (orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL') => void;
//     activeTool: string;
//     setActiveTool: (toolName: string) => void;
//     activeViewportId: string | null;
//     onExport?: () => void;
//     onBatchExport?: () => void;
//     batchProgress?: { current: number, total: number } | null;
//     onCompare?: () => void;
//     isComparisonActive?: boolean;
// }

// export const WL_PRESETS = [
//     { label: 'Soft Tissue', window: 400, level: 40 },
//     { label: 'Lung', window: 1500, level: -600 },
//     { label: 'Liver', window: 150, level: 90 },
//     { label: 'Bone', window: 2500, level: 480 },
//     { label: 'Brain', window: 80, level: 40 },
// ];

// export function MPRSettingsPanel({
//     layout,
//     setLayout,
//     blendMode,
//     setBlendMode,
//     slabThickness,
//     setSlabThickness,
//     applyWLPreset,
//     applyOrientation,
//     activeTool,
//     setActiveTool,
//     activeViewportId,
//     onExport,
//     onBatchExport,
//     batchProgress,
//     onCompare,
//     isComparisonActive
// }: MPRSettingsPanelProps) {
//     return (
//         <div className="w-full h-full flex flex-col bg-card">
//             <div className="p-4 border-b border-border">
//                 <h3 className="font-semibold text-lg mb-4">MPR Settings</h3>
//                 <Tabs defaultValue="display" className="w-full">
//                     <TabsList className="grid w-full grid-cols-2">
//                         <TabsTrigger value="display">Display</TabsTrigger>
//                         <TabsTrigger value="tools">Tools</TabsTrigger>
//                     </TabsList>

//                     {/* DISPLAY TAB */}
//                     <TabsContent value="display" className="space-y-6 mt-4 h-[calc(100vh-180px)] overflow-y-auto">

//                         {/* Window Level Section - Moved to Viewport Menu */}
//                         <div className="space-y-3 pb-2">
//                             <Label className="text-sm text-muted-foreground">Display Settings available on Viewports</Label>
//                         </div>

//                         <Separator />

//                         {/* Layout Selection */}
//                         <div className="space-y-3">
//                             <Label className="text-base font-medium">Layout</Label>
//                             <div className="grid grid-cols-2 gap-2">
//                                 <button
//                                     className={`p-2 border rounded text-sm ${layout === '1x3' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'}`}
//                                     onClick={() => setLayout('1x3')}
//                                 >
//                                     MPR (1x3)
//                                 </button>
//                                 {/* <button
//                                     className={`p-2 border rounded text-sm ${layout === '2x2' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'}`}
//                                     onClick={() => setLayout('2x2')}
//                                 >
//                                     Grid (2x2 + 3D)
//                                 </button> */}
//                             </div>
//                         </div>

//                         <Separator />

//                         {/* Rendering Mode */}
//                         <div className="space-y-3">
//                             <Label className="text-base font-medium">Rendering Mode</Label>
//                             <Select value={blendMode} onValueChange={setBlendMode}>
//                                 <SelectTrigger className="w-full">
//                                     <SelectValue placeholder="Select mode" />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                     <SelectItem value="COMPOSITE">Standard</SelectItem>
//                                     <SelectItem value="MAXIMUM_INTENSITY_BLEND">MIP (Max Intensity)</SelectItem>
//                                     <SelectItem value="MINIMUM_INTENSITY_BLEND">MinIP (Min Intensity)</SelectItem>
//                                     <SelectItem value="AVERAGE_INTENSITY_BLEND">AvgIP (Average)</SelectItem>
//                                 </SelectContent>
//                             </Select>
//                         </div>

//                         <Separator />



//                         <Separator />

//                         {/* Slab Thickness */}
//                         <div className="space-y-4">
//                             <div className="flex justify-between items-center">
//                                 <Label className="text-base font-medium">Slab Thickness</Label>
//                                 <span className="text-sm font-mono bg-secondary px-2 py-1 rounded">{slabThickness.toFixed(1)} mm</span>
//                             </div>
//                             <Slider
//                                 value={[slabThickness]}
//                                 min={0.1}
//                                 max={50}
//                                 step={0.1}
//                                 onValueChange={(vals) => setSlabThickness(vals[0])}
//                                 className="w-full"
//                             />
//                         </div>

//                         {/* Placeholder for Phase 2 Features */}
//                         {/* <Separator />
//         <div className="opacity-50 pointer-events-none">
//              <Label>Cine Player (Coming Soon)</Label>
//         </div> */}

//                     </TabsContent>

//                     {/* TOOLS TAB */}
//                     <TabsContent value="tools" className="space-y-6 mt-4 h-[calc(100vh-180px)] overflow-y-auto">

//                         {/* Tool selection */}
//                         <div className="space-y-3">
//                             <Label className="text-base font-medium">Active Tool</Label>
//                             <div className="grid grid-cols-2 gap-2">
//                                 <Button
//                                     variant={activeTool === 'Crosshairs' ? "default" : "outline"}
//                                     className="justify-start"
//                                     onClick={() => setActiveTool('Crosshairs')}
//                                 >
//                                     <Activity className="w-4 h-4 mr-2" />
//                                     Crosshairs
//                                 </Button>
//                                 <Button
//                                     variant={activeTool === 'Length' ? "default" : "outline"}
//                                     className="justify-start"
//                                     onClick={() => setActiveTool('Length')}
//                                 >
//                                     <Ruler className="w-4 h-4 mr-2" />
//                                     Length
//                                 </Button>
//                                 <Button
//                                     variant={activeTool === 'Angle' ? "default" : "outline"}
//                                     className="justify-start"
//                                     onClick={() => setActiveTool('Angle')}
//                                 >
//                                     <Triangle className="w-4 h-4 mr-2" />
//                                     Angle
//                                 </Button>
//                                 <Button
//                                     variant={activeTool === 'Bidirectional' ? "default" : "outline"}
//                                     className="justify-start"
//                                     onClick={() => setActiveTool('Bidirectional')}
//                                 >
//                                     <MoveDiagonal2 className="w-4 h-4 mr-2" />
//                                     Bidirectional
//                                 </Button>
//                             </div>
//                         </div>

//                         <Separator />

//                         <div className="space-y-3">
//                             <MPRCinePlayer viewportId={activeViewportId || undefined} />
//                         </div>

//                         <Separator />

//                         {/* Comparison Tools */}
//                         <div className="space-y-3">
//                             <Label className="text-base font-medium">Comparison</Label>
//                             <div className="grid grid-cols-1 gap-2">
//                                 <Button
//                                     variant={isComparisonActive ? "default" : "outline"}
//                                     className="justify-start"
//                                     onClick={onCompare}
//                                 >
//                                     <Combine className="w-4 h-4 mr-2" />
//                                     {isComparisonActive ? 'Stop Comparison' : 'Compare Series'}
//                                 </Button>
//                                 <Button
//                                     variant={activeTool === 'Crosshairs' ? "default" : "outline"}
//                                     className="justify-start"
//                                     onClick={() => setActiveTool(activeTool === 'Crosshairs' ? 'WindowLevel' : 'Crosshairs')}
//                                 >
//                                     <Activity className="w-4 h-4 mr-2" />
//                                     Crosshairs Sync
//                                 </Button>
//                             </div>
//                         </div>

//                         <Separator />

//                         {/* Batch / Export */}
//                         <div className="space-y-3">
//                             <Label className="text-base font-medium">Batch / Export</Label>
//                             <div className="grid grid-cols-1 gap-2">
//                                 <Button
//                                     variant="outline"
//                                     className="justify-start"
//                                     onClick={() => {
//                                         if (onExport) {
//                                             onExport();
//                                         } else if (activeViewportId) {
//                                             // Fallback internal export if no prop provided
//                                             import("@/services/CornerstoneService").then(({ CornerstoneService }) => {
//                                                 CornerstoneService.captureViewport(activeViewportId, `mpr-capture-${activeViewportId}.png`);
//                                             });
//                                         }
//                                     }}
//                                 >
//                                     <ImageIcon className="w-4 h-4 mr-2" />
//                                     Export Active Viewport ({activeViewportId ? activeViewportId.replace('MPR_', '') : 'None'})
//                                 </Button>
//                                 <Button
//                                     variant="outline"
//                                     className="justify-start"
//                                     onClick={onBatchExport}
//                                     disabled={!!batchProgress}
//                                 >
//                                     <Download className="w-4 h-4 mr-2" />
//                                     {batchProgress ? `Exporting (${batchProgress.current}/${batchProgress.total})` : 'Batch Series Export'}
//                                 </Button>
//                                 {batchProgress && (
//                                     <div className="mt-2 space-y-1">
//                                         <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
//                                             <div
//                                                 className="h-full bg-primary transition-all duration-300"
//                                                 style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
//                                             />
//                                         </div>
//                                         <p className="text-[10px] text-muted-foreground text-center animate-pulse italic">
//                                             Please wait while slices are being processed...
//                                         </p>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                     </TabsContent>

//                 </Tabs>
//             </div>
//         </div>
//     );
// }
