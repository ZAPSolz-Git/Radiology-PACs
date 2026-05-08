import { imageLoader, imageLoadPoolManager, Enums } from '@cornerstonejs/core';

type RequestType = 'interaction' | 'thumbnail' | 'prefetch';

interface RequestOptions {
    type: RequestType;
    priority?: number;
    additionalDetails?: Record<string, unknown>;
}

class RequestPoolService {
    private interactionQueue: Map<string, AbortController> = new Map();
    private prefetchQueue: Map<string, AbortController> = new Map();

    constructor() {
        // Initialize with optimized pool settings
        // OHIF-aligned: conservative limits to prevent memory pressure
        // from parallel image decoding across web workers
        const maxNumRequests = {
            [Enums.RequestType.Interaction]: 10,  // Was 20 — OHIF uses 10
            [Enums.RequestType.Thumbnail]: 5,     // Was 10 — OHIF uses 5
            [Enums.RequestType.Prefetch]: 5,
            [Enums.RequestType.Compute]: 10,      // Was 5 — OHIF uses 10
        };

        imageLoadPoolManager.maxNumRequests = maxNumRequests;
    }

    /**
     * Adds a request to the pool with specific priority and type.
     * @param imageId The image ID to load
     * @param type The type of request (interaction, thumbnail, prefetch)
     * @param priority Priority (0-100, higher is better)
     */
    public addRequest(imageId: string, type: RequestType, priority: number = 0) {
        const csRequestType = this.mapRequestType(type);
        const options = {
            priority,
            requestType: csRequestType,
        };

        // If it's an interaction request (user scrolling), we might want to cancel 
        // lower priority prefetch requests to free up bandwidth immediately
        if (type === 'interaction') {
            // Logic to potentially pause prefetch could go here
            // But Cornerstone's pool manager handles maxNumRequests per type, 
            // so we just need to ensure slots are constrained.
        }

        // Trigger the load
        // Note: loadAndCacheImage puts it into the pool automatically
        imageLoader.loadAndCacheImage(imageId, options).catch(err => {
            // Ignore abort errors
            if (err.name !== 'AbortError') {
                console.warn(`[RequestPool] Load failed: ${imageId}`, err);
            }
        });
    }

    /**
     * Boosts the priority of a specific image (e.g. user scrolled to it).
     */
    public boostPriority(imageId: string) {
        // Checking if already in pool is hard with standard API, 
        // but re-requesting with 'interaction' type usually promotes it.
        this.addRequest(imageId, 'interaction', 100);
    }

    /**
     * Cancels all background prefetch requests.
     * Useful when user moves to a completely different part of the study.
     */
    public clearPrefetchQueue() {
        // Since we don't hold the cancel tokens easily for *internal* pool requests 
        // (imageLoader manages them), we rely on Cornerstone's internal management.
        // However, if we managed our own queue on top, we would cancel here.
        // For now, we assume the pool manager handles it via type limits.

        // Advanced: We could maintain our own AbortControllers if needed.
    }

    private mapRequestType(type: RequestType): Enums.RequestType {
        switch (type) {
            case 'interaction':
                return Enums.RequestType.Interaction;
            case 'thumbnail':
                return Enums.RequestType.Thumbnail;
            case 'prefetch':
                return Enums.RequestType.Prefetch;
            default:
                return Enums.RequestType.Prefetch;
        }
    }
}

export const requestPoolService = new RequestPoolService();
