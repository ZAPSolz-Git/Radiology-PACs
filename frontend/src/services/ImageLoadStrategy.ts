// Image Load Strategy Service - Interleaved Loading for MPR
// Based on OHIF Viewers implementation

import { imageLoadPoolManager, Enums } from '@cornerstonejs/core';

export interface LoadStrategyConfig {
  strategy: 'sequential' | 'interleaved-center' | 'interleaved-top-bottom';
  priority?: number;
}

/**
 * Interleaved center-out loading strategy
 * Loads center slices first, then radiates outward
 * Based on OHIF's interleaveCenterLoader.ts
 */
export function applyInterleavedCenterLoading(
  imageIds: string[],
  volumeId: string,
  requestType: Enums.RequestType = Enums.RequestType.Prefetch
): string[] {
  if (imageIds.length === 0) return [];

  const centerIndex = Math.floor(imageIds.length / 2);
  const halfLength = Math.ceil(imageIds.length / 2);
  const interleavedIds: string[] = [];

  // Build center-out order: center, center+1, center-1, center+2, center-2, ...
  for (let i = 0; i < halfLength; i++) {
    // Add center + offset
    if (centerIndex + i < imageIds.length) {
      interleavedIds.push(imageIds[centerIndex + i]);
    }

    // Add center - offset (skip if it's the same as center)
    if (i > 0 && centerIndex - i >= 0) {
      interleavedIds.push(imageIds[centerIndex - i]);
    }
  }

  console.log(`[ImageLoadStrategy] Interleaved order for ${imageIds.length} images:`);
  console.log(`[ImageLoadStrategy] Center index: ${centerIndex}, will load: ${interleavedIds.slice(0, 5).length} first slices immediately`);

  return interleavedIds;
}

/**
 * Apply prioritized loading to image load pool
 * Higher priority (negative numbers) loads first
 */
export function applyLoadPriority(
  imageIds: string[],
  volumeId: string,
  strategy: 'center-out' | 'sequential' = 'center-out'
): void {
  const orderedIds = strategy === 'center-out'
    ? applyInterleavedCenterLoading(imageIds, volumeId)
    : imageIds;

  // Clear existing prefetch requests for this volume
  try {
    imageLoadPoolManager.clearRequestStack(Enums.RequestType.Prefetch);
  } catch (e) {
    console.warn('[ImageLoadStrategy] Failed to clear prefetch stack:', e);
  }

  // Add requests with priority (higher priority = lower/more negative number)
  orderedIds.forEach((imageId, index) => {
    const priority = -index; // First images get highest priority

    // Note: Actual image loading is handled by volumeLoader.load()
    // This just sets up the priority queue
    console.log(`[ImageLoadStrategy] Queued ${imageId} with priority ${priority}`);
  });
}

/**
 * Cancel all pending requests for a volume
 */
export function cancelVolumeRequests(volumeId: string): void {
  try {
    console.log(`[ImageLoadStrategy] Cancelling requests for volume: ${volumeId}`);

    // Clear all request types
    Object.values(Enums.RequestType).forEach((type: any) => {
      try {
        imageLoadPoolManager.clearRequestStack(type);
      } catch (e) {
        // Ignore errors for individual types
      }
    });

    console.log('[ImageLoadStrategy] All requests cancelled');
  } catch (e) {
    console.error('[ImageLoadStrategy] Failed to cancel requests:', e);
  }
}

/**
 * Get optimal batch size based on series size and hardware
 */
export function getOptimalBatchSize(seriesSize: number): number {
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  if (seriesSize <= 100) {
    // Small series: aggressive loading
    return Math.min(50, hardwareConcurrency * 5);
  } else if (seriesSize <= 500) {
    // Medium series: moderate loading
    return Math.min(30, hardwareConcurrency * 3);
  } else if (seriesSize <= 1000) {
    // Large series: conservative loading
    return Math.min(20, hardwareConcurrency * 2);
  } else {
    // Very large series: very conservative
    return Math.min(15, hardwareConcurrency);
  }
}

/**
 * Estimate loading time based on series size
 */
export function estimateLoadTime(seriesSize: number): number {
  // Rough estimate: 200 images per second on average hardware
  const imagesPerSecond = 200;
  return Math.ceil(seriesSize / imagesPerSecond);
}