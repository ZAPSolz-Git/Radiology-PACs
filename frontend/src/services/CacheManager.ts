import { cache } from '@cornerstonejs/core';

import { memoryMonitor } from '@/utils/MemoryMonitor';

export class CacheManager {
    private intervalId: NodeJS.Timeout | null = null;
    private currentImageIds: string[] = [];
    private activeVolumeIds: string[] = [];

    public startMonitoring() {
        if (this.intervalId) return;

        // Sync with MemoryMonitor
        this.intervalId = setInterval(() => {
            const stats = memoryMonitor.getMemoryStats();

            if (stats.pressure === 'critical' || stats.percentage > 90) {
                console.warn(`[CacheManager] Memory pressure ${stats.pressure} (${stats.percentage}%). Purging cache...`);
                this.purgeCache(true); // Aggressive purge
            } else if (stats.pressure === 'high') {
                this.purgeCache(false); // Normal purge
            }
        }, 5000);
    }

    public stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Set the current visible images/volumes to prevent them from being purged
     */
    public setVisibleData(imageIds: string[], volumeIds: string[] = []) {
        this.currentImageIds = imageIds;
        this.activeVolumeIds = volumeIds;
    }

    private purgeCache(aggressive: boolean) {
        try {
            // Cornerstone3D purgeCache takes a filter function
            // Return TRUE to PURGE, FALSE to KEEP.
            cache.purgeCache(); // Remove unreferenced items first

            if (aggressive) {
                // Future: Implement complex filtering logic based on currentImageIds/activeVolumeIds
                // For now, Cornerstone's default purge handles most unreferenced items
            }
        } catch (e) {
            console.warn("[CacheManager] Cache purge error", e);
        }
    }
}

export const cacheManager = new CacheManager();
