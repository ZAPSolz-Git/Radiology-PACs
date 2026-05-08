import { makeAutoObservable } from 'mobx';

/**
 * DICOM Metadata Store
 * 
 * Replicates OHIF's DicomMetadataStore but simplified for our use case.
 * Acts as the "Source of Truth" for all study/series/instance metadata.
 * 
 * Features:
 * - Centralized registry of all loaded studies.
 * - Efficient lookups (Study -> Series -> Instance).
 * - Reactive state (MobX) for UI updates.
 */

export interface InstanceMetadata {
    sopInstanceUID: string;
    seriesInstanceUID: string;
    studyInstanceUID: string; // Back-reference
    instanceNumber: number;
    imageId: string; // Cornerstone Image ID
    url: string;
    // ... other DICOM tags
    rows?: number;
    columns?: number;
    pixelSpacing?: [number, number];
    sliceThickness?: number;
    sliceLocation?: number;
    imagePositionPatient?: [number, number, number];
    imageOrientationPatient?: [number, number, number, number, number, number];
    windowCenter?: number;
    windowWidth?: number;
    sopClassUID?: string;
    modality?: string;
    bitsAllocated?: number;
    bitsStored?: number;
    highBit?: number;
    pixelRepresentation?: number;
    samplesPerPixel?: number;
    photometricInterpretation?: string;
    rescaleIntercept?: number;
    rescaleSlope?: number;
    transferSyntax?: string;
}

export interface SeriesMetadata {
    seriesInstanceUID: string;
    studyInstanceUID: string;
    seriesNumber: number;
    modality: string;
    seriesDescription: string;
    instances: InstanceMetadata[];
}

export interface StudyMetadata {
    studyInstanceUID: string;
    patientName: string;
    patientId: string;
    studyDate: string;
    studyDescription: string;
    numInstances: number;
    series: SeriesMetadata[];
}

class DicomMetadataStore {
    studies: Map<string, StudyMetadata> = new Map();

    constructor() {
        makeAutoObservable(this);
    }

    /**
     * Adds a full study to the store.
     * @param study The study metadata to add
     */
    addStudy(study: StudyMetadata) {
        // Enhance with back-references if needed or just store
        this.studies.set(study.studyInstanceUID, study);
        console.log(`[MetadataStore] Added Study: ${study.studyInstanceUID} (${study.series.length} series)`);
    }

    getStudy(studyInstanceUID: string): StudyMetadata | undefined {
        return this.studies.get(studyInstanceUID);
    }

    getSeries(studyInstanceUID: string, seriesInstanceUID: string): SeriesMetadata | undefined {
        const study = this.studies.get(studyInstanceUID);
        if (!study) return undefined;
        return study.series.find(s => s.seriesInstanceUID === seriesInstanceUID);
    }

    getAllStudies(): StudyMetadata[] {
        return Array.from(this.studies.values());
    }

    /**
     * Clears all metadata (e.g. on logout or memory purge)
     */
    clear() {
        this.studies.clear();
    }

    /**
     * Updates the imageId for a specific instance in the metadata store
     */
    updateInstanceImageId(studyInstanceUID: string, seriesInstanceUID: string, sopInstanceUID: string, newImageId: string) {
        const study = this.studies.get(studyInstanceUID);
        if (!study) return;

        const series = study.series.find(s => s.seriesInstanceUID === seriesInstanceUID);
        if (!series) return;

        const instance = series.instances.find(i => i.sopInstanceUID === sopInstanceUID);
        if (instance) {
            instance.imageId = newImageId;
        }
    }
}

export const dicomMetadataStore = new DicomMetadataStore();
