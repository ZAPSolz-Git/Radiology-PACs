// import { useRef, useEffect, useCallback } from 'react';
// import type { Measurement, ViewportState, DicomInstance } from '@/types/dicom';
// import { ImageRenderingService } from '@/services/ImageRenderingService';

// interface MeasurementOverlayProps {
//   viewport: ViewportState;
//   instance: DicomInstance | undefined;
//   measurements: Measurement[];
//   measurementPoints: { x: number; y: number }[];
//   activeTool: string;
//   currentMousePos: { x: number; y: number } | null;
//   containerSize: { width: number; height: number };
// }

// // Color scheme for measurements
// const MEASUREMENT_COLORS = {
//   Length: '#00ff00',
//   Angle: '#ffff00',
//   RectangleROI: '#00ffff',
//   EllipticalROI: '#ff00ff',
//   Probe: '#ffa500',
//   Bidirectional: '#ff6600',
//   Crosshairs: '#ff0000',
// };

// export function MeasurementOverlay({
//   viewport,
//   instance,
//   measurements,
//   measurementPoints,
//   activeTool,
//   currentMousePos,
//   containerSize,
// }: MeasurementOverlayProps) {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   // Convert image coordinates to screen coordinates
//   const imageToScreenCoords = useCallback(
//     (imageX: number, imageY: number): { x: number; y: number } | null => {
//       if (!instance) return null;

//       const { width, height } = containerSize;
//       const centerX = width / 2;
//       const centerY = height / 2;

//       // Calculate scaled dimensions
//       const imageAspect = instance.columns / instance.rows;
//       const canvasAspect = width / height;

//       let drawWidth: number, drawHeight: number;
//       if (imageAspect > canvasAspect) {
//         drawWidth = width;
//         drawHeight = drawWidth / imageAspect;
//       } else {
//         drawHeight = height;
//         drawWidth = drawHeight * imageAspect;
//       }

//       // Convert image coords to normalized coords (0-1)
//       const normX = imageX / instance.columns;
//       const normY = imageY / instance.rows;

//       // Convert to draw space
//       let x = (normX - 0.5) * drawWidth;
//       let y = (normY - 0.5) * drawHeight;

//       // Apply viewport transformations
//       x *= viewport.zoom;
//       y *= viewport.zoom;

//       // Apply rotation
//       const rad = (viewport.rotation * Math.PI) / 180;
//       const rotX = x * Math.cos(rad) - y * Math.sin(rad);
//       const rotY = x * Math.sin(rad) + y * Math.cos(rad);

//       // Apply flip
//       const flipX = viewport.flipH ? -1 : 1;
//       const flipY = viewport.flipV ? -1 : 1;

//       // Final screen position
//       const screenX = centerX + rotX * flipX + viewport.pan.x;
//       const screenY = centerY + rotY * flipY + viewport.pan.y;

//       return { x: screenX, y: screenY };
//     },
//     [viewport, instance, containerSize]
//   );

//   // Draw all measurements and in-progress annotations
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     // Set canvas size
//     canvas.width = containerSize.width;
//     canvas.height = containerSize.height;

//     // Clear canvas
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     // Draw completed measurements for this viewport
//     const viewportMeasurements = measurements.filter(
//       (m) => m.seriesUID === viewport.seriesUID && m.imageIndex === viewport.currentImageIndex
//     );

//     viewportMeasurements.forEach((measurement) => {
//       drawMeasurement(ctx, measurement);
//     });

//     // Draw in-progress measurement
//     if (measurementPoints.length > 0 && instance) {
//       drawInProgressMeasurement(ctx);
//     }
//   }, [
//     measurements,
//     measurementPoints,
//     activeTool,
//     currentMousePos,
//     viewport,
//     instance,
//     containerSize,
//   ]);

//   const drawMeasurement = (ctx: CanvasRenderingContext2D, measurement: Measurement) => {
//     const color = MEASUREMENT_COLORS[measurement.toolType as keyof typeof MEASUREMENT_COLORS] || '#ffffff';
//     ctx.strokeStyle = color;
//     ctx.fillStyle = color;
//     ctx.lineWidth = 2;
//     ctx.font = 'bold 12px Inter, system-ui, sans-serif';

//     const handles = measurement.data.handles;
//     const screenHandles = handles.map((h) => imageToScreenCoords(h.x, h.y)).filter(Boolean) as { x: number; y: number }[];

//     if (screenHandles.length === 0) return;

//     switch (measurement.toolType) {
//       case 'Length':
//         if (screenHandles.length >= 2) {
//           drawLengthAnnotation(ctx, screenHandles, measurement.data.value, measurement.data.unit, color);
//         }
//         break;

//       case 'Angle':
//         if (screenHandles.length >= 3) {
//           drawAngleAnnotation(ctx, screenHandles, measurement.data.value, color);
//         }
//         break;

//       case 'RectangleROI':
//         if (screenHandles.length >= 2) {
//           drawRectangleROI(ctx, screenHandles, measurement.data.stats, color);
//         }
//         break;

//       case 'EllipticalROI':
//         if (screenHandles.length >= 2) {
//           drawEllipseROI(ctx, screenHandles, measurement.data.stats, color);
//         }
//         break;

//       case 'Probe':
//         if (screenHandles.length >= 1) {
//           drawProbe(ctx, screenHandles[0], measurement.data.value, measurement.data.unit, color);
//         }
//         break;

//       case 'Bidirectional':
//         if (screenHandles.length >= 2) {
//           drawBidirectional(ctx, screenHandles, measurement.data.value, measurement.data.unit, color);
//         }
//         break;
//     }
//   };

//   const drawInProgressMeasurement = (ctx: CanvasRenderingContext2D) => {
//     const color = MEASUREMENT_COLORS[activeTool as keyof typeof MEASUREMENT_COLORS] || '#ffffff';
//     ctx.strokeStyle = color;
//     ctx.fillStyle = color;
//     ctx.lineWidth = 2;
//     ctx.setLineDash([5, 5]);

//     const screenPoints = measurementPoints
//       .map((p) => imageToScreenCoords(p.x, p.y))
//       .filter(Boolean) as { x: number; y: number }[];

//     if (screenPoints.length === 0) return;

//     // Add current mouse position for preview
//     const mouseScreen = currentMousePos;

//     switch (activeTool) {
//       case 'Length':
//         if (screenPoints.length >= 1 && mouseScreen) {
//           ctx.beginPath();
//           ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
//           ctx.lineTo(mouseScreen.x, mouseScreen.y);
//           ctx.stroke();
//           drawHandle(ctx, screenPoints[0], color);
//           drawHandle(ctx, mouseScreen, color);
          
//           // Show live distance
//           if (instance && measurementPoints.length >= 1) {
//             const distance = ImageRenderingService.calculateDistance(
//               measurementPoints[0],
//               { x: mouseScreen.x, y: mouseScreen.y }, // This is screen coords, need to convert back
//               instance.pixelSpacing
//             );
//             const midX = (screenPoints[0].x + mouseScreen.x) / 2;
//             const midY = (screenPoints[0].y + mouseScreen.y) / 2;
//             drawLabel(ctx, `${distance.toFixed(1)} mm`, midX, midY - 10, color);
//           }
//         }
//         break;

//       case 'Angle':
//         if (screenPoints.length >= 1) {
//           ctx.beginPath();
//           ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
//           if (screenPoints.length >= 2) {
//             ctx.lineTo(screenPoints[1].x, screenPoints[1].y);
//             if (mouseScreen) {
//               ctx.lineTo(mouseScreen.x, mouseScreen.y);
//             }
//           } else if (mouseScreen) {
//             ctx.lineTo(mouseScreen.x, mouseScreen.y);
//           }
//           ctx.stroke();
//           screenPoints.forEach((p) => drawHandle(ctx, p, color));
//           if (mouseScreen) drawHandle(ctx, mouseScreen, color);
//         }
//         break;

//       case 'RectangleROI':
//         if (screenPoints.length >= 1 && mouseScreen) {
//           const x = Math.min(screenPoints[0].x, mouseScreen.x);
//           const y = Math.min(screenPoints[0].y, mouseScreen.y);
//           const w = Math.abs(mouseScreen.x - screenPoints[0].x);
//           const h = Math.abs(mouseScreen.y - screenPoints[0].y);
//           ctx.strokeRect(x, y, w, h);
//           drawHandle(ctx, screenPoints[0], color);
//           drawHandle(ctx, mouseScreen, color);
//         }
//         break;

//       case 'EllipticalROI':
//         if (screenPoints.length >= 1 && mouseScreen) {
//           const cx = (screenPoints[0].x + mouseScreen.x) / 2;
//           const cy = (screenPoints[0].y + mouseScreen.y) / 2;
//           const rx = Math.abs(mouseScreen.x - screenPoints[0].x) / 2;
//           const ry = Math.abs(mouseScreen.y - screenPoints[0].y) / 2;
//           ctx.beginPath();
//           ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
//           ctx.stroke();
//           drawHandle(ctx, screenPoints[0], color);
//           drawHandle(ctx, mouseScreen, color);
//         }
//         break;
//     }

//     ctx.setLineDash([]);
//   };

//   // Drawing helper functions
//   const drawLengthAnnotation = (
//     ctx: CanvasRenderingContext2D,
//     handles: { x: number; y: number }[],
//     value: number | undefined,
//     unit: string | undefined,
//     color: string
//   ) => {
//     const [p1, p2] = handles;

//     // Draw line
//     ctx.beginPath();
//     ctx.moveTo(p1.x, p1.y);
//     ctx.lineTo(p2.x, p2.y);
//     ctx.stroke();

//     // Draw handles
//     drawHandle(ctx, p1, color);
//     drawHandle(ctx, p2, color);

//     // Draw perpendicular end markers
//     const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
//     const perpAngle = angle + Math.PI / 2;
//     const markerLen = 8;

//     ctx.beginPath();
//     ctx.moveTo(p1.x + Math.cos(perpAngle) * markerLen, p1.y + Math.sin(perpAngle) * markerLen);
//     ctx.lineTo(p1.x - Math.cos(perpAngle) * markerLen, p1.y - Math.sin(perpAngle) * markerLen);
//     ctx.stroke();

//     ctx.beginPath();
//     ctx.moveTo(p2.x + Math.cos(perpAngle) * markerLen, p2.y + Math.sin(perpAngle) * markerLen);
//     ctx.lineTo(p2.x - Math.cos(perpAngle) * markerLen, p2.y - Math.sin(perpAngle) * markerLen);
//     ctx.stroke();

//     // Draw label
//     if (value !== undefined) {
//       const midX = (p1.x + p2.x) / 2;
//       const midY = (p1.y + p2.y) / 2;
//       drawLabel(ctx, `${value.toFixed(2)} ${unit || 'mm'}`, midX, midY - 12, color);
//     }
//   };

//   const drawAngleAnnotation = (
//     ctx: CanvasRenderingContext2D,
//     handles: { x: number; y: number }[],
//     value: number | undefined,
//     color: string
//   ) => {
//     const [p1, vertex, p2] = handles;

//     // Draw lines
//     ctx.beginPath();
//     ctx.moveTo(p1.x, p1.y);
//     ctx.lineTo(vertex.x, vertex.y);
//     ctx.lineTo(p2.x, p2.y);
//     ctx.stroke();

//     // Draw handles
//     drawHandle(ctx, p1, color);
//     drawHandle(ctx, vertex, color);
//     drawHandle(ctx, p2, color);

//     // Draw arc at vertex
//     const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
//     const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
//     const arcRadius = 25;

//     ctx.beginPath();
//     ctx.arc(vertex.x, vertex.y, arcRadius, angle1, angle2, angle1 > angle2);
//     ctx.stroke();

//     // Draw label
//     if (value !== undefined) {
//       const labelAngle = (angle1 + angle2) / 2;
//       const labelX = vertex.x + Math.cos(labelAngle) * (arcRadius + 15);
//       const labelY = vertex.y + Math.sin(labelAngle) * (arcRadius + 15);
//       drawLabel(ctx, `${value.toFixed(1)}°`, labelX, labelY, color);
//     }
//   };

//   const drawRectangleROI = (
//     ctx: CanvasRenderingContext2D,
//     handles: { x: number; y: number }[],
//     stats: { mean: number; stdDev: number; area: number } | undefined,
//     color: string
//   ) => {
//     const [p1, p2] = handles;
//     const x = Math.min(p1.x, p2.x);
//     const y = Math.min(p1.y, p2.y);
//     const w = Math.abs(p2.x - p1.x);
//     const h = Math.abs(p2.y - p1.y);

//     // Draw rectangle
//     ctx.strokeRect(x, y, w, h);

//     // Draw handles at corners
//     drawHandle(ctx, p1, color);
//     drawHandle(ctx, p2, color);
//     drawHandle(ctx, { x: p1.x, y: p2.y }, color);
//     drawHandle(ctx, { x: p2.x, y: p1.y }, color);

//     // Draw stats
//     if (stats) {
//       const labelY = y - 5;
//       drawLabel(
//         ctx,
//         `Mean: ${stats.mean.toFixed(1)} HU | SD: ${stats.stdDev.toFixed(1)} | Area: ${stats.area.toFixed(1)} mm²`,
//         x + w / 2,
//         labelY,
//         color
//       );
//     }
//   };

//   const drawEllipseROI = (
//     ctx: CanvasRenderingContext2D,
//     handles: { x: number; y: number }[],
//     stats: { mean: number; stdDev: number; area: number } | undefined,
//     color: string
//   ) => {
//     const [p1, p2] = handles;
//     const cx = (p1.x + p2.x) / 2;
//     const cy = (p1.y + p2.y) / 2;
//     const rx = Math.abs(p2.x - p1.x) / 2;
//     const ry = Math.abs(p2.y - p1.y) / 2;

//     // Draw ellipse
//     ctx.beginPath();
//     ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
//     ctx.stroke();

//     // Draw handles
//     drawHandle(ctx, p1, color);
//     drawHandle(ctx, p2, color);

//     // Draw stats
//     if (stats) {
//       drawLabel(
//         ctx,
//         `Mean: ${stats.mean.toFixed(1)} HU | SD: ${stats.stdDev.toFixed(1)} | Area: ${stats.area.toFixed(1)} mm²`,
//         cx,
//         cy - ry - 12,
//         color
//       );
//     }
//   };

//   const drawProbe = (
//     ctx: CanvasRenderingContext2D,
//     point: { x: number; y: number },
//     value: number | undefined,
//     unit: string | undefined,
//     color: string
//   ) => {
//     // Draw crosshair
//     const size = 10;
//     ctx.beginPath();
//     ctx.moveTo(point.x - size, point.y);
//     ctx.lineTo(point.x + size, point.y);
//     ctx.moveTo(point.x, point.y - size);
//     ctx.lineTo(point.x, point.y + size);
//     ctx.stroke();

//     // Draw circle
//     ctx.beginPath();
//     ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
//     ctx.fill();

//     // Draw value label
//     if (value !== undefined) {
//       drawLabel(ctx, `${value.toFixed(0)} ${unit || 'HU'}`, point.x + 15, point.y - 10, color);
//     }
//   };

//   const drawBidirectional = (
//     ctx: CanvasRenderingContext2D,
//     handles: { x: number; y: number }[],
//     value: number | undefined,
//     unit: string | undefined,
//     color: string
//   ) => {
//     if (handles.length < 2) return;
//     const [p1, p2] = handles;

//     // Draw main line
//     ctx.beginPath();
//     ctx.moveTo(p1.x, p1.y);
//     ctx.lineTo(p2.x, p2.y);
//     ctx.stroke();

//     // Draw perpendicular line at center
//     const midX = (p1.x + p2.x) / 2;
//     const midY = (p1.y + p2.y) / 2;
//     const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
//     const perpLen = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) * 0.4;

//     ctx.beginPath();
//     ctx.moveTo(midX - Math.cos(angle) * perpLen / 2, midY - Math.sin(angle) * perpLen / 2);
//     ctx.lineTo(midX + Math.cos(angle) * perpLen / 2, midY + Math.sin(angle) * perpLen / 2);
//     ctx.stroke();

//     // Draw handles
//     drawHandle(ctx, p1, color);
//     drawHandle(ctx, p2, color);

//     if (value !== undefined) {
//       drawLabel(ctx, `${value.toFixed(2)} ${unit || 'mm'}`, midX, midY - 15, color);
//     }
//   };

//   const drawHandle = (ctx: CanvasRenderingContext2D, point: { x: number; y: number }, color: string) => {
//     ctx.fillStyle = color;
//     ctx.beginPath();
//     ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
//     ctx.fill();

//     // White outline for visibility
//     ctx.strokeStyle = '#ffffff';
//     ctx.lineWidth = 1;
//     ctx.stroke();
//     ctx.strokeStyle = color;
//     ctx.lineWidth = 2;
//   };

//   const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) => {
//     // Background for readability
//     ctx.font = 'bold 12px Inter, system-ui, sans-serif';
//     const metrics = ctx.measureText(text);
//     const padding = 4;
//     const bgWidth = metrics.width + padding * 2;
//     const bgHeight = 16;

//     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
//     ctx.fillRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);

//     // Text
//     ctx.fillStyle = color;
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(text, x, y);
//   };

//   return (
//     <canvas
//       ref={canvasRef}
//       className="absolute inset-0 pointer-events-none"
//       style={{ zIndex: 10 }}
//     />
//   );
// }
