// import { useDicomStore } from '@/stores/dicomStore';
// import { Button } from '@/components/ui/button';
// import {
//   Ruler,
//   Trash2,
//   Download,
//   CornerUpRight,
//   Square,
//   Circle,
//   Info,
//   ArrowRightLeft,
//   MousePointer,
//   Search,
//   RotateCw,
//   Rotate3D
// } from 'lucide-react';
// import type { ToolType } from '@/types/dicom';

// const toolIcons: Record<ToolType, React.ReactNode> = {
//   Length: <Ruler className="w-3 h-3" />,
//   Angle: <CornerUpRight className="w-3 h-3" />,
//   RectangleROI: <Square className="w-3 h-3" />,
//   EllipticalROI: <Circle className="w-3 h-3" />,
//   Bidirectional: <ArrowRightLeft className="w-3 h-3" />,
//   Probe: <Info className="w-3 h-3" />,
//   WindowLevel: <MousePointer className="w-3 h-3" />,
//   Pan: <MousePointer className="w-3 h-3" />,
//   Zoom: <MousePointer className="w-3 h-3" />,
//   StackScroll: <MousePointer className="w-3 h-3" />,
//   Crosshairs: <MousePointer className="w-3 h-3" />,
//   ArrowAnnotate: <MousePointer className="w-3 h-3" />,
//   Magnify: <Search className="w-3 h-3" />,
//   PlanarRotate: <RotateCw className="w-3 h-3" />,
//   TrackballRotate: <Rotate3D className="w-3 h-3" />,
// };

// const formatMeasurementValue = (measurement: { toolType: ToolType; data: any }): string => {
//   const { data } = measurement;

//   if (data.value !== undefined) {
//     const val = typeof data.value === 'number' ? data.value.toFixed(2) : data.value;
//     return data.unit ? `${val} ${data.unit}` : `${val}`;
//   }

//   if (data.stats) {
//     if (typeof data.stats.mean === 'number') {
//       return `Mean: ${data.stats.mean.toFixed(1)} HU`;
//     }
//     return JSON.stringify(data.stats);
//   }

//   if (data.handles) {
//     // If we have handles but no value, it might be in an unexpected key
//     // We'll show "Calculating..." but also check for ANY other data
//     const keys = Object.keys(data).filter(k => !['handles', 'cachedStats', 'value', 'unit', 'toolType'].includes(k));
//     if (keys.length > 0 && typeof data[keys[0]] === 'number') {
//       return `${data[keys[0]].toFixed(2)}`;
//     }
//     return 'Calculating...';
//   }

//   return 'N/A';
// };

// export function MeasurementPanel() {
//   const { measurements, removeMeasurement } = useDicomStore();

//   const exportMeasurements = () => {
//     if (measurements.length === 0) return;

//     const csvContent = [
//       ['ID', 'Type', 'Value', 'Unit', 'Label', 'Created At'].join(','),
//       ...measurements.map(m => [
//         m.id,
//         m.toolType,
//         m.data.value || '',
//         m.data.unit || '',
//         m.label || '',
//         m.createdAt.toISOString()
//       ].join(','))
//     ].join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `measurements_${new Date().toISOString().split('T')[0]}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   if (measurements.length === 0) {
//     return (
//       <div className="p-4 text-center">
//         <Ruler className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
//         <p className="text-sm text-muted-foreground">No measurements</p>
//         <p className="text-xs text-muted-foreground mt-1">
//           Select a measurement tool and click on the image to create measurements
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-full">
//       <div className="flex-1 overflow-y-auto">
//         {measurements.map((measurement) => (
//           <div
//             key={measurement.id}
//             className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-muted/50 transition-colors"
//           >
//             <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary">
//               {toolIcons[measurement.toolType] || <Ruler className="w-3 h-3" />}
//             </div>
//             <div className="flex-1 min-w-0">
//               <div className="text-sm font-medium">
//                 {measurement.label || measurement.toolType}
//               </div>
//               <div className="text-xs text-muted-foreground">
//                 {formatMeasurementValue(measurement)}
//               </div>
//               <div className="text-xs text-muted-foreground font-mono">
//                 Image {measurement.imageIndex + 1}
//               </div>
//             </div>
//             <Button
//               variant="ghost"
//               size="icon"
//               className="w-6 h-6 text-muted-foreground hover:text-destructive"
//               onClick={() => removeMeasurement(measurement.id)}
//             >
//               <Trash2 className="w-3 h-3" />
//             </Button>
//           </div>
//         ))}
//       </div>

//       {measurements.length > 0 && (
//         <div className="p-3 border-t border-border">
//           <Button variant="outline" size="sm" className="w-full" onClick={exportMeasurements}>
//             <Download className="w-4 h-4 mr-2" />
//             Export CSV
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// }
