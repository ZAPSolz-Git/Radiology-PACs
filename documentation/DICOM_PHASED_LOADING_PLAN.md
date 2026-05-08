# Implementation Plan: OHIF-Style 3-Phase DICOM Loading Strategy

This plan outlines the implementation of a high-performance, 3-phase DICOM image loading strategy for the Radiology Project, mimicking the architecture used by **OHIF (Open Health Imaging Foundation)**.

## 1. Overview of the 3-Phase Strategy

To eliminate the current 2-5s initial delay and stuttery scrolling, we will move from a "lazy/on-demand" loading model to a "proactive phased" model:

- **Phase 1: Immediate Visual Feedback (< 500ms)**
  - Load the **middle slice** of the primary series immediately and bypass the request pool for maximum priority.
- **Phase 2: Intelligent Neighbor Prefetch (Interaction-driven)**
  - Proactively load slices surrounding the current viewport position in a center-out priority (e.g., +1, -1, +2, -2).
- **Phase 3: Complete Study Prefetch (Background)**
  - Load the remaining slices of the study in the background using idle network capacity with the lowest priority.

---

## 2. Technical Changes

### 2.1. Update `DicomImageLoaderService.ts`
Add core utility functions to interface with Cornerstone's `imageLoader` and `cache`.

- **Function: `loadAndCacheImage(imageId)`**
  - Checks if the image is already in the Cornerstone cache.
  - If not, calls `imageLoader.loadAndCacheImage(imageId)`.
- **Function: `prefetchImages(imageIds, onProgress)`**
  - Batch-loads a list of image IDs.
  - Uses `Promise.allSettled` to handle failures gracefully.
  - Provides progress updates via a callback.

### 2.2. Enhance `StudyLoaderService.ts`
Integrate Phase 1 and Phase 3 into the study initialization flow.

- **Phase 1 Implementation**:
  - Immediately after metadata registration, identify the middle slice of the first series.
  - Call `loadAndCacheImage` for this slice to ensure it's ready before the viewport even requests it.
- **Phase 3 Implementation**:
  - Collect all `imageIds` for the study.
  - Trigger a background prefetch for all remaining images using the `ImagePrefetchService`.

### 2.3. Refactor `ImagePrefetchService.ts`
Align the prefetcher with OHIF's configuration and priority logic.

- **Interaction Priority**:
  - User-triggered scrolls should always have `RequestType.Interaction` (highest priority).
- **Neighbor Prefetch Logic**:
  - Implement a weighted window (e.g., 10 slices ahead, 5 slices behind).
  - Use `requestPoolService.addRequest` with decaying priorities based on distance from the current slice.
- **Queue Management**:
  - Ensure duplicate requests are avoided by checking `cache.getImageLoadObject(imageId)`.

### 2.4. Optimize `RequestPoolService.ts`
Tune the concurrency limits to match OHIF's defaults for optimal performance:

- **Interaction**: 100 concurrent (User experience first)
- **Thumbnail**: 75 concurrent (Sidebar loading)
- **Prefetch**: 25 concurrent (Background throughput)

---

## 3. Configuration (Matching OHIF `default.js`)

We will adopt these exact constants:

```javascript
maxNumRequests: {
  interaction: 100,
  thumbnail: 75,
  prefetch: 25
}
```

## 4. Expected Performance Benefits

| Metric | Current (Lazy) | OHIF-Style (Phased) |
| :--- | :--- | :--- |
| **First Image Visible** | 2,000 - 5,000 ms | **300 - 800 ms** |
| **Scrolling Smoothness** | Stuttery for 30s | **Fluid after 1-2s** |
| **Thumbnails** | Slow/Incomplete | **Ready in < 3s** |
| **Network Efficiency** | Spiky/Reactive | **Steady/Proactive** |

## 5. Implementation Steps

1.  **Step 1**: Implement `loadAndCacheImage` and `prefetchImages` in `DicomImageLoaderService.ts`.
2.  **Step 2**: Modify `StudyLoaderService.ts` to trigger Phase 1 (middle slice) and Phase 3 (full study) loading.
3.  **Step 3**: Update `ImagePrefetchService.ts` to use actual pixel loading instead of just metadata registration.
4.  **Step 4**: Verify caching by monitoring `cache.getCacheSize()` in the browser console.

---

**Status**: Ready for implementation.
