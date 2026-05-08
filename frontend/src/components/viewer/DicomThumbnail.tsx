// import React from 'react';
// import { cn } from '@/lib/utils';
// import { Loader2 } from 'lucide-react';

// interface DicomThumbnailProps {
//     imageSrc?: string;
//     className?: string;
// }

// /**
//  * DicomThumbnail
//  * 
//  * Renders a persistent DICOM thumbnail using a cached data URL (OHIF pattern).
//  * The thumbnail is rendered as a simple <img> tag, so it persists across
//  * React re-renders, panel toggles, and scrolling — no canvas lifecycle issues.
//  */
// export const DicomThumbnail = ({ imageSrc, className }: DicomThumbnailProps) => {
//     const loading = !imageSrc;

//     return (
//         <div className={cn("relative bg-black rounded overflow-hidden", className)}>
//             {imageSrc ? (
//                 <img
//                     src={imageSrc}
//                     alt="DICOM thumbnail"
//                     className="w-full h-full object-contain"
//                     crossOrigin="anonymous"
//                     draggable={false}
//                 />
//             ) : (
//                 <div className="absolute inset-0 flex items-center justify-center bg-accent/10">
//                     <Loader2 className="w-4 h-4 text-primary animate-spin" />
//                 </div>
//             )}
//         </div>
//     );
// };
