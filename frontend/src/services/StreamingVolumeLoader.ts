import { volumeLoader, imageLoader, cache, Enums } from '@cornerstonejs/core';
import { type DisplaySet } from './DisplaySetService';
import { applyInterleavedCenterLoading } from './ImageLoadStrategy';
import { loadAndCacheImage } from './DicomImageLoaderService';
import { PixelDataCache } from './PixelDataCache';

/**
 * Streaming Volume Loader Service
 * 
 * Orchestrates volume creation and streaming using Cornerstone3D loaders.
 * Supports progressive loading and prioritized fetching.
 */
class StreamingVolumeLoader {
    // Max slices before GPU 3D texture causes Chrome/Angle WebGL context loss.
    // Production DICOM viewers (including OHIF/Slicer) subsample above this limit.
    private static readonly MAX_VOLUME_SLICES = 512;

    /**
     * Creates and starts loading a volume for a given display set.
     * For studies > 512 slices, subsamples to prevent GPU crash.
     * @param displaySet The display set to create a volume from
     * @param onProgress Optional progress callback
     */
    public async createAndLoadVolume(
        displaySet: DisplaySet,
        onProgress?: (progress: number) => void
    ) {
        const volumeId = `cornerstoneStreamingImageVolume:${displaySet.displaySetInstanceUID}`;

        // 1. Check Cache — reuse existing volume (OHIF pattern)
        let volume = cache.getVolume(volumeId) as any;
        let imageIdsForVolume = [...displaySet.imageIds];

        if (!volume) {
            // 2. Prepare imageIds — subsample if volume is too large for GPU
            const totalSlices = imageIdsForVolume.length;

            if (totalSlices > StreamingVolumeLoader.MAX_VOLUME_SLICES) {
                // Subsample: take every Nth image to stay within GPU 3D texture limits
                const step = Math.ceil(totalSlices / StreamingVolumeLoader.MAX_VOLUME_SLICES);
                const subsampled: string[] = [];
                for (let i = 0; i < totalSlices; i += step) {
                    subsampled.push(imageIdsForVolume[i]);
                }
                console.log(`[StreamingVolumeLoader] Subsampling ${totalSlices} → ${subsampled.length} slices (step=${step}) to prevent GPU crash`);
                imageIdsForVolume = subsampled;
            }

            // 3. Interleave Loading Order (Center out)
            const imageIdsToLoad = applyInterleavedCenterLoading(imageIdsForVolume, volumeId);

            console.log(`[StreamingVolumeLoader] Creating volume: ${imageIdsToLoad.length} slices`);

            // 4. Create Volume
            volume = await volumeLoader.createAndCacheVolume(volumeId, {
                imageIds: imageIdsToLoad
            });
        }

        // 5. [NEW] Sparse-First Loading Strategy
        // If not loaded, we load in two phases:
        // Phase A: First 100 images (or interleaved center) - High Priority, BLOCKING for initial view
        // Phase B: The rest - Low Priority, BACKGROUND
        if (!volume.loadStatus || !volume.loadStatus.loaded) {
            // [FIX] Use Center-Out logic for the jumpstart batch
            // This ensures that the slices the user is actually looking at (center) load first
            const jumpstartCount = Math.min(imageIdsForVolume.length, 100);
            const interleavedIds = applyInterleavedCenterLoading(imageIdsForVolume, volumeId);
            const firstBatch = interleavedIds.slice(0, jumpstartCount);

            console.log(`[StreamingVolumeLoader] Phase A: Jumpstarting with ${jumpstartCount} center-out images...`);

            // Start volume loading (Cornerstone handles the streaming in background)
            const loadPromise = volume.load((progressEvent: any) => {
                if (progressEvent?.percentComplete !== undefined && onProgress) {
                    onProgress(Math.round(progressEvent.percentComplete));
                }
            });

            // We only WAIT for the first 100 images before returning the volume to the viewport
            // This allows the viewport to render its first set of slices almost instantly.
            await Promise.allSettled(
                firstBatch.map(id => loadAndCacheImage(id))
            );

            console.log(`[StreamingVolumeLoader] Phase A complete. Returning volume for instant rendering.`);

            // We return the volume immediately. Phase B (the rest of the images) 
            // will continue loading in the background because we didn't await loadPromise yet.
            // Note: Cornerstone's Volume.load() internally manages the request pool.
        } else if (onProgress) {
            onProgress(100);
        }

        return volume;
    }

    /**
     * Gets a volume from cache or returns undefined
     */
    public getVolume(displaySetInstanceUID: string) {
        const volumeId = `cornerstoneStreamingImageVolume:${displaySetInstanceUID}`;
        return cache.getVolume(volumeId);
    }
}

export const streamingVolumeLoader = new StreamingVolumeLoader();
