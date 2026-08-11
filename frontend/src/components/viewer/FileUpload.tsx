// import { useCallback, useState } from 'react';
// import { useDicomStore } from '@/stores/dicomStore';
// import { DicomParserService } from '@/services/DicomParserService';
// import { StorageService } from '@/services/StorageService';
// import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
// import { cn } from '@/lib/utils';
// import {
//   Upload,
//   FileImage,
//   FolderOpen,
//   X,
//   AlertCircle,
//   FileStack,
//   Shield
// } from 'lucide-react';
// import type { ParseProgress } from '@/types/dicom';

// export function FileUpload() {
//   const {
//     addStudy,
//     setStudies,
//     setShowUploadScreen,
//     isLoading,
//     setLoading,
//     uploadProgress,
//     setUploadProgress,
//     studies
//   } = useDicomStore();

//   const [isDragOver, setIsDragOver] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [parseStatus, setParseStatus] = useState<string>('');

//   const handleProgress = useCallback((progress: ParseProgress) => {
//     setUploadProgress((progress.parsed / progress.total) * 100);
//     setParseStatus(`${progress.stage}: ${progress.currentFile || ''} (${progress.parsed}/${progress.total})`);

//     if (progress.error) {
//       setError(progress.error);
//     }
//   }, [setUploadProgress]);

//   const processFiles = useCallback(async (files: File[]) => {
//     setError(null);
//     setLoading(true);
//     setUploadProgress(0);
//     setParseStatus('Reading files...');

//     try {
//       // Filter for potential DICOM files
//       const potentialDicomFiles = files.filter(f => {
//         const name = f.name.toLowerCase();
//         // DICOM files may have .dcm extension, no extension, or various other patterns
//         return name.endsWith('.dcm') ||
//           name.endsWith('.dicom') ||
//           name.endsWith('.ima') ||
//           !name.includes('.') || // No extension
//           /^\d+$/.test(f.name); // Numeric filename (common in DICOM)
//       });

//       if (potentialDicomFiles.length === 0) {
//         setError('No DICOM files found. Please upload .dcm files or DICOM folders.');
//         setLoading(false);
//         return;
//       }

//       const parsedStudies = await DicomParserService.parseFiles(potentialDicomFiles, handleProgress);

//       if (parsedStudies.length === 0) {
//         setError('No valid DICOM files could be parsed. Please check your files.');
//         setLoading(false);
//         return;
//       }

//       // Save to storage
//       await StorageService.saveStudies([...studies, ...parsedStudies]);

//       // Add to store
//       for (const study of parsedStudies) {
//         addStudy(study);
//       }

//       setParseStatus(`Successfully loaded ${parsedStudies.length} studies`);
//     } catch (err) {
//       console.error('Error processing files:', err);
//       setError(`Error processing files: ${err instanceof Error ? err.message : 'Unknown error'}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [addStudy, handleProgress, setLoading, setUploadProgress, studies]);

//   const handleDrop = useCallback(async (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragOver(false);

//     const items = e.dataTransfer.items;
//     const files: File[] = [];
//     let totalFilesFound = 0;

//     // Helper to read all entries from a directory reader
//     const readAllEntries = async (dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
//       const entries: FileSystemEntry[] = [];
//       try {
//         let readEntries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
//           dirReader.readEntries((results) => resolve(results), (err) => reject(err));
//         });

//         while (readEntries.length > 0) {
//           entries.push(...readEntries);
//           readEntries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
//             dirReader.readEntries((results) => resolve(results), (err) => reject(err));
//           });
//         }
//       } catch (err) {
//         console.warn("Error reading folder entries:", err);
//       }
//       return entries;
//     };

//     // Handle both files and folders recursively (Sequential to prevent browser limits)
//     const traverseFileTree = async (item: FileSystemEntry): Promise<void> => {
//       try {
//         if (item.isFile) {
//           await new Promise<void>((resolve) => {
//             (item as FileSystemFileEntry).file((file) => {
//               files.push(file);
//               totalFilesFound++;
//               if (totalFilesFound % 50 === 0) {
//                 setParseStatus(`Found ${totalFilesFound} files...`);
//               }
//               resolve();
//             });
//           });
//         } else if (item.isDirectory) {
//           const dirReader = (item as FileSystemDirectoryEntry).createReader();
//           const entries = await readAllEntries(dirReader);

//           // Process sequentially
//           for (const entry of entries) {
//             await traverseFileTree(entry);
//           }
//         }
//       } catch (err) {
//         console.warn("Error traversing item:", item.name, err);
//       }
//     };

//     setLoading(true);
//     setParseStatus("Scanning folders...");

//     // Process dropped items
//     const rootPromises: Promise<void>[] = [];
//     for (let i = 0; i < items.length; i++) {
//       const item = items[i];
//       const entry = item.webkitGetAsEntry();
//       if (entry) {
//         rootPromises.push(traverseFileTree(entry));
//       }
//     }

//     await Promise.all(rootPromises);

//     if (files.length > 0) {
//       setParseStatus(`Processing ${files.length} files...`);
//       await processFiles(files);
//     } else {
//       // Fallback to regular file list
//       const fileList = Array.from(e.dataTransfer.files);
//       if (fileList.length > 0) {
//         await processFiles(fileList);
//       } else {
//         setLoading(false);
//         setError("No files found in drop.");
//       }
//     }
//   }, [processFiles, setLoading, setParseStatus]);

//   const handleDragOver = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragOver(true);
//   }, []);

//   const handleDragLeave = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragOver(false);
//   }, []);

//   const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files;
//     if (!files || files.length === 0) return;
//     await processFiles(Array.from(files));
//     e.target.value = ''; // Reset input
//   }, [processFiles]);

//   return (
//     <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-8">
//       {/* Background Pattern */}
//       <div className="absolute inset-0 medical-glow opacity-30" />

//       {/* Close button if studies exist */}
//       {studies.length > 0 && (
//         <Button
//           variant="ghost"
//           size="icon"
//           className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
//           onClick={() => setShowUploadScreen(false)}
//         >
//           <X className="w-5 h-5" />
//         </Button>
//       )}

//       <div className="relative z-10 w-full max-w-2xl">
//         {/* Header */}
//         <div className="text-center mb-8">

//           <h1 className="text-3xl font-bold mb-2">DICOM Medical Image Viewer</h1>
//           <p className="text-muted-foreground">
//             Upload DICOM files (.dcm) or folders to view medical images
//           </p>
//         </div>

//         {/* Upload Area */}
//         <div
//           className={cn(
//             "dicom-drop-zone p-12 text-center transition-all duration-300",
//             isDragOver && "dicom-drop-zone-active",
//             isLoading && "pointer-events-none opacity-50"
//           )}
//           onDrop={handleDrop}
//           onDragOver={handleDragOver}
//           onDragLeave={handleDragLeave}
//         >
//           {isLoading ? (
//             <div className="space-y-4">
//               <FileStack className="w-12 h-12 text-primary mx-auto animate-pulse" />
//               <div className="space-y-2">
//                 <p className="text-sm font-medium">Processing DICOM files...</p>
//                 <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
//                 <p className="text-xs text-muted-foreground font-mono">{parseStatus}</p>
//               </div>
//             </div>
//           ) : (
//             <>
//               <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
//               <p className="text-lg font-medium mb-2">
//                 Drag & drop DICOM files here
//               </p>
//               <p className="text-sm text-muted-foreground mb-6">
//                 Supports .dcm, .dicom files and DICOM folders (CT, MRI, X-Ray, Ultrasound)
//               </p>

//               <div className="flex items-center justify-center gap-4">
//                 <label>
//                   <input
//                     type="file"
//                     multiple
//                     accept=".dcm,.dicom,.ima,*"
//                     className="hidden"
//                     onChange={handleFileSelect}
//                   />
//                   <Button variant="outline" className="cursor-pointer" asChild>
//                     <span>
//                       <FileImage className="w-4 h-4 mr-2" />
//                       Select Files
//                     </span>
//                   </Button>
//                 </label>

//                 <span className="text-muted-foreground">or</span>

//                 <label>
//                   <input
//                     type="file"
//                     // @ts-ignore - webkitdirectory is a valid attribute
//                     webkitdirectory=""
//                     className="hidden"
//                     onChange={handleFileSelect}
//                   />
//                   <Button variant="outline" className="cursor-pointer" asChild>
//                     <span>
//                       <FolderOpen className="w-4 h-4 mr-2" />
//                       Select Folder
//                     </span>
//                   </Button>
//                 </label>
//               </div>
//             </>
//           )}
//         </div>

//         {/* Error Message */}
//         {error && (
//           <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
//             <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
//             <p className="text-sm text-destructive">{error}</p>
//           </div>
//         )}


//         {/* Supported Formats */}
//         <div className="mt-4 text-center text-xs text-muted-foreground">
//           <p>Supported: CT, MRI, X-Ray, Ultrasound, PET, CR, DX, MG and more</p>
//           <p className="mt-1">Transfer Syntaxes: Explicit VR Little Endian, Implicit VR Little Endian</p>
//         </div>
//       </div>
//     </div>
//   );
// }
