import { get, set, keys, del } from 'idb-keyval';

/**
 * Pixel Data Cache Service
 * 
 * Stores raw image ArrayBuffers in IndexedDB to prevent re-downloads.
 * This is crucial for high-performance MPR with 2000+ images.
 */
const PIXEL_DATA_PREFIX = 'px-';
const MAX_CACHE_DAYS = 7;

export const PixelDataCache = {
    /**
     * Store raw DICOM pixel data in IDB
     */
    async set(sopInstanceUID: string, buffer: ArrayBuffer) {
        try {
            const key = `${PIXEL_DATA_PREFIX}${sopInstanceUID}`;
            const item = {
                buffer,
                timestamp: Date.now()
            };
            await set(key, item);
        } catch (e) {
            console.warn('[PixelDataCache] Set failed (likely IDB full):', e);
        }
    },

    /**
     * Retrieve pixel data from IDB
     */
    async get(sopInstanceUID: string): Promise<ArrayBuffer | null> {
        try {
            const key = `${PIXEL_DATA_PREFIX}${sopInstanceUID}`;
            const item = await get(key);
            if (!item) return null;

            // Check expiry
            if (Date.now() - item.timestamp > 1000 * 60 * 60 * 24 * MAX_CACHE_DAYS) {
                await del(key);
                return null;
            }

            return item.buffer;
        } catch (e) {
            console.error('[PixelDataCache] Get failed:', e);
            return null;
        }
    },

    /**
     * Clear old pixel data to free up space
     */
    async clearOld() {
        try {
            const allKeys = await keys();
            const now = Date.now();
            const expiry = 1000 * 60 * 60 * 24 * MAX_CACHE_DAYS;

            for (const key of allKeys) {
                if (typeof key === 'string' && key.startsWith(PIXEL_DATA_PREFIX)) {
                    const item = await get(key);
                    if (item && now - item.timestamp > expiry) {
                        await del(key);
                    }
                }
            }
        } catch (e) {
            console.warn('[PixelDataCache] Cleanup failed:', e);
        }
    }
};
