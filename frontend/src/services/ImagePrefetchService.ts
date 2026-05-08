import {
    cache,
    imageLoader,
    imageLoadPoolManager,
    Enums,
    eventTarget,
    EVENTS as csEvents
} from '@cornerstonejs/core';
import { displaySetService, DisplaySet } from './DisplaySetService';
import getInterleavedFrames from '../utils/getInterleavedFrames';

/**
 * ImagePrefetchService
 * 
 * EXACT logic ported from OHIF 3.x StudyPrefetcherService.ts
 * 
 * Features:
 * - State tracking for every DisplaySet (Pending, Loaded, Failed).
 * - Concurrency management (Max 10 concurrent prefetch).
 * - Center-out interleaving via getInterleavedFrames.
 * - Prioritized neighbor prefetching on scrolls.
 * - Intelligent pause: skips prefetching while active series is still loading.
 */

interface ImageRequest {
    displaySetInstanceUID: string;
    imageId: string;
    aborted: boolean;
}

interface DisplaySetLoadingState {
    displaySetInstanceUID: string;
    numInstances: number;
    pendingImageIds: Set<string>;
    loadedImageIds: Set<string>;
    failedImageIds: Set<string>;
    loadingProgress: number;
}

export enum StudyPrefetchOrder {
    closest = 'closest',
    downward = 'downward',
    upward = 'upward',
}

class ImagePrefetchService {
    private _isRunning = false;
    private _activeDisplaySetUIDs: string[] = [];
    private _pendingRequests: ImageRequest[] = [];
    private _inflightRequests = new Map<string, ImageRequest>();
    private _displaySetLoadingStates = new Map<string, DisplaySetLoadingState>();
    private _imageIdsToDisplaySetsMap = new Map<string, Set<string>>();

    private config = {
        enabled: true,
        maxNumPrefetchRequests: 10,
        order: StudyPrefetchOrder.closest,
        displaySetsCount: 3, // Prefetch up to 3 more series
        windowSize: 10,
        forwardBias: 0.7,
    };

    private currentIndex: number = 0;
    private currentImageIds: string[] = [];

    constructor() {
        this._addEventListeners();
    }

    private _addEventListeners() {
        const onImageLoaded = (evt: any) => {
            const { imageId } = evt.detail.image;
            this._moveImageIdToLoadedSet(imageId);
            this._sendNextRequests();
        };

        const onImageLoadFailed = (evt: any) => {
            const { imageId } = evt.detail;
            this._moveImageIdToFailedSet(imageId);
            this._sendNextRequests();
        };

        eventTarget.addEventListener(csEvents.IMAGE_LOADED, onImageLoaded);
        eventTarget.addEventListener(csEvents.IMAGE_LOAD_FAILED, onImageLoadFailed);
    }

    /**
     * Entry point: Standard OHIF syncWithActiveViewport logic
     */
    public initialize(imageIds: string[], displaySetInstanceUID?: string) {
        this.currentImageIds = imageIds;
        this._isRunning = true;

        if (displaySetInstanceUID) {
            this._setActiveDisplaySets([displaySetInstanceUID]);
        } else {
            // Fallback for raw imageId lists
            this._activeDisplaySetUIDs = ['active'];
            this._restartPrefetching();
        }
    }

    private _setActiveDisplaySets(uids: string[]) {
        const isSame = uids.length === this._activeDisplaySetUIDs.length &&
            uids.every(uid => this._activeDisplaySetUIDs.includes(uid));

        if (isSame) return;

        this._activeDisplaySetUIDs = [...uids];
        this._restartPrefetching();
    }

    private _restartPrefetching() {
        this._stopPrefetching();
        this._startPrefetching();
    }

    private _stopPrefetching() {
        this._isRunning = false;
        this._inflightRequests.forEach(req => req.aborted = true);
        this._inflightRequests.clear();
        this._pendingRequests = [];
        this._displaySetLoadingStates.clear();
        this._imageIdsToDisplaySetsMap.clear();
        imageLoadPoolManager.clearRequestStack(Enums.RequestType.Prefetch);
    }

    private _startPrefetching() {
        if (!this.config.enabled) return;
        this._isRunning = true;

        // Load metadata for all display sets
        const allDisplaySets = displaySetService.getActiveDisplaySets();
        allDisplaySets.forEach(ds => this._addDisplaySetLoadingState(ds));

        // Determine which ones to prefetch based on order (Closest/Downward/Upward)
        const toPrefetch = this._getSortedDisplaySetsToPrefetch(allDisplaySets);
        toPrefetch.forEach(ds => this._enqueueDisplaySetRequests(ds));

        this._sendNextRequests();
    }

    private _addDisplaySetLoadingState(ds: DisplaySet) {
        if (this._displaySetLoadingStates.has(ds.displaySetInstanceUID)) return;

        const pending = new Set(ds.imageIds);
        const loaded = new Set<string>();

        ds.imageIds.forEach(id => {
            if (cache.getImageLoadObject(id)) {
                pending.delete(id);
                loaded.add(id);
            }
            // Reverse map for event handling
            if (!this._imageIdsToDisplaySetsMap.has(id)) {
                this._imageIdsToDisplaySetsMap.set(id, new Set());
            }
            this._imageIdsToDisplaySetsMap.get(id)!.add(ds.displaySetInstanceUID);
        });

        this._displaySetLoadingStates.set(ds.displaySetInstanceUID, {
            displaySetInstanceUID: ds.displaySetInstanceUID,
            numInstances: ds.imageIds.length,
            pendingImageIds: pending,
            loadedImageIds: loaded,
            failedImageIds: new Set(),
            loadingProgress: loaded.size / ds.imageIds.length
        });
    }

    private _enqueueDisplaySetRequests(ds: DisplaySet) {
        // Use OHIF Interleaving
        const interleaved = getInterleavedFrames(ds.imageIds);

        interleaved.forEach(item => {
            if (!cache.getImageLoadObject(item.imageId)) {
                this._pendingRequests.push({
                    displaySetInstanceUID: ds.displaySetInstanceUID,
                    imageId: item.imageId,
                    aborted: false
                });
            }
        });
    }

    private _getSortedDisplaySetsToPrefetch(all: DisplaySet[]): DisplaySet[] {
        if (!this._activeDisplaySetUIDs.length) return [];

        const activeUID = this._activeDisplaySetUIDs[0];
        const activeIdx = all.findIndex(ds => ds.displaySetInstanceUID === activeUID);
        if (activeIdx === -1) return [];

        let sorted: DisplaySet[] = [];
        if (this.config.order === StudyPrefetchOrder.closest) {
            let prev = activeIdx - 1;
            let next = activeIdx + 1;
            while (prev >= 0 || next < all.length) {
                if (prev >= 0) sorted.push(all[prev--]);
                if (next < all.length) sorted.push(all[next++]);
            }
        } else if (this.config.order === StudyPrefetchOrder.downward) {
            sorted = all.slice(activeIdx + 1);
        } else {
            sorted = all.slice(0, activeIdx).reverse();
        }

        return sorted.slice(0, this.config.displaySetsCount);
    }

    private async _sendNextRequests() {
        if (!this._isRunning) return;

        // CRITICAL COMPLEX LOGIC: Don't start prefetching other series
        // until the ACTIVE ones are loaded (to prioritize bandwidth)
        if (!this._areActiveDisplaySetsLoaded()) return;

        if (this._inflightRequests.size >= this.config.maxNumPrefetchRequests) return;
        if (this._pendingRequests.length === 0) return;

        const numRequests = Math.min(
            this._pendingRequests.length,
            this.config.maxNumPrefetchRequests - this._inflightRequests.size
        );

        const requests = this._pendingRequests.splice(0, numRequests);

        requests.forEach(req => {
            const { imageId } = req;
            if (cache.getImageLoadObject(imageId)) {
                this._moveImageIdToLoadedSet(imageId);
                this._sendNextRequests();
                return;
            }

            const options = {
                priority: -5,
                requestType: Enums.RequestType.Prefetch,
                additionalDetails: { imageId },
                preScale: { enabled: true }
            };

            this._inflightRequests.set(imageId, req);

            imageLoader.loadAndCacheImage(imageId, options).then(
                () => {
                    this._inflightRequests.delete(imageId);
                    this._moveImageIdToLoadedSet(imageId);
                    this._sendNextRequests();
                },
                (err) => {
                    this._inflightRequests.delete(imageId);
                    this._moveImageIdToFailedSet(imageId);
                    this._sendNextRequests();
                }
            );
        });
    }

    private _areActiveDisplaySetsLoaded(): boolean {
        if (!this._activeDisplaySetUIDs.length) return true;
        return this._activeDisplaySetUIDs.every(uid => {
            const state = this._displaySetLoadingStates.get(uid);
            return state ? state.loadingProgress >= 1 : true;
        });
    }

    /**
     * User scrolling logic (Same as simplified but integrated)
     */
    public onViewportChange(newIndex: number) {
        if (this.currentIndex === newIndex) return;
        this.currentIndex = newIndex;

        const imageId = this.currentImageIds[newIndex];
        if (imageId) {
            imageLoader.loadAndCacheImage(imageId, {
                priority: 100,
                requestType: Enums.RequestType.Interaction
            }).catch(() => { });
        }

        // Boost neighbors with prefetch priority
        for (let i = 1; i <= 10; i++) {
            this._boostSlice(this.currentIndex + i, 50 - i);
            this._boostSlice(this.currentIndex - i, 40 - i);
        }
    }

    private _boostSlice(idx: number, priority: number) {
        if (idx < 0 || idx >= this.currentImageIds.length) return;
        const id = this.currentImageIds[idx];
        if (cache.getImageLoadObject(id)) return;

        imageLoader.loadAndCacheImage(id, {
            priority,
            requestType: Enums.RequestType.Prefetch
        }).catch(() => { });
    }

    private _moveImageIdToLoadedSet(id: string) {
        const uids = this._imageIdsToDisplaySetsMap.get(id);
        if (!uids) return;
        uids.forEach(uid => {
            const state = this._displaySetLoadingStates.get(uid);
            if (state) {
                state.pendingImageIds.delete(id);
                state.loadedImageIds.add(id);
                state.loadingProgress = state.loadedImageIds.size / state.numInstances;
            }
        });
    }

    private _moveImageIdToFailedSet(id: string) {
        const uids = this._imageIdsToDisplaySetsMap.get(id);
        if (uids) uids.forEach(uid => this._displaySetLoadingStates.get(uid)?.pendingImageIds.delete(id));
    }
}

export const prefetchService = new ImagePrefetchService();
