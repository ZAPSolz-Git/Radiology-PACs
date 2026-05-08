// // src/components/viewer/ImageScrollbar.tsx
// import React, { useCallback } from 'react';
// import { cn } from '@/lib/utils';

// export interface ImageScrollbarProps {
//     value: number;
//     max: number;
//     height?: string;
//     onChange: (value: number) => void;
//     className?: string;
// }

// export function ImageScrollbar({
//     value,
//     max,
//     height = '100%',
//     onChange,
//     className = '',
// }: ImageScrollbarProps) {
//     if (max <= 0) {
//         return null;
//     }

//     const handleChange = useCallback(
//         (event: React.ChangeEvent<HTMLInputElement>) => {
//             const intValue = parseInt(event.target.value, 10);
//             onChange(intValue);
//         },
//         [onChange]
//     );

//     // We include WebkitAppearance with an `as any` cast because
//     // the value 'slider-vertical' is a vendor-specific string not present
//     // in the TypeScript CSS typings. This avoids the TS2322 error.
//     const sliderStyle: React.CSSProperties & { WebkitAppearance?: any } = {
//         writingMode: 'vertical-lr',
//         direction: 'rtl', // flip so top = min, bottom = max
//         // apply vendor appearance for vertical slider in WebKit-based browsers
//         WebkitAppearance: 'slider-vertical' as any,
//         // keep the standard appearance set to none (Tailwind's appearance-none is present too)
//         appearance: 'none',
//         height: '100%',
//         // width intentionally left to classes
//     };

//     return (
//         <div
//             className={cn(
//                 'absolute right-1 top-4 bottom-4 w-4 bg-transparent z-10 flex items-center justify-center',
//                 className
//             )}
//             style={{ height: 'calc(100% - 32px)' }}
//             onMouseDown={(e) => e.stopPropagation()} // Prevent dragging the viewport
//         >
//             <div className="relative w-full h-full flex items-center justify-center">
//                 {/* Rotated/vertical range input */}
//                 <input
//                     type="range"
//                     min="0"
//                     max={max}
//                     step="1"
//                     value={value}
//                     onChange={handleChange}
//                     className="absolute h-full w-4 opacity-50 hover:opacity-100 cursor-pointer appearance-none bg-secondary rounded-full"
//                     style={sliderStyle}
//                     aria-label="Image navigation scrollbar"
//                 />
//             </div>
//         </div>
//     );
// }

// export default ImageScrollbar;
