// import React from 'react';
// import { cn } from '@/lib/utils';

// interface ViewportActionCornersProps {
//     className?: string;
//     corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
//     children: React.ReactNode;
// }

// export function ViewportActionCorners({ className, corner = 'top-left', children }: ViewportActionCornersProps) {
//     const cornerClasses = {
//         'top-left': 'top-2 left-2',
//         'top-right': 'top-2 right-2',
//         'bottom-left': 'bottom-2 left-2',
//         'bottom-right': 'bottom-2 right-2',
//     };

//     return (
//         <div className={cn("absolute z-20 flex gap-2 pointer-events-auto", cornerClasses[corner], className)}
//             onMouseDown={(e) => e.stopPropagation()}
//         >
//             {children}
//         </div>
//     );
// }
