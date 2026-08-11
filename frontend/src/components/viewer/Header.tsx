// import { useState } from 'react';
// import { useDicomStore } from '@/stores/dicomStore';
// import { useAuthStore } from '@/stores/authStore';
// import { Button } from '@/components/ui/button';
// import {
//   Upload,
//   User,
//   Maximize2,
//   PanelLeftClose,
//   PanelRightClose,
//   PanelLeft,
//   PanelRight,
//   FileImage,
//   Layers3,
//   FileText,
//   ChevronDown,
//   ClipboardList,
//   Camera,
//   Star,
//   Table,
//   UserCircle,
//   Calendar,
//   CreditCard,
//   FileDigit
// } from 'lucide-react';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from '@/components/ui/dialog';

// interface HeaderProps {
//   onOpenMPR: () => void;
//   onOpenReport?: () => void;
//   onSnapshot?: () => void;
// }

// export function Header({ onOpenMPR, onOpenReport, onSnapshot }: HeaderProps) {
//   const {
//     studies,
//     selectedStudyUID,
//     selectedSeriesUID,
//     setShowUploadScreen,
//     leftPanelOpen,
//     rightPanelOpen,
//     toggleLeftPanel,
//     toggleRightPanel
//   } = useDicomStore();

//   const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

//   const { user } = useAuthStore();
//   const isRadiologist = user?.role === 'radiologist';

//   const selectedStudy = studies.find(s => s.studyInstanceUID === selectedStudyUID);
//   const selectedSeries = selectedStudy?.series.find(s => s.seriesInstanceUID === selectedSeriesUID);
//   const canOpenMPR = selectedSeries && selectedSeries.instances.length >= 3;

//   return (
//     <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
//       {/* Left Section */}
//       <div className="flex items-center gap-4">
//         <div className="flex items-center gap-2">
//           <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
//             <FileImage className="w-5 h-5 text-primary" />
//           </div>
//           <span className="font-semibold text-foreground">DICOM Viewer</span>
//         </div>

//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={toggleLeftPanel}
//           className="text-muted-foreground hover:text-foreground"
//         >
//           {leftPanelOpen ? (
//             <PanelLeftClose className="w-4 h-4" />
//           ) : (
//             <PanelLeft className="w-4 h-4" />
//           )}
//         </Button>

//       </div>

//       <div className="flex-1" />

//       {/* Right Section */}
//       <div className="flex items-center gap-2">
//         {/* Quick Report Actions */}
//         {isRadiologist && onSnapshot && (
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="gap-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-medium px-2"
//                 disabled={!selectedStudyUID}
//               >
//                 <ClipboardList className="w-4 h-4" />
//                 <span className="text-xs">Actions</span>
//                 <ChevronDown className="w-3 h-3 opacity-50" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end" className="w-56">
//               <DropdownMenuLabel>Report Tools</DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onClick={onSnapshot} className="gap-2 cursor-pointer">
//                 <Camera className="w-4 h-4" />
//                 <span>Capture Snapshot</span>
//               </DropdownMenuItem>
//               <DropdownMenuItem disabled className="gap-2 opacity-50 cursor-not-allowed">
//                 <Star className="w-4 h-4" />
//                 <span>Mark Key Image</span>
//               </DropdownMenuItem>
//               <DropdownMenuItem disabled className="gap-2 opacity-50 cursor-not-allowed">
//                 <Table className="w-4 h-4" />
//                 <span>Export Measurements</span>
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         )}

//         {/* Report Button - Only for Radiologists */}
//         {isRadiologist && onOpenReport && (
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={onOpenReport}
//             disabled={!selectedStudyUID}
//             className="text-indigo-600 border-indigo-600/30 hover:bg-indigo-600/10"
//           >
//             <FileText className="w-4 h-4 mr-2" />
//             Report
//           </Button>
//         )}

//         <Button
//           variant="outline"
//           size="sm"
//           onClick={onOpenMPR}
//           disabled={!canOpenMPR}
//           className="text-primary border-primary/30 hover:bg-primary/10"
//         >
//           <Layers3 className="w-4 h-4 mr-2" />
//           MPR
//         </Button>

//         <Button
//           variant="ghost"
//           size="sm"
//           onClick={toggleRightPanel}
//           className="text-muted-foreground hover:text-foreground"
//         >
//           {rightPanelOpen ? (
//             <PanelRightClose className="w-4 h-4" />
//           ) : (
//             <PanelRight className="w-4 h-4" />
//           )}
//         </Button>

//         <Button
//           variant="ghost"
//           size="icon"
//           className="text-muted-foreground hover:text-foreground"
//           onClick={() => setIsPatientModalOpen(true)}
//         >
//           <User className="w-5 h-5" />
//         </Button>
//       </div>

//       {/* Patient Details Modal */}
//       <Dialog open={isPatientModalOpen} onOpenChange={setIsPatientModalOpen}>
//         <DialogContent className="sm:max-w-[500px] bg-card border border-border shadow-2xl">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-xl font-bold">
//               <UserCircle className="w-6 h-6 text-primary" />
//               Patient Information
//             </DialogTitle>
//             <DialogDescription>
//               Detailed demographic and study information for the current case.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="grid gap-6 py-4">
//             {selectedStudy ? (
//               <div className="space-y-4">
//                 <div className="grid grid-cols-2 gap-4">
//                   <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
//                       <UserCircle className="w-3 h-3" />
//                       Name
//                     </div>
//                     <div className="text-sm font-bold truncate">
//                       {selectedStudy.patientName}
//                     </div>
//                   </div>
//                   <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
//                       <CreditCard className="w-3 h-3" />
//                       Patient ID
//                     </div>
//                     <div className="text-sm font-mono truncate">
//                       {selectedStudy.patientID}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
//                   <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
//                     <FileDigit className="w-3 h-3" />
//                     Study Description
//                   </div>
//                   <div className="text-sm font-medium">
//                     {selectedStudy.studyDescription || selectedStudy.modality || "N/A"}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-4">
//                   <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
//                       <Calendar className="w-3 h-3" />
//                       Study Date
//                     </div>
//                     <div className="text-sm font-medium">
//                       {selectedStudy.studyDate || "N/A"}
//                     </div>
//                   </div>
//                   <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
//                       <Layers3 className="w-3 h-3" />
//                       Modality
//                     </div>
//                     <div className="text-sm font-bold text-primary">
//                       {selectedStudy.modality}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-center text-primary italic">
//                   Instance UID: {selectedStudy.studyInstanceUID}
//                 </div>
//               </div>
//             ) : (
//               <div className="py-12 text-center text-muted-foreground italic">
//                 No active study selected. Load a DICOM file to see details.
//               </div>
//             )}
//           </div>

//           <div className="flex justify-end pt-2">
//             <Button onClick={() => setIsPatientModalOpen(false)}>Close</Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </header>
//   );
// }

