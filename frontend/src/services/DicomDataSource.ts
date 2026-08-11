import { CaseService } from '@/features/technician/services/CaseService';
import { dicomMetadataStore, type StudyMetadata } from './DicomMetadataStore';
import MetadataService from './MetadataService';
import { MetadataStorage } from './MetadataStorageService';

/**
 * DicomDataSource
 * 
 * Responsible for fetching data from the backend and normalizing it 
 * into the DicomMetadataStore format.
 */
class DicomDataSource {

    /**
     * Fetches full study metadata and populates the store.
     * @param caseId The MongoDB Case ID
     */
    async retrieveStudyMetadata(caseId: string): Promise<StudyMetadata[]> {
        // [NEW] Attempt to load from IndexedDB first
        const cachedStudies = await MetadataStorage.getStudyMetadata(caseId);
        if (cachedStudies) {
            console.log('[DicomDataSource] Loaded metadata from IndexedDB');
            cachedStudies.forEach(study => {
                dicomMetadataStore.addStudy(study);
                // Ensure MetadataService also has it for all imageIds
                study.series.forEach(s => s.instances.forEach(i => MetadataService.addMetadata(i.imageId, i)));
            });
            return cachedStudies;
        }

        console.time('fetchMetadata');
        try {
            // 1. Fetch from Backend
            const rawStudiesResponse = await CaseService.getCaseMetadata(caseId);
            const rawStudies = Array.isArray(rawStudiesResponse)
                ? rawStudiesResponse
                : (rawStudiesResponse ? [rawStudiesResponse] : []);

            console.timeEnd('fetchMetadata');

            // 2. Normalize and check for Hybrid Orthanc Path
            const studies: StudyMetadata[] = await Promise.all(rawStudies.map(async (rawMetadata: any) => {
                let useOrthanc = false;

                if (rawMetadata.orthancStudyUrl) {
                    try {
                        console.log(`[DicomDataSource] Fetching High-Performance Metadata from: ${rawMetadata.orthancStudyUrl}`);
                        const auth = btoa('orthanc:orthanc');
                        const orthancResponse = await fetch(`${rawMetadata.orthancStudyUrl}/metadata`, {
                            headers: {
                                'Accept': 'application/dicom+json',
                                'Authorization': `Basic ${auth}`
                            }
                        });

                        if (orthancResponse.ok) {
                            const orthancMetadata = await orthancResponse.json();
                            console.log(`[DicomDataSource] Registered ${orthancMetadata.length} instances from Orthanc`);

                            const orthancMap = new Map();
                            orthancMetadata.forEach((meta: any) => {
                                const sopUID = meta['00080018']?.Value?.[0];
                                if (sopUID) orthancMap.set(sopUID, meta);
                            });

                            rawMetadata.series.forEach((s: any) => {
                                s.instances.forEach((i: any) => {
                                    const lookupUID = i.sopInstanceUID || i.SOPInstanceUID || i.instanceUID;
                                    const meta = orthancMap.get(lookupUID);

                                    if (meta) {
                                        const realSopUID = meta['00080018']?.Value?.[0];
                                        const realSerUID = meta['0020000E']?.Value?.[0];

                                        if (realSopUID) i.sopInstanceUID = realSopUID;
                                        if (realSerUID) s.seriesInstanceUID = realSerUID;

                                        // Register with MetadataService immediately for the WADO-RS ID
                                        if (i.sopInstanceUID && s.seriesInstanceUID) {
                                            const wadorsId = `wadors:${rawMetadata.orthancStudyUrl}/series/${s.seriesInstanceUID}/instances/${i.sopInstanceUID}/frames/1`;
                                            MetadataService.addMetadata(wadorsId, meta);
                                            // [ALSO] Link it to the wadouri ID just in case
                                            MetadataService.addMetadata(i.imageId, meta);
                                        }

                                        const parseSafeInt = (val: any) => { const p = parseInt(val); return isNaN(p) ? undefined : p; };
                                        const parseSafeFloat = (val: any) => { const p = parseFloat(val); return isNaN(p) ? undefined : p; };

                                        i.rows = parseSafeInt(meta['00280010']?.Value?.[0]) ?? i.rows;
                                        i.columns = parseSafeInt(meta['00280011']?.Value?.[0]) ?? i.columns;
                                        i.sliceThickness = parseSafeFloat(meta['00180050']?.Value?.[0]) ?? i.sliceThickness;
                                        i.spacingBetweenSlices = parseSafeFloat(meta['00180088']?.Value?.[0]) ?? i.spacingBetweenSlices;
                                        i.imagePositionPatient = meta['00200032']?.Value?.map(parseSafeFloat).filter((v: any) => v !== undefined) || i.imagePositionPatient;
                                        i.imageOrientationPatient = meta['00200037']?.Value?.map(parseSafeFloat).filter((v: any) => v !== undefined) || i.imageOrientationPatient;
                                        i.pixelSpacing = meta['00280030']?.Value?.map(parseSafeFloat).filter((v: any) => v !== undefined) || i.pixelSpacing;
                                        i.windowCenter = parseSafeFloat(meta['00281050']?.Value?.[0]) ?? i.windowCenter;
                                        i.windowWidth = parseSafeFloat(meta['00281051']?.Value?.[0]) ?? i.windowWidth;
                                        i.rescaleIntercept = parseSafeFloat(meta['00281052']?.Value?.[0]) ?? i.rescaleIntercept;
                                        i.rescaleSlope = parseSafeFloat(meta['00281053']?.Value?.[0]) ?? i.rescaleSlope;
                                    }
                                });
                            });
                            useOrthanc = true;
                        }
                    } catch (e) {
                        console.warn('[DicomDataSource] Orthanc Fast Metadata failed', e);
                    }
                }

                return {
                    studyInstanceUID: rawMetadata.studyInstanceUID,
                    patientName: rawMetadata.patientName,
                    patientId: rawMetadata.patientId,
                    studyDate: rawMetadata.studyDate,
                    studyDescription: rawMetadata.studyDescription,
                    numInstances: rawMetadata.numInstances,
                    series: rawMetadata.series.map((s: any) => {
                        // [ROBUSTNESS] Ensure seriesInstanceUID is never UNKNOWN if instances have it
                        let effectiveSeriesUID = s.seriesInstanceUID || s.SeriesInstanceUID;
                        if (!effectiveSeriesUID || effectiveSeriesUID === 'UNKNOWN_SERIES') {
                            const firstInstance = s.instances.find((i: any) => i.seriesInstanceUID || i.SeriesInstanceUID);
                            effectiveSeriesUID = firstInstance?.seriesInstanceUID || firstInstance?.SeriesInstanceUID || 'UNKNOWN_SERIES';
                        }

                        return {
                            seriesInstanceUID: effectiveSeriesUID,
                            studyInstanceUID: rawMetadata.studyInstanceUID,
                            seriesNumber: s.seriesNumber,
                            modality: s.modality,
                            seriesDescription: s.seriesDescription,
                            instances: s.instances.map((i: any) => {
                                const sopUID = i.sopInstanceUID || i.SOPInstanceUID;
                                const serUID = effectiveSeriesUID;
                                let imageId = i.imageId;

                                if (useOrthanc && rawMetadata.orthancStudyUrl && sopUID && serUID && serUID !== 'UNKNOWN_SERIES') {
                                    imageId = `wadors:${rawMetadata.orthancStudyUrl}/series/${serUID}/instances/${sopUID}/frames/1`;
                                }

                                // [NEW] Link metadata to BOTH imageIds used in our hybrid system
                                MetadataService.addMetadata(imageId, i);
                                if (i.imageId !== imageId) {
                                    MetadataService.addMetadata(i.imageId, i);
                                }

                                return {
                                    ...i,
                                    imageId,
                                    sopInstanceUID: sopUID,
                                    seriesInstanceUID: serUID,
                                    studyInstanceUID: rawMetadata.studyInstanceUID
                                };
                            })
                        };
                    })
                } as StudyMetadata;
            }));

            // 3. Populate Store and Persist
            studies.forEach(study => dicomMetadataStore.addStudy(study));
            MetadataStorage.saveStudyMetadata(caseId, studies).catch(err =>
                console.warn('[DicomDataSource] Failed to save metadata to IndexedDB', err)
            );

            return studies;
        } catch (error) {
            console.error('[DicomDataSource] Failed to retrieve study metadata', error);
            throw error;
        }
    }
}

// Diagnostic Helper for the console
(window as any).DIAGNOSTIC = {
    checkCache: async () => {
        const pk = await MetadataStorage.getStudyMetadata('all');
        console.log('[DIAGNOSTIC] Metadata Keys:', pk);
    },
    resetStore: () => {
        dicomMetadataStore.clear();
        console.log('[DIAGNOSTIC] Store cleared');
    },
    testOrthanc: async (url: string = 'http://localhost:8042/dicom-web/studies') => {
        try {
            const auth = btoa('orthanc:orthanc');
            const res = await fetch(url, {
                headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/dicom+json' }
            });
            console.log('[DIAGNOSTIC] Orthanc Test:', res.ok ? 'OK' : `Failed (${res.status})`);
            if (res.ok) console.log('[DIAGNOSTIC] Orthanc JSON:', await res.json());
        } catch (e) {
            console.error('[DIAGNOSTIC] Orthanc Fetch Error:', e);
        }
    },
    checkLoader: () => {
        console.log('[DIAGNOSTIC] Persistent Loader is initialized.');
    }
};

export const dicomDataSource = new DicomDataSource();
