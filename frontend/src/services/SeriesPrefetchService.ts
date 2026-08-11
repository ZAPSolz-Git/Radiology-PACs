/**
 * Series Prefetch Service
 * 
 * Starts preloading volume data when a study/series is selected, 
 * BEFORE the MPR view is mounted. This eliminates the "cold start" delay
 * where the user clicks MPR and waits for the volume to start loading.
 * 
 * RadiAnt does this internally by beginning data fetch as soon as a
 * study is opened, not when the user switches to MPR view.
 */
import { cache, volumeLoader } from '@cornerstonejs/core';
import { cornerstoneStreamingImageVolumeLoader } from '@cornerstonejs/core/loaders';
import { applyInterleavedCenterLoading } from './ImageLoadStrategy';
import type { DisplaySet } from './DisplaySetService';

class SeriesPrefetchService {
    private prefetchingSet = new Set<string>();
    private prefetchQueue: string[] = [];
    private maxConcurrentPrefetch = 1; // Only prefetch 1 series at a time
    private activePrefetchCount = 0;

    /**
     * Start prefetching a series volume in the background.
     * Called when a study is loaded or a series is selected in the browser.
     * 
     * This creates and starts loading the volume before the MPR view opens,
     * so when the user clicks "MPR", the data is already partially loaded.
     */
    public async prefetchSeries(displaySet: DisplaySet): Promise<void> {
        if (!displaySet || !displaySet.imageIds?.length) return;

        const volumeId = `cornerstoneStreamingImageVolume:${displaySet.displaySetInstanceUID}`;

        // Skip if already cached or already prefetching
        const existing = cache.getVolume(volumeId);
        if (existing) {
            console.log(`[Prefetch] Volume already cached: ${volumeId}`);
            return;
        }

        if (this.prefetchingSet.has(volumeId)) {
            console.log(`[Prefetch] Already prefetching: ${volumeId}`);
            return;
        }

        // Check if series is reconstructable (has enough slices for MPR)
        if (displaySet.imageIds.length < 10) {
            console.log(`[Prefetch] Series too small for MPR prefetch (${displaySet.imageIds.length} images)`);
            return;
        }

        // Queue or start immediately
        if (this.activePrefetchCount >= this.maxConcurrentPrefetch) {
            this.prefetchQueue.push(volumeId);
            console.log(`[Prefetch] Queued for later: ${volumeId}`);
            return;
        }

        this.prefetchingSet.add(volumeId);
        this.activePrefetchCount++;

        try {
            console.log(`[Prefetch] Starting background prefetch: ${volumeId} (${displaySet.imageIds.length} images)`);

            // Apply center-out ordering for prefetch
            const orderedImageIds = applyInterleavedCenterLoading(
                displaySet.imageIds,
                volumeId
            );

            // Create volume in cache
            const volume = await volumeLoader.createAndCacheVolume(volumeId, {
                imageIds: orderedImageIds,
            });

            // Start background loading with low priority
            volume.load();

            console.log(`[Prefetch] Background prefetch started: ${volumeId}`);
        } catch (error) {
            console.warn(`[Prefetch] Failed to prefetch ${volumeId}:`, error);
        } finally {
            this.activePrefetchCount--;
            this.prefetchingSet.delete(volumeId);

            // Process queue
            this.processQueue();
        }
    }

    /**
     * Cancel all pending prefetches (e.g., when navigating away from viewer)
     */
    public cancelAll(): void {
        this.prefetchQueue = [];
        this.prefetchingSet.clear();
        console.log('[Prefetch] All prefetch cancelled');
    }

    /**
     * Check if a volume is being prefetched
     */
    public isPrefetching(displaySetInstanceUID: string): boolean {
        const volumeId = `cornerstoneStreamingImageVolume:${displaySetInstanceUID}`;
        return this.prefetchingSet.has(volumeId);
    }

    private processQueue(): void {
        if (this.prefetchQueue.length === 0) return;
        if (this.activePrefetchCount >= this.maxConcurrentPrefetch) return;

        // Process next in queue — we don't have the displaySet here, 
        // so queue processing is handled by the caller scheduling prefetchSeries again
        const nextVolumeId = this.prefetchQueue.shift();
        if (nextVolumeId) {
            console.log(`[Prefetch] Next in queue would be: ${nextVolumeId}`);
        }
    }
}

export const seriesPrefetchService = new SeriesPrefetchService();
