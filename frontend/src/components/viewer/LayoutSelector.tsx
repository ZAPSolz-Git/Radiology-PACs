// import React, { useState } from 'react';
// import { useDicomStore } from '@/stores/dicomStore';
// import { cn } from '@/lib/utils';
// import {
//     Popover,
//     PopoverContent,
//     PopoverTrigger,
// } from '@/components/ui/popover';
// import { Button } from '@/components/ui/button';
// import { LayoutGrid, Grid2x2, Grid3x3 } from 'lucide-react';

// interface LayoutSelectorProps {
//     className?: string;
// }

// export function LayoutSelector({ className }: LayoutSelectorProps) {
//     const { layout, setLayout } = useDicomStore();
//     const [hoveredLayout, setHoveredLayout] = useState<{ rows: number; cols: number } | null>(null);

//     const MAX_ROWS = 3;
//     const MAX_COLS = 3;

//     const handleSelect = (rows: number, cols: number) => {
//         setLayout({ rows, cols });
//     };

//     return (
//         <Popover>
//             <PopoverTrigger asChild>
//                 <Button
//                     variant="ghost"
//                     size="sm"
//                     className={cn(
//                         "h-8 px-2 gap-1.5 font-medium transition-all duration-200 tool-button",
//                         className
//                     )}
//                 >
//                     <LayoutGrid className="w-4 h-4" />
//                     <span className="text-xs">Layout</span>
//                 </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-auto p-3 bg-card border-border shadow-xl" align="start">
//                 <div className="space-y-3">
//                     <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
//                         Select Layout
//                     </div>

//                     <div
//                         className="grid gap-1"
//                         style={{
//                             gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)`,
//                             width: '120px'
//                         }}
//                         onMouseLeave={() => setHoveredLayout(null)}
//                     >
//                         {Array.from({ length: MAX_ROWS * MAX_COLS }).map((_, i) => {
//                             const r = Math.floor(i / MAX_COLS) + 1;
//                             const c = (i % MAX_COLS) + 1;

//                             const isSelected = r <= layout.rows && c <= layout.cols;
//                             const isHovered = hoveredLayout && r <= hoveredLayout.rows && c <= hoveredLayout.cols;

//                             return (
//                                 <div
//                                     key={i}
//                                     className={cn(
//                                         "aspect-square rounded-sm border transition-all duration-150 cursor-pointer",
//                                         isHovered
//                                             ? "bg-primary/40 border-primary"
//                                             : isSelected
//                                                 ? "bg-primary/20 border-primary/50"
//                                                 : "bg-muted/30 border-transparent hover:bg-muted/50"
//                                     )}
//                                     onMouseEnter={() => setHoveredLayout({ rows: r, cols: c })}
//                                     onClick={() => handleSelect(r, c)}
//                                 />
//                             );
//                         })}
//                     </div>

//                     <div className="flex flex-col gap-1 pt-2 border-t border-border/50">
//                         <button
//                             className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors text-left"
//                             onClick={() => handleSelect(1, 1)}
//                         >
//                             <div className="w-3 h-3 border border-current rounded-sm" />
//                             1 x 1 Layout
//                         </button>
//                         <button
//                             className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors text-left"
//                             onClick={() => handleSelect(1, 2)}
//                         >
//                             <Grid2x2 className="w-3 h-3 opacity-70" />
//                             1 x 2 Layout
//                         </button>
//                         <button
//                             className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors text-left"
//                             onClick={() => handleSelect(2, 2)}
//                         >
//                             <Grid3x3 className="w-3 h-3 opacity-70" />
//                             2 x 2 Layout
//                         </button>
//                     </div>

//                     <div className="text-[10px] text-center text-muted-foreground pt-1 italic">
//                         {hoveredLayout
//                             ? `${hoveredLayout.rows} x ${hoveredLayout.cols}`
//                             : `${layout.rows} x ${layout.cols} Active`
//                         }
//                     </div>
//                 </div>
//             </PopoverContent>
//         </Popover>
//     );
// }
