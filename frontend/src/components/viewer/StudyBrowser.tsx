// import { useDicomStore } from '@/stores/dicomStore';
// import { cn } from '@/lib/utils';
// import {
//   FolderOpen,
//   ChevronDown,
//   ChevronRight,
// } from 'lucide-react';
// import { displaySetService } from '@/services/DisplaySetService';
// import { Thumbnail } from './Thumbnail';
// import { useState, useEffect, useMemo } from 'react';

// import { observer } from 'mobx-react-lite';

// interface StudyBrowserProps {
//   onSelectSeries?: (seriesUID: string) => void;
// }

// export const StudyBrowser = observer(({ onSelectSeries }: StudyBrowserProps) => {
//   const {
//     studies,
//     selectedStudyUID,
//     selectedSeriesUID,
//     selectStudy,
//     selectSeries,
//     loadSeriesToViewport,
//     activeViewportId
//   } = useDicomStore();

//   const [expandedStudies, setExpandedStudies] = useState<Set<string>>(new Set());

//   // Auto-expand first study when studies are loaded
//   useEffect(() => {
//     if (studies.length > 0 && expandedStudies.size === 0) {
//       setExpandedStudies(new Set([studies[0].studyInstanceUID]));
//     }
//   }, [studies, expandedStudies.size]);

//   // Side effect: Ensure DisplaySets exist and generate thumbnails when studies load
//   useEffect(() => {
//     studies.forEach(s => {
//       displaySetService.makeDisplaySetsForStudy(s.studyInstanceUID);
//       displaySetService.generateThumbnails(s.studyInstanceUID);
//     });
//   }, [studies]);

//   // Reactive DisplaySets mapping for rendering
//   const studyDisplaySets = useMemo(() => {
//     const mapping: Record<string, any[]> = {};
//     studies.forEach(s => {
//       mapping[s.studyInstanceUID] = displaySetService.getDisplaySetsForStudy(s.studyInstanceUID);
//     });
//     return mapping;
//   }, [studies, displaySetService.displaySets.size, displaySetService.thumbnailImageSrcMap.size]);

//   const toggleStudyExpand = (studyUID: string) => {
//     const newExpanded = new Set(expandedStudies);
//     if (newExpanded.has(studyUID)) {
//       newExpanded.delete(studyUID);
//     } else {
//       newExpanded.add(studyUID);
//     }
//     setExpandedStudies(newExpanded);
//   };

//   const handleSeriesClick = (studyUID: string, displaySetUID: string) => {
//     if (onSelectSeries) {
//       onSelectSeries(displaySetUID);
//       return;
//     }

//     selectSeries(displaySetUID);
//     if (activeViewportId) {
//       loadSeriesToViewport(activeViewportId, studyUID, displaySetUID);
//     }
//   };

//   const formatDate = (dateStr: string): string => {
//     if (!dateStr || dateStr.length !== 8) return dateStr || 'Unknown';
//     return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
//   };

//   if (studies.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center h-full p-6 text-center">
//         <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
//           <FolderOpen className="w-8 h-8 text-muted-foreground" />
//         </div>
//         <p className="text-muted-foreground text-sm">No studies loaded</p>
//         <p className="text-muted-foreground text-xs mt-1">Upload DICOM files to begin</p>
//       </div>
//     );
//   }

//   return (
//     <div className="h-full overflow-y-auto custom-scrollbar">
//       {studies.map((study) => {
//         const isExpanded = expandedStudies.has(study.studyInstanceUID);
//         const isSelected = selectedStudyUID === study.studyInstanceUID;
//         const displaySets = studyDisplaySets[study.studyInstanceUID] || [];

//         return (
//           <div key={study.studyInstanceUID} className="border-b border-border/50">
//             {/* Study Header */}
//             <div
//               className={cn(
//                 "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors sticky top-0 bg-background z-10",
//                 isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/50 border-l-2 border-transparent"
//               )}
//               onClick={() => {
//                 selectStudy(study.studyInstanceUID);
//                 toggleStudyExpand(study.studyInstanceUID);
//               }}
//             >
//               {isExpanded ? (
//                 <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
//               ) : (
//                 <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
//               )}

//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-2">
//                   <span className="text-[10px] font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded uppercase">
//                     {study.modality}
//                   </span>
//                   <span className="text-sm font-semibold truncate">{study.patientName}</span>
//                 </div>
//                 <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
//                   <span className="font-mono">{formatDate(study.studyDate)}</span>
//                   <span className="truncate">
//                     {study.studyDescription || 'No description'}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Series/DisplaySet List */}
//             {isExpanded && (
//               <div className="bg-muted/5 animate-fade-in flex flex-col pt-1 pb-2">
//                 {displaySets.map((ds) => {
//                   const isDSSelected = selectedSeriesUID === ds.displaySetInstanceUID;

//                   return (
//                     <Thumbnail
//                       key={ds.displaySetInstanceUID}
//                       displaySet={ds}
//                       isSelected={isDSSelected}
//                       onClick={() => handleSeriesClick(study.studyInstanceUID, ds.displaySetInstanceUID)}
//                     />
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// });
