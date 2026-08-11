// import React from 'react';
// import { Button } from '@/components/ui/button';
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuTrigger,
//     DropdownMenuSeparator,
//     DropdownMenuLabel
// } from '@/components/ui/dropdown-menu';
// import { Rotate3D, Layers, ChevronDown, Check } from 'lucide-react';
// import { cn } from '@/lib/utils';

// export interface OrientationMenuProps {
//     currentOrientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'ACQUISITION';
//     onOrientationChange: (orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'ACQUISITION') => void;
//     className?: string;
// }

// export function OrientationMenu({ currentOrientation, onOrientationChange, className }: OrientationMenuProps) {

//     const getLabel = (o: string) => {
//         switch (o) {
//             case 'AXIAL': return 'Axial';
//             case 'SAGITTAL': return 'Sagittal';
//             case 'CORONAL': return 'Coronal';
//             case 'ACQUISITION': return 'Acquisition';
//             default: return 'Axial';
//         }
//     };

//     return (
//         <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//                 <Button
//                     variant="link"
//                     size="sm"
//                     className={cn("h-7 px-1.5 text-xs font-medium bg-transparent hover:bg-white/10 text-white/90 border-transparent transition-colors", className)}
//                 >
//                     <Rotate3D className="w-4 h-4 mr-1 text-primary-foreground/70" />
//                     <Layers className="w-4 h-4" />
//                 </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="start" className="w-40 bg-[#090c29]/95 text-white border-white/10 shadow-2xl backdrop-blur-md">
//                 {['AXIAL', 'SAGITTAL', 'CORONAL', 'ACQUISITION'].map((orientation) => (
//                     <DropdownMenuItem
//                         key={orientation}
//                         onClick={() => {
//                             console.log('Orientation Selected (Click):', orientation);
//                             onOrientationChange(orientation as any);
//                         }}
//                         className={cn(
//                             "text-xs cursor-pointer flex items-center justify-between py-2 px-3 focus:bg-primary/30 focus:text-white transition-colors",
//                             currentOrientation === orientation && "text-primary-foreground font-semibold"
//                         )}
//                     >
//                         <div className="flex items-center gap-2">
//                             {currentOrientation === orientation && <Check className="w-3 h-3 text-primary" />}
//                             <span className={cn(currentOrientation !== orientation && "ml-5")}>{getLabel(orientation)}</span>
//                         </div>
//                     </DropdownMenuItem>
//                 ))}

//                 <DropdownMenuSeparator className="bg-white/10 mx-2" />
//                 <DropdownMenuItem
//                     onClick={() => { }} // Placeholder for reformat mode
//                     className="text-xs py-2 px-3 ml-5 focus:bg-primary/30"
//                 >
//                     Reformat
//                 </DropdownMenuItem>

//             </DropdownMenuContent>
//         </DropdownMenu>
//     );
// }
