// import { cn } from '@/lib/utils';
// import { Scan, Box } from 'lucide-react';
// import { type DisplaySet } from '@/services/DisplaySetService';
// import { DicomThumbnail } from './DicomThumbnail';

// import { observer } from 'mobx-react-lite';

// interface ThumbnailProps {
//     displaySet: DisplaySet;
//     isSelected?: boolean;
//     onClick?: (studyUID: string, displaySetUID: string) => void;
//     onDragStart?: (e: React.DragEvent, displaySetUID: string) => void;
// }

// export const Thumbnail = observer(({ displaySet, isSelected, onClick, onDragStart }: ThumbnailProps) => {
//     const handleDragStart = (e: React.DragEvent) => {
//         if (onDragStart) {
//             onDragStart(e, displaySet.displaySetInstanceUID);
//         }

//         // Data for native drop
//         e.dataTransfer.setData('displaySetInstanceUID', displaySet.displaySetInstanceUID);
//         e.dataTransfer.effectAllowed = 'move';

//         // Optional: Ghost image logic could be added here
//     };

//     return (
//         <div
//             className={cn(
//                 "group relative flex flex-col gap-1 p-2 cursor-pointer transition-all border-l-2",
//                 isSelected
//                     ? "border-primary bg-primary/10"
//                     : "border-transparent hover:bg-muted/50"
//             )}
//             onClick={() => onClick?.(displaySet.studyInstanceUID, displaySet.displaySetInstanceUID)}
//             draggable
//             onDragStart={handleDragStart}
//         >
//             <div className="flex gap-3 items-center">
//                 {/* Visual Preview Placeholder */}
//                 <div className={cn(
//                     "w-16 h-16 rounded bg-black flex items-center justify-center flex-shrink-0 border overflow-hidden relative",
//                     isSelected ? "border-primary" : "border-border group-hover:border-primary/50"
//                 )}>
//                     <DicomThumbnail imageSrc={displaySet.thumbnailSrc} className="w-full h-full" />

//                     {/* Badge for Volume/Stack */}
//                     <div className="absolute bottom-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white font-mono uppercase">
//                         {displaySet.displaySetType}
//                     </div>
//                 </div>

//                 {/* Info */}
//                 <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-1.5 mb-1">
//                         <span className="text-[10px] font-bold text-primary bg-primary/20 px-1 rounded">
//                             {displaySet.modality}
//                         </span>
//                         <span className="text-xs text-muted-foreground font-mono">
//                             Ser: {displaySet.seriesNumber}
//                         </span>
//                     </div>

//                     <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
//                         {displaySet.seriesDescription || 'No description'}
//                     </div>

//                     <div className="text-[11px] text-muted-foreground mt-0.5">
//                         {displaySet.numInstances} {displaySet.numInstances === 1 ? 'image' : 'images'}
//                         {displaySet.isReconstructable && " • 3D"}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// });
