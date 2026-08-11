// import React, { useEffect, useState } from 'react';
// import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
// import { StudyLoaderService } from '../../services/StudyLoaderService';
// import { useDicomStore } from '../../stores/dicomStore';
// import DicomViewerLayout from './DicomViewerLayout'; // We will rename DicomViewer to this
// import { Loader2 } from 'lucide-react';

// export const ViewerRoute: React.FC = () => {
//     const [searchParams] = useSearchParams();
//     const studyId = searchParams.get('studyId');
//     const navigate = useNavigate();

//     // Local state for this specific load attempt
//     const [error, setError] = useState<string | null>(null);
//     const [isInitialized, setIsInitialized] = useState(false);
//     const [loadingMessage, setLoadingMessage] = useState("Initializing DICOM Study...");

//     // Global store state
//     const { isLoading, studies } = useDicomStore();

//     useEffect(() => {
//         let isMounted = true;

//         const load = async () => {
//             if (!studyId) {
//                 setError("No Study ID provided in URL");
//                 return;
//             }

//             try {
//                 console.log(`[ViewerRoute] Initializing study: ${studyId}`);
//                 setIsInitialized(false);
//                 setError(null);

//                 // Trigger the loader service with progress callback
//                 await StudyLoaderService.loadStudyFromServer(studyId, (msg) => {
//                     if (isMounted) setLoadingMessage(msg);
//                 });

//                 if (isMounted) {
//                     setIsInitialized(true);
//                 }
//             } catch (err: any) {
//                 console.error("[ViewerRoute] Load failed:", err);
//                 if (isMounted) {
//                     setError(err.message || "Failed to load study");
//                 }
//             }
//         };

//         load();

//         return () => {
//             isMounted = false;
//         };
//     }, [studyId]);

//     // 1. Error State
//     if (error) {
//         return (
//             <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white space-y-4">
//                 <h2 className="text-2xl font-bold text-red-500">Error Loading Study</h2>
//                 <p className="text-gray-400">{error}</p>
//                 <button
//                     onClick={() => navigate('/dashboard/technician')}
//                     className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 font-bold uppercase tracking-widest text-xs"
//                 >
//                     Back to Dashboard
//                 </button>
//             </div>
//         );
//     }

//     // 2. Loading State (Global or Local)
//     if (isLoading || !isInitialized) {
//         return (
//             <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white space-y-4">
//                 <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
//                 <div className="text-center space-y-1">
//                     <p className="text-blue-400 font-black uppercase tracking-widest text-sm">{loadingMessage}</p>
//                     <p className="text-[10px] text-gray-500 font-mono">{studyId}</p>
//                 </div>
//             </div>
//         );
//     }

//     // 3. Not Found (Loaded but empty)
//     if (studies.length === 0) {
//         return (
//             <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white space-y-4">
//                 <h2 className="text-2xl font-bold text-red-500">Study Not Found</h2>
//                 <p className="text-gray-400">The requested study could not be loaded or contains no images.</p>
//                 <button
//                     onClick={() => navigate('/dashboard/technician')}
//                     className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
//                 >
//                     Back to Dashboard
//                 </button>
//             </div>
//         );
//     }

//     // 4. Success - Render Layout
//     return <DicomViewerLayout />;
// };
