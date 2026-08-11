// import React, { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuTrigger,
//     DropdownMenuSeparator,
//     DropdownMenuSub,
//     DropdownMenuSubTrigger,
//     DropdownMenuSubContent,
//     DropdownMenuLabel
// } from '@/components/ui/dropdown-menu';
// import { Sun, Palette, ChevronRight, Droplet, Circle, CircleOff } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { Switch } from '@/components/ui/switch';

// // Standard Colormaps based on OHIF Viewers / Cornerstone3D
// export const COLOR_LUTS = [
//     { name: 'Grayscale', label: 'Grayscale' },
//     { name: 'X Ray', label: 'X Ray' },
//     { name: 'Isodose', label: 'Isodose' },
//     { name: 'hsv', label: 'HSV' },
//     { name: 'hot_iron', label: 'Hot Iron' },
//     { name: 'red_hot', label: 'Red Hot' },
//     { name: 's_pet', label: 'PET' },
//     { name: 'perfusion', label: 'Perfusion' },
//     { name: 'rainbow_2', label: 'Rainbow' },
//     { name: 'suv', label: 'SUV' },
//     { name: 'ge', label: 'GE Color' },
//     { name: 'siemens', label: 'Siemens' }
// ];

// export const WL_PRESETS = [
//     // Soft Tissue / Mediastinum
//     { label: 'Soft Tissue', window: 400, level: 40 },

//     // Lung
//     { label: 'Lung', window: 1500, level: -600 },

//     // Liver
//     { label: 'Liver', window: 150, level: 30 },

//     // Bone
//     { label: 'Bone', window: 2000, level: 400 },

//     // Brain
//     { label: 'Brain', window: 80, level: 40 },

//     // Abdomen (general soft tissue)
//     { label: 'Abdomen', window: 400, level: 50 },

//     // Mediastinum (chest soft tissue)
//     { label: 'Mediastinum', window: 350, level: 50 },

//     // Spine (soft tissue)
//     { label: 'Spine Soft Tissue', window: 250, level: 50 },

//     // Spine (bone)
//     { label: 'Spine Bone', window: 1800, level: 400 },

//     // Angiography / Vascular
//     { label: 'Angiography', window: 600, level: 200 },

//     // Pelvis
//     { label: 'Pelvis', window: 400, level: 40 },

//     // Head (similar to brain but slightly different)
//     { label: 'Head', window: 80, level: 40 },

//     // Chest (lung alternative)
//     { label: 'Chest', window: 1500, level: -500 },
// ];


// export interface WindowLevelMenuProps {
//     onPresetChange: (preset: { window: number, level: number }) => void;
//     onColorLUTChange: (lutName: string) => void;
//     currentLUT?: string;
//     className?: string;
// }

// export function WindowLevelMenu({ onPresetChange, onColorLUTChange, currentLUT = 'Grayscale', className }: WindowLevelMenuProps) {

//     const [showColorBar, setShowColorBar] = useState(true);

//     return (
//         <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//                 <Button
//                     variant="ghost"
//                     size="sm"
//                     className={cn("h-7 w-7 p-0 rounded-full bg-transparent hover:bg-white/10 transition-colors", className)}
//                 >
//                     <div className="relative w-4 h-4 border border-white/40 rounded-full overflow-hidden">
//                         <div className="absolute inset-0 bg-primary/80 transform -translate-x-1/2 -rotate-45" />
//                     </div>
//                 </Button>
//             </DropdownMenuTrigger>

//             {/* Make the main menu background fully opaque and add a border */}
//             <DropdownMenuContent align="start" className="w-56 bg-[#090c29] text-white border border-white/10 shadow-2xl p-1">

//                 <div className="flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 rounded-md transition-colors">
//                     <span className="font-medium">Display Color bar</span>
//                     <Switch
//                         checked={showColorBar}
//                         onCheckedChange={setShowColorBar}
//                         className="h-4 w-7 data-[state=checked]:bg-primary"
//                     />
//                 </div>

//                 <DropdownMenuSeparator className="bg-white/10 mx-1" />

//                 {/* Color LUT Submenu */}
//                 <DropdownMenuSub>
//                     <DropdownMenuSubTrigger className="text-xs py-2 px-3 focus:bg-primary/10 rounded-md gap-2">
//                         <Droplet className="w-3.5 h-3.5 text-blue-400" />
//                         <span>Color LUT</span>
//                     </DropdownMenuSubTrigger>

//                     {/* Make submenu solid (no /98 opacity) and add border */}
//                     <DropdownMenuSubContent className="w-44 bg-[#090c29] text-white border border-white/10 p-1">
//                         <div className="max-h-[300px] overflow-y-auto">
//                             {COLOR_LUTS.map(lut => (
//                                 <DropdownMenuItem
//                                     key={lut.name}
//                                     onClick={() => {
//                                         console.log('Colormap Selected (Click):', lut.name);
//                                         onColorLUTChange(lut.name);
//                                     }}
//                                     className={cn(
//                                         "text-xs cursor-pointer py-1.5 px-3 rounded-md focus:bg-primary/40",
//                                         currentLUT === lut.name && "bg-primary/20 text-primary font-semibold"
//                                     )}
//                                 >
//                                     {lut.label}
//                                 </DropdownMenuItem>
//                             ))}
//                         </div>
//                     </DropdownMenuSubContent>
//                 </DropdownMenuSub>

//                 {/* Window Presets Submenu */}
//                 <DropdownMenuSub>
//                     <DropdownMenuSubTrigger className="text-xs py-2 px-3 focus:bg-primary/30 rounded-md mt-0.5 gap-2">
//                         <Circle className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/20" />
//                         <span>Window Presets</span>
//                     </DropdownMenuSubTrigger>

//                     {/* Also make this submenu solid */}
//                     <DropdownMenuSubContent className="w-52 bg-[#090c29] text-white border border-white/10 p-1">
//                         {WL_PRESETS.map(preset => (
//                             <DropdownMenuItem
//                                 key={preset.label}
//                                 onClick={() => {
//                                     console.log('W/L Preset Selected (Click):', preset.label);
//                                     onPresetChange(preset);
//                                 }}
//                                 className="text-xs cursor-pointer flex justify-between py-1.5 px-3 rounded-md focus:bg-primary/40"
//                             >
//                                 <span className="font-medium">{preset.label}</span>
//                                 <span className="text-[10px] text-muted-foreground">{preset.window}/{preset.level}</span>
//                             </DropdownMenuItem>
//                         ))}
//                     </DropdownMenuSubContent>
//                 </DropdownMenuSub>

//             </DropdownMenuContent>
//         </DropdownMenu>
//     );
// }
