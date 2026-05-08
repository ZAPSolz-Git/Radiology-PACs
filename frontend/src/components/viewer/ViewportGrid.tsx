// import { useDicomStore } from '@/stores/dicomStore';
// import { Viewport } from './Viewport';

// export function ViewportGrid() {
//   const { layout, viewports, maximizedViewportId } = useDicomStore();

//   const activeViewports = viewports.slice(0, layout.rows * layout.cols);
//   const maximizedViewport = maximizedViewportId ? activeViewports.find(v => v.id === maximizedViewportId) : null;

//   return (
//     <div
//       className="flex-1 grid gap-1 p-1 bg-black"
//       style={{
//         gridTemplateRows: maximizedViewport ? '1fr' : `repeat(${layout.rows}, 1fr)`,
//         gridTemplateColumns: maximizedViewport ? '1fr' : `repeat(${layout.cols}, 1fr)`,
//       }}
//     >
//       {maximizedViewport ? (
//         <Viewport key={maximizedViewport.id} viewport={maximizedViewport} />
//       ) : (
//         activeViewports.map((viewport) => (
//           <Viewport key={viewport.id} viewport={viewport} />
//         ))
//       )}
//     </div>
//   );
// }
