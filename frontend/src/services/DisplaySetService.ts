import { makeAutoObservable, runInAction } from 'mobx';
import { dicomMetadataStore, type SeriesMetadata, type InstanceMetadata, type StudyMetadata } from './DicomMetadataStore';
import { getImageSrcFromImageId, getImageIdForThumbnail } from '@/utils/getImageSrcFromImageId';

/**
 * DisplaySetService (OHIF-Style)
 * 
 * Responsible for creating "Viewable" sets from raw metadata.
 * - Detects if a series is a 3D Volume (Reconstructable) or just a Stack.
 * - Groups frames (Multi-frame support).
 * - Generates unique DisplaySetUIDs.
 */

export type DisplaySetType = 'stack' | 'volume';

export interface DisplaySet {
    displaySetInstanceUID: string;
    studyInstanceUID: string;
    seriesInstanceUID: string;
    sopClassUID: string;
    seriesNumber: number;
    seriesDescription: string;
    modality: string;
    frameRate?: number;
    numInstances: number;
    imageIds: string[];
    instances: InstanceMetadata[]; // References to store
    isReconstructable: boolean; // Can be a 3D volume?
    displaySetType: DisplaySetType;
    // UI State for this specific set
    windowCenter?: number;
    windowWidth?: number;
    thumbnailSrc?: string; // Cached data URL for persistent thumbnail
}

class DisplaySetService {
    displaySets: Map<string, DisplaySet> = new Map();
    activeDisplaySets: string[] = []; // IDs of sets currently active/selected
    thumbnailImageSrcMap: Map<string, string> = new Map(); // Cached thumbnail data URLs

    constructor() {
        makeAutoObservable(this);
    }

    /**
     * Scans the MetadataStore and creates DisplaySets for a specific Study.
     * This is usually called after a study is loaded.
     */
    public makeDisplaySetsForStudy(studyInstanceUID: string): DisplaySet[] {
        const study = dicomMetadataStore.getStudy(studyInstanceUID);
        if (!study) {
            console.warn(`[DisplaySetService] Study ${studyInstanceUID} not found.`);
            return [];
        }

        const createdSets: DisplaySet[] = [];

        study.series.forEach(series => {
            const displaySet = this.createDisplaySetForSeries(series);
            if (displaySet) {
                this.displaySets.set(displaySet.displaySetInstanceUID, displaySet);
                createdSets.push(displaySet);
            }
        });

        // Sort by Series Number
        createdSets.sort((a, b) => a.seriesNumber - b.seriesNumber);

        console.log(`[DisplaySetService] Created ${createdSets.length} DisplaySets for Study ${studyInstanceUID}`);
        return createdSets;
    }

    private createDisplaySetForSeries(series: SeriesMetadata): DisplaySet | null {
        if (!series.instances || series.instances.length === 0) return null;

        const firstInstance = series.instances[0];

        // 1. Determine reconstructability (Is this a 3D Volume?)
        // 2. Generate ID
        const displaySetInstanceUID = series.seriesInstanceUID; // Simplified: 1:1 Series mapping for now

        // Determine reconstructability (simple version: CT/MR with > 1 instance)
        // Advanced version would check for consistent spacing and orientation
        const instances = series.instances;
        const isReconstructable = (series.modality === 'CT' || series.modality === 'MR') &&
            instances.length > 2 &&
            this.hasConsistentOrientation(instances);

        const sortedInstances = [...instances].sort((a, b) => a.instanceNumber - b.instanceNumber);
        const imageIds = sortedInstances.map(i => i.imageId);

        // 4. Default VOI (OHIF Soft Tissue Preset)
        const windowCenter = firstInstance.windowCenter || 40;
        const windowWidth = firstInstance.windowWidth || 400;

        return {
            displaySetInstanceUID,
            studyInstanceUID: series.studyInstanceUID,
            seriesInstanceUID: series.seriesInstanceUID,
            sopClassUID: firstInstance.sopInstanceUID, // Actually need SOPClassUID here, mapping todo
            seriesNumber: series.seriesNumber,
            seriesDescription: series.seriesDescription,
            modality: series.modality,
            numInstances: series.instances.length,
            imageIds,
            instances: sortedInstances,
            isReconstructable,
            displaySetType: isReconstructable ? 'volume' : 'stack', // Default logic
            windowCenter,
            windowWidth
        };
    }

    /**
     * Complex logic to determine if a series represents a 3D volume
     */
    private isSeriesReconstructable(series: SeriesMetadata): boolean {
        if (series.instances.length < 3) return false;

        // Modality check (optional, but good for speed)
        if (['NM', 'CR', 'DX', 'MG'].includes(series.modality)) return false;

        const first = series.instances[0];
        if (!first.imagePositionPatient || !first.imageOrientationPatient) return false;

        // Check if evenly spaced (Simplified check for now)
        // In a real robust viewer, we check spacing between every slice.
        return true;
    }

    private hasConsistentOrientation(instances: InstanceMetadata[]): boolean {
        if (instances.length < 2) return false;
        const firstIter = instances[0].imageOrientationPatient;
        if (!firstIter) return false;

        // Check if all instances have the same orientation (within tolerance)
        return instances.every(inst => {
            const ori = inst.imageOrientationPatient;
            if (!ori) return false;
            return ori.every((val, idx) => Math.abs(val - firstIter[idx]) < 0.01);
        });
    }

    public getDisplaySet(displaySetInstanceUID: string): DisplaySet | undefined {
        return this.displaySets.get(displaySetInstanceUID);
    }

    public getDisplaySetsForStudy(studyInstanceUID: string): DisplaySet[] {
        return Array.from(this.displaySets.values()).filter(ds => ds.studyInstanceUID === studyInstanceUID);
    }

    public getActiveDisplaySets(): DisplaySet[] {
        return Array.from(this.displaySets.values());
    }

    /**
     * Generate persistent thumbnail data URLs for all display sets of a study.
     * Follows OHIF's pattern: render once → store as data URL → display via <img>.
     */
    public async generateThumbnails(studyInstanceUID: string): Promise<void> {
        const displaySets = this.getDisplaySetsForStudy(studyInstanceUID);

        for (const ds of displaySets) {
            // Skip if already generated
            if (ds.thumbnailSrc || this.thumbnailImageSrcMap.has(ds.displaySetInstanceUID)) {
                continue;
            }

            const imageId = getImageIdForThumbnail(ds.imageIds);
            if (!imageId) continue;

            try {
                const thumbnailSrc = await getImageSrcFromImageId(imageId);
                runInAction(() => {
                    ds.thumbnailSrc = thumbnailSrc;
                    this.thumbnailImageSrcMap.set(ds.displaySetInstanceUID, thumbnailSrc);
                });
            } catch (error) {
                console.warn(`[DisplaySetService] Failed to generate thumbnail for ${ds.displaySetInstanceUID}:`, error);
            }
        }
    }

    /**
     * Get the cached thumbnail src for a display set.
     */
    public getThumbnailSrc(displaySetInstanceUID: string): string | undefined {
        return this.thumbnailImageSrcMap.get(displaySetInstanceUID);
    }
}

export const displaySetService = new DisplaySetService();
