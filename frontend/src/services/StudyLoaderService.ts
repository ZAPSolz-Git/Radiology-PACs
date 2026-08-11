// import { useDicomStore } from '@/stores/dicomStore';
// import { registerDicomFile, cacheMetadata, loadAndCacheImage } from './DicomImageLoaderService';
// import type { DicomStudy, DicomSeries, DicomInstance } from '@/types/dicom';
// import { dicomDataSource } from './DicomDataSource';
// import { displaySetService } from './DisplaySetService';
// import { hangingProtocolService } from './HangingProtocolService';
// import { dicomMetadataStore, type SeriesMetadata, InstanceMetadata } from './DicomMetadataStore';

// // Add a new function to load study by ID from URL
// export const loadStudyById = async (studyId: string): Promise<any> => {
//     const response = await fetch(`${import.meta.env.VITE_API_URL}/cases/${studyId}`);
//     if (!response.ok) {
//         throw new Error(`Failed to load study: ${response.statusText}`);
//     }
//     return response.json();
// };

// export const StudyLoaderService = {
//     async loadStudyFromServer(caseId: string, onProgress?: (msg: string) => void): Promise<void> {
//         const dicomStore = useDicomStore.getState();
//         dicomStore.setLoading(true);

//         try {
//             // 0. Clear previous studies to avoid mixing patients
//             dicomStore.clearAll();
//             dicomMetadataStore.clear();

//             // 1. [METADATA-FIRST] Fetch & Normalize via Data Source
//             if (onProgress) onProgress("Fetching study metadata...");
//             console.log(`[StudyLoader] Fetching metadata for case: ${caseId}`);
//             const studiesMetadata = await dicomDataSource.retrieveStudyMetadata(caseId);

//             console.log('[StudyLoader] Retrieved Metadata:', studiesMetadata);

//             if (!studiesMetadata || studiesMetadata.length === 0) {
//                 const msg = `No DICOM metadata found for caseId: ${caseId}. The study might not have been fully processed or uploaded correctly.`;
//                 console.error('[StudyLoader] ' + msg);
//                 throw new Error(msg);
//             }

//             console.log(`[StudyLoader] Loaded ${studiesMetadata.length} studies for patient.`);

//             const studiesToLoad = studiesMetadata.slice(0, 1);

//             for (const studyMetadata of studiesToLoad) {
//                 // 1b. Create DisplaySets (OHIF Style)
//                 displaySetService.makeDisplaySetsForStudy(studyMetadata.studyInstanceUID);

//                 const instancesForStore: DicomInstance[] = [];
//                 let processedCount = 0;
//                 const totalInstances = studyMetadata.series.reduce((acc, s) => acc + s.instances.length, 0);

//                 for (const series of studyMetadata.series) {
//                     for (const instance of series.instances) {
//                         if (++processedCount % 50 === 0) {
//                             if (onProgress) onProgress(`Registering images: ${processedCount}/${totalInstances}...`);
//                             await new Promise(resolve => setTimeout(resolve, 0));
//                         }

//                         const { url, sopInstanceUID } = instance;
//                         const getAbsoluteDocxUrl = (path?: string) => {
//                             if (!path) return undefined;

//                             // 1. Strip the domain if the backend sent an absolute URL
//                             let relativePath = path;
//                             if (path.startsWith('http')) {
//                                 try {
//                                     const urlObj = new URL(path);
//                                     // pathname might contain '//uploads', so we clean it
//                                     relativePath = urlObj.pathname + urlObj.search;
//                                 } catch (e) {
//                                     relativePath = path.replace(/^https?:\/\/[^\/]+/, '');
//                                 }
//                             }

//                             // 2. Clean the API base domain (remove /api and any trailing slashes)
//                             const apiBase = (import.meta.env.VITE_API_URL || 'https://api.armorray.com')
//                                 .replace(/\/api\/?$/, '')
//                                 .replace(/\/+$/, '');

//                             // 3. COLLAPSE DOUBLE SLASHES: Ensure relativePath starts with exactly one slash
//                             // This removes any extra leading slashes returned by the backend or URL parser
//                             const cleanPath = '/' + relativePath.replace(/^\/+/, '');

//                             return `${apiBase}${cleanPath}`;
//                         };
//                         const absoluteUrl = getAbsoluteDocxUrl(url);

//                         if (!absoluteUrl) {
//                             console.warn(`[StudyLoader] Skipping instance ${sopInstanceUID} due to missing URL.`);
//                             continue;
//                         }

//                         const registeredImageId = registerDicomFile(sopInstanceUID, undefined, undefined, absoluteUrl);

//                         dicomMetadataStore.updateInstanceImageId(
//                             studyMetadata.studyInstanceUID,
//                             series.seriesInstanceUID,
//                             sopInstanceUID,
//                             registeredImageId
//                         );

//                         const metadataMap: any = {
//                             'x00280030': instance.pixelSpacing,
//                             'x00200032': instance.imagePositionPatient,
//                             'x00200037': instance.imageOrientationPatient,
//                             'x00180050': instance.sliceThickness,
//                             'x00280011': instance.columns,
//                             'x00280100': instance.bitsAllocated || 16,
//                             'x00280101': instance.bitsStored || 12,
//                             'x00280102': instance.highBit || 11,
//                             'x00280103': instance.pixelRepresentation || 0,
//                             'x00281052': instance.rescaleIntercept || 0,
//                             'x00281053': instance.rescaleSlope || 1,
//                             'x00280010': instance.rows,
//                             'x00281050': Array.isArray(instance.windowCenter) ? instance.windowCenter : [instance.windowCenter || 40],
//                             'x00281051': Array.isArray(instance.windowWidth) ? instance.windowWidth : [instance.windowWidth || 400],
//                             'x00080016': instance.sopClassUID || '1.2.840.10008.5.1.4.1.1.2',
//                             'x00280002': instance.samplesPerPixel || 1,
//                             'x00280004': instance.photometricInterpretation || 'MONOCHROME2',
//                             'x00201041': instance.sliceLocation, // [NEW] Added for slice location
//                             'x00020010': instance.transferSyntax || '1.2.840.10008.1.2',
//                         };

//                         cacheMetadata(registeredImageId, metadataMap);

//                         instancesForStore.push({
//                             sopInstanceUID: instance.sopInstanceUID,
//                             sopClassUID: instance.sopClassUID || '1.2.840.10008.5.1.4.1.1.2',
//                             instanceNumber: instance.instanceNumber,
//                             imageId: registeredImageId,
//                             rows: instance.rows || 512,
//                             columns: instance.columns || 512,
//                             windowCenter: instance.windowCenter || 40,
//                             windowWidth: instance.windowWidth || 400,
//                             sliceThickness: instance.sliceThickness || 1,
//                             sliceLocation: instance.sliceLocation || 0,
//                             pixelSpacing: instance.pixelSpacing || [1, 1],
//                             imagePositionPatient: instance.imagePositionPatient || [0, 0, 0],
//                             studyUID: studyMetadata.studyInstanceUID,
//                             seriesUID: series.seriesInstanceUID,
//                             frameOfReferenceUID: '',
//                         } as DicomInstance);
//                     }
//                 }

//                 const dicomStudy: DicomStudy = {
//                     studyInstanceUID: studyMetadata.studyInstanceUID,
//                     studyDate: studyMetadata.studyDate || '',
//                     studyTime: '',
//                     studyDescription: studyMetadata.studyDescription || '',
//                     accessionNumber: '',
//                     patientName: studyMetadata.patientName,
//                     patientID: studyMetadata.patientId,
//                     patientBirthDate: '',
//                     patientSex: '',
//                     institutionName: '',
//                     referringPhysicianName: '',
//                     modality: studyMetadata.series[0]?.modality || 'CT',
//                     series: studyMetadata.series.map(s => ({
//                         seriesInstanceUID: s.seriesInstanceUID,
//                         seriesDescription: s.seriesDescription,
//                         seriesNumber: s.seriesNumber,
//                         modality: s.modality,
//                         frameOfReferenceUID: '',
//                         thumbnailDataUrl: null,
//                         instances: instancesForStore
//                             .filter(i => i.seriesUID === s.seriesInstanceUID)
//                             .sort((a, b) => a.instanceNumber - b.instanceNumber)
//                     }))
//                 };

//                 dicomStore.addStudy(dicomStudy);

//                 const allImageIds = instancesForStore.map(inst => inst.imageId);
//                 if (allImageIds.length > 0) {
//                     const middleIndex = Math.floor(allImageIds.length / 2);
//                     console.log(`[StudyLoader] Phase 1: Loading middle slice (${middleIndex}) for instant feedback`);
//                     if (onProgress) onProgress("Loading initial images...");
//                     loadAndCacheImage(allImageIds[middleIndex]).catch(err => {
//                         console.warn('[StudyLoader] Phase 1 Failed:', err);
//                     });
//                 }
//             }

//             const primaryStudy = studiesMetadata[0];
//             const layoutConfig = hangingProtocolService.run(primaryStudy.studyInstanceUID);

//             if (layoutConfig) {
//                 console.log('[StudyLoader] Applying Hanging Protocol Layout', layoutConfig);
//                 dicomStore.applyHangingProtocol(layoutConfig);
//             } else {
//                 console.warn('[StudyLoader] No Hanging Protocol matched. Using default behavior.');
//                 const firstStudy = dicomStore.studies[0];
//                 if (firstStudy && firstStudy.series.length > 0) {
//                     const firstSeries = firstStudy.series[0];
//                     dicomStore.loadSeriesToViewport(
//                         'viewport-0',
//                         firstStudy.studyInstanceUID,
//                         firstSeries.seriesInstanceUID
//                     );
//                 }
//             }

//         } catch (error) {
//             console.error('[StudyLoader] Error loading study:', error);
//             throw error;
//         } finally {
//             dicomStore.setLoading(false);
//         }
//     }
// };



import { useDicomStore } from '@/stores/dicomStore';
import { registerDicomFile, cacheMetadata, loadAndCacheImage } from './DicomImageLoaderService';
import type { DicomStudy, DicomSeries, DicomInstance } from '@/types/dicom';
import { dicomDataSource } from './DicomDataSource';
import { displaySetService } from './DisplaySetService';
import { hangingProtocolService } from './HangingProtocolService';
import { dicomMetadataStore, type SeriesMetadata, InstanceMetadata } from './DicomMetadataStore';

// Add a new function to load study by ID from URL
export const loadStudyById = async (studyId: string): Promise<any> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/cases/${studyId}`);
    if (!response.ok) {
        throw new Error(`Failed to load study: ${response.statusText}`);
    }
    return response.json();
};

export const StudyLoaderService = {
    async loadStudyFromServer(caseId: string, onProgress?: (msg: string) => void): Promise<void> {
        const dicomStore = useDicomStore.getState();
        dicomStore.setLoading(true);

        try {
            // 0. Clear previous studies to avoid mixing patients
            dicomStore.clearAll();
            dicomMetadataStore.clear();

            // 1. [METADATA-FIRST] Fetch & Normalize via Data Source
            if (onProgress) onProgress("Fetching study metadata...");
            console.log(`[StudyLoader] Fetching metadata for case: ${caseId}`);
            const studiesMetadata = await dicomDataSource.retrieveStudyMetadata(caseId);

            console.log('[StudyLoader] Retrieved Metadata:', studiesMetadata);

            if (!studiesMetadata || studiesMetadata.length === 0) {
                const msg = `No DICOM metadata found for caseId: ${caseId}. The study might not have been fully processed or uploaded correctly.`;
                console.error('[StudyLoader] ' + msg);
                throw new Error(msg);
            }

            console.log(`[StudyLoader] Loaded ${studiesMetadata.length} studies for patient.`);

            const studiesToLoad = studiesMetadata.slice(0, 1);

            for (const studyMetadata of studiesToLoad) {
                // 1b. Create DisplaySets (OHIF Style)
                displaySetService.makeDisplaySetsForStudy(studyMetadata.studyInstanceUID);

                const instancesForStore: DicomInstance[] = [];
                let processedCount = 0;
                const totalInstances = studyMetadata.series.reduce((acc, s) => acc + s.instances.length, 0);

                for (const series of studyMetadata.series) {
                    for (const instance of series.instances) {
                        if (++processedCount % 50 === 0) {
                            if (onProgress) onProgress(`Registering images: ${processedCount}/${totalInstances}...`);
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }

                        const { url, sopInstanceUID } = instance;
                        const getAbsoluteDocxUrl = (path?: string) => {
                            if (!path) return undefined;
                            if (path.startsWith('http')) return path;
                            const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
                            return `${apiBase}${path}`;
                        };
                        const absoluteUrl = getAbsoluteDocxUrl(url);

                        if (!absoluteUrl) {
                            console.warn(`[StudyLoader] Skipping instance ${sopInstanceUID} due to missing URL.`);
                            continue;
                        }

                        const registeredImageId = registerDicomFile(sopInstanceUID, undefined, undefined, absoluteUrl);

                        dicomMetadataStore.updateInstanceImageId(
                            studyMetadata.studyInstanceUID,
                            series.seriesInstanceUID,
                            sopInstanceUID,
                            registeredImageId
                        );

                        const metadataMap: any = {
                            'x00280030': instance.pixelSpacing,
                            'x00200032': instance.imagePositionPatient,
                            'x00200037': instance.imageOrientationPatient,
                            'x00180050': instance.sliceThickness,
                            'x00280011': instance.columns,
                            'x00280100': instance.bitsAllocated || 16,
                            'x00280101': instance.bitsStored || 12,
                            'x00280102': instance.highBit || 11,
                            'x00280103': instance.pixelRepresentation || 0,
                            'x00281052': instance.rescaleIntercept || 0,
                            'x00281053': instance.rescaleSlope || 1,
                            'x00280010': instance.rows,
                            'x00281050': Array.isArray(instance.windowCenter) ? instance.windowCenter : [instance.windowCenter || 40],
                            'x00281051': Array.isArray(instance.windowWidth) ? instance.windowWidth : [instance.windowWidth || 400],
                            'x00080016': instance.sopClassUID || '1.2.840.10008.5.1.4.1.1.2',
                            'x00280002': instance.samplesPerPixel || 1,
                            'x00280004': instance.photometricInterpretation || 'MONOCHROME2',
                            'x00201041': instance.sliceLocation, // [NEW] Added for slice location
                            'x00020010': instance.transferSyntax || '1.2.840.10008.1.2',
                        };

                        cacheMetadata(registeredImageId, metadataMap);

                        instancesForStore.push({
                            sopInstanceUID: instance.sopInstanceUID,
                            sopClassUID: instance.sopClassUID || '1.2.840.10008.5.1.4.1.1.2',
                            instanceNumber: instance.instanceNumber,
                            imageId: registeredImageId,
                            rows: instance.rows || 512,
                            columns: instance.columns || 512,
                            windowCenter: instance.windowCenter || 40,
                            windowWidth: instance.windowWidth || 400,
                            sliceThickness: instance.sliceThickness || 1,
                            sliceLocation: instance.sliceLocation || 0,
                            pixelSpacing: instance.pixelSpacing || [1, 1],
                            imagePositionPatient: instance.imagePositionPatient || [0, 0, 0],
                            studyUID: studyMetadata.studyInstanceUID,
                            seriesUID: series.seriesInstanceUID,
                            frameOfReferenceUID: '',
                        } as DicomInstance);
                    }
                }

                const dicomStudy: DicomStudy = {
                    studyInstanceUID: studyMetadata.studyInstanceUID,
                    studyDate: studyMetadata.studyDate || '',
                    studyTime: '',
                    studyDescription: studyMetadata.studyDescription || '',
                    accessionNumber: '',
                    patientName: studyMetadata.patientName,
                    patientID: studyMetadata.patientId,
                    patientBirthDate: '',
                    patientSex: '',
                    institutionName: '',
                    referringPhysicianName: '',
                    modality: studyMetadata.series[0]?.modality || 'CT',
                    series: studyMetadata.series.map(s => ({
                        seriesInstanceUID: s.seriesInstanceUID,
                        seriesDescription: s.seriesDescription,
                        seriesNumber: s.seriesNumber,
                        modality: s.modality,
                        frameOfReferenceUID: '',
                        thumbnailDataUrl: null,
                        instances: instancesForStore
                            .filter(i => i.seriesUID === s.seriesInstanceUID)
                            .sort((a, b) => a.instanceNumber - b.instanceNumber)
                    }))
                };

                dicomStore.addStudy(dicomStudy);

                const allImageIds = instancesForStore.map(inst => inst.imageId);
                if (allImageIds.length > 0) {
                    const middleIndex = Math.floor(allImageIds.length / 2);
                    console.log(`[StudyLoader] Phase 1: Loading middle slice (${middleIndex}) for instant feedback`);
                    if (onProgress) onProgress("Loading initial images...");
                    loadAndCacheImage(allImageIds[middleIndex]).catch(err => {
                        console.warn('[StudyLoader] Phase 1 Failed:', err);
                    });
                }
            }

            const primaryStudy = studiesMetadata[0];
            const layoutConfig = hangingProtocolService.run(primaryStudy.studyInstanceUID);

            if (layoutConfig) {
                console.log('[StudyLoader] Applying Hanging Protocol Layout', layoutConfig);
                dicomStore.applyHangingProtocol(layoutConfig);
            } else {
                console.warn('[StudyLoader] No Hanging Protocol matched. Using default behavior.');
                const firstStudy = dicomStore.studies[0];
                if (firstStudy && firstStudy.series.length > 0) {
                    const firstSeries = firstStudy.series[0];
                    dicomStore.loadSeriesToViewport(
                        'viewport-0',
                        firstStudy.studyInstanceUID,
                        firstSeries.seriesInstanceUID
                    );
                }
            }

        } catch (error) {
            console.error('[StudyLoader] Error loading study:', error);
            throw error;
        } finally {
            dicomStore.setLoading(false);
        }
    }
};