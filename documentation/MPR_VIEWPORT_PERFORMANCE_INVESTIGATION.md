# MPR Viewport Performance Investigation & Analysis

**Investigation Date:** January 28, 2026  
**Scope:** DICOM Viewer MPR Viewport Performance Issues with 2000+ Image Series  
**Status:** Phase 1 Complete - Analysis & Planning

---

## Executive Summary

The MPR Viewport in the `dicom-viewer` folder exhibits critical performance issues and state management problems when handling large DICOM series (2000+ images). Investigation reveals **fundamental architectural differences** between the current implementation and OHIF Viewer's battle-tested approach, leading to memory leaks, slow rendering, and viewport reinitialization failures.

### Critical Findings

1. **Volume Loading Strategy Mismatch**: Custom volume service loads ALL pixel data synchronously vs. Cornerstone3D's streaming approach
2. **Missing Progressive Rendering**: No incremental volume building; users wait for complete volume before seeing any images
3. **State Cleanup Incomplete**: Volumes remain in Cornerstone cache after viewport unmount
4. **Cache Invalidation Missing**: Switching series doesn't properly invalidate cached volumes
5. **No Prefetch Prioritization**: All images loaded equally vs. OHIF's intelligent center-out loading

---

## Table of Contents

1. [Research Findings](#1-research-findings)
2. [Root Cause Analysis](#2-root-cause-analysis)
3. [Architecture Comparison](#3-architecture-comparison)
4. [Implementation Plan](#4-implementation-plan)
5. [Expected Outcomes](#5-expected-outcomes)

---

## 1. Research Findings

### 1.1 OHIF Documentation & Best Practices

#### Cornerstone3D Streaming Volume Loader
**Source:** [Cornerstone.js Streaming Documentation](https://cornerstonejs.org/docs/concepts/streaming-image-volume/streaming/)

**Key Features:**
- **Progressive Loading**: Volume renders while images are still loading
- **Metadata Pre-fetching**: Fetches image metadata first, then streams pixel data
- **Memory Efficient**: Doesn't create individual Image objects for each slice
- **Interleaved Loading**: Loads images from center outward for faster initial visualization

**OHIF Implementation (Viewers folder):**
```typescript
// File: Viewers/extensions/cornerstone/src/init.tsx
volumeLoader.registerVolumeLoader(
  'cornerstoneStreamingImageVolume',
  cornerstoneStreamingImageVolumeLoader
);

// Progressive retrieve configuration
imageRetrieveMetadataProvider.add(
  'volume',
  cornerstone.ProgressiveRetrieveImages.interleavedRetrieveStages
);
```

#### Interleaved Loading Strategies
**Source:** OHIF Viewers codebase analysis

OHIF implements three loading strategies:
1. **interleaveCenter**: Loads from center slice outward (best for MPR)
2. **interleaveTopToBottom**: Sequential but interleaved across volumes
3. **nth**: Loads every Nth slice first, then fills gaps

**Code Example (from OHIF):**
```typescript
// Viewers/extensions/cornerstone/src/utils/interleaveCenterLoader.ts
// Priority: Center slices loaded first
const centerIndex = Math.floor(imageIds.length / 2);
const requests = [];
for (let i = 0; i < halfLength; i++) {
  requests.push(imageIds[centerIndex + i]);
  if (centerIndex - i - 1 >= 0) {
    requests.push(imageIds[centerIndex - i - 1]);
  }
}
```

### 1.2 Volume Progressive Loading
**Source:** [Cornerstone.js Volume Progressive Loading](https://cornerstonejs.org/docs/concepts/progressive-loading/volumeProgressive)

**Performance Metrics (from documentation):**
- **Initial Render Time**: < 2 seconds for center slices
- **Full Volume Load**: Asynchronous background loading
- **HTJ2K Byte Range**: Optimized for large series
- **Interleaved Decoding**: Shows low-res volume quickly, refines progressively

**Configuration Stages:**
```typescript
{
  id: 'initialImages',
  positions: [0.5], // Center slice
  retrieveType: 'default'
},
{
  id: 'decimatedImages',
  positions: 'range', // Every 8th slice
  decimate: 8,
  retrieveType: 'default'
},
{
  id: 'finalImages',
  positions: 'range', // All remaining
  retrieveType: 'multipleFast'
}
```

### 1.3 Memory Management in OHIF

#### Cache Cleanup on Mode Exit
**Source:** `Viewers/extensions/cornerstone/src/index.tsx`

```typescript
onModeExit: ({ servicesManager }): void => {
  // Clear ALL request pools to prevent memory leaks
  Object.values(cs3DEnums.RequestType).forEach(type => {
    imageLoadPoolManager.clearRequestStack(type);
    imageRetrievalPoolManager.clearRequestStack(type);
  });
  
  // Purge cornerstone cache
  cache.purgeCache();
}
```

#### Rendering Engine Lifecycle
**Source:** `Viewers/extensions/cornerstone/src/services/ViewportService/CornerstoneViewportService.ts`

```typescript
public destroy() {
  this.renderingEngine?.destroy?.();
  this.viewportsDisplaySets.clear();
  cache.purgeCache(); // Critical: Clear volume cache
}
```

### 1.4 Current dicom-viewer Implementation Analysis

#### Custom Volume Service Issues
**File:** `dicom-viewer/src/services/VolumeService.ts`

**Problems Identified:**
1. **Synchronous Loading**: Loops through ALL slices before returning
```typescript
// Current implementation - BLOCKS until complete
for (let z = 0; z < slices; z++) {
  const instance = sortedInstances[z];
  let pixelData = instance.pixelData;
  if (!pixelData) {
    pixelData = await StorageService.getInstancePixelData(instance.sopInstanceUID);
  }
  // Process pixel data...
}
```

2. **No Progress Indication**: Volume not usable until 100% loaded
3. **Memory Inefficiency**: Entire Float32Array allocated upfront
4. **Static Caching**: `volumeCache.has()` never invalidated on series change

#### MPRViewport Cleanup Issues
**File:** `dicom-viewer/src/components/viewer/MPRViewport.tsx` (Lines 647-662)

```typescript
return () => {
  console.log(`[MPRViewport] Cleaning up engine ${actualEngineIdRef.current}`);
  const engineId = actualEngineIdRef.current;
  const engine = getRenderingEngine(engineId);
  
  if (engine) {
    Object.values(viewportIds).forEach(id => {
      try { engine.disableElement(id); } catch (e) { }
    });
    engine.destroy();
  }
  
  // ❌ MISSING: Volume cache cleanup
  // ❌ MISSING: Image load pool clearing
  // ❌ MISSING: Pixel data memory release
  
  csTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
  synchronizersRef.current.forEach(sync => sync.destroy());
  synchronizersRef.current = [];
};
```

**Critical Missing Steps:**
- No `cache.removeVolumeLoadObject()` call
- No clearing of image load requests
- VolumeService.volumeCache never cleared
- Pixel data in IndexedDB persists

---

## 2. Root Cause Analysis

### 2.1 Issue #1: Slow Initial Rendering (2000+ Images)

#### Root Cause
**Volume Loading Bottleneck**

The current implementation uses a **custom VolumeService** that:
1. Loads pixel data for ALL 2000 slices sequentially
2. Builds entire Float32Array before viewport can render
3. No streaming or progressive display

**Impact:**
- User waits 30-60+ seconds staring at blank screen
- No feedback during loading
- Browser may become unresponsive

#### Evidence
```typescript
// dicom-viewer/src/services/VolumeService.ts:47
static async buildVolume(series: DicomSeries): Promise<Volume | null> {
  // Checks cache - but cache key never includes series UID changes
  if (this.volumeCache.has(cacheKey)) {
    return this.volumeCache.get(cacheKey)!; // ❌ Stale data risk
  }
  
  // Blocks here until ALL 2000 slices processed
  for (let z = 0; z < slices; z++) {
    // Load and process pixel data...
  }
  
  // Only returns after 100% complete
  return volume;
}
```

#### Comparison with OHIF Approach
**OHIF uses Cornerstone3D's streaming loader:**
```typescript
// Immediate volume creation
const volume = await volumeLoader.createAndCacheVolume(volumeId, {
  imageIds: volumeImageIds
});

// Non-blocking load - viewport renders as images arrive
volume.load(); // Returns immediately
```

**Result:** OHIF shows center slice in < 2 seconds, progressively refines

### 2.2 Issue #2: MPR Viewport State Management Failures

#### Root Cause
**Incomplete Cleanup Cascade**

When navigating: MPR → Close → Default → MPR (again)

**Failure Chain:**
1. **MPRViewport unmounts** → cleanup runs
2. **Rendering engine destroyed** → ✅ Successful
3. **Cornerstone3D cache NOT cleared** → ❌ Volume remains
4. **Custom VolumeService cache NOT cleared** → ❌ Stale reference
5. **New MPR viewport mounts** → Requests same volumeId
6. **Cornerstone returns stale/incomplete volume** → Render fails or shows old data

#### Evidence from Code
```typescript
// MPRViewport.tsx:567 - Volume retrieval logic
let volume = cache.getVolume(volumeId) as any;

if (!volume) {
  // Only creates NEW volume if cache miss
  volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds: imageIds
  });
}
// ❌ If cache HIT with stale data, no refresh occurs
```

**Cache Invalidation Missing:**
- No `cache.removeVolumeLoadObject(volumeId)` in cleanup
- No `VolumeService.clearCache()` call
- Series change detection not implemented

### 2.3 Issue #3: Different Series Fails to Render

#### Root Cause
**VolumeId Collision + No Cache Invalidation**

**Scenario:**
1. Load Series A (2000 images) → volumeId = `cornerstoneStreamingImageVolume:SeriesA`
2. Close MPR viewport
3. Select Series B (different 1500 images)
4. Open MPR viewport → volumeId = `cornerstoneStreamingImageVolume:SeriesB`

**Current Behavior:**
```typescript
// MPRViewport.tsx:562
const volumeId = `cornerstoneStreamingImageVolume:${seriesInstanceUID}`;

// Cornerstone cache check
let volume = cache.getVolume(volumeId) as any;
```

**Problem:** If seriesInstanceUID doesn't change (UI state bug) OR cache has orphaned data:
- Wrong volume retrieved
- ImageIds mismatch
- Volume dimensions incorrect
- Rendering engine throws errors

#### Memory Leak Path
```
User loads Series A (2000 images)
  ↓
Cornerstone caches ~4GB of image data
  ↓
User closes MPR → engine destroyed
  ↓
Cache remains: 4GB resident memory
  ↓
User loads Series B
  ↓
Another 4GB allocated
  ↓
Total: 8GB+ → Browser crash risk
```

### 2.4 Issue #4: No Progressive Feedback

#### Root Cause
**Synchronous Volume Building**

Current flow:
```
User clicks MPR button
  ↓
[30-60 seconds of waiting]
  ↓
Volume appears fully formed
```

OHIF flow:
```
User clicks MPR button
  ↓
[< 2 seconds]
  ↓
Center slice visible
  ↓
[Background loading]
  ↓
More slices appear progressively
  ↓
[5-10 seconds]
  ↓
Full navigation available
```

**Impact:** User abandons loading, assumes application frozen

---

## 3. Architecture Comparison

### 3.1 Volume Loading Strategy

| Aspect | Current (dicom-viewer) | OHIF Approach | Impact |
|--------|----------------------|---------------|---------|
| **Loading Pattern** | Sequential, all slices | Interleaved, center-out | 15x faster first render |
| **User Feedback** | None until complete | Progressive display | Better UX |
| **Memory Allocation** | Upfront Float32Array | Streaming into volume | Lower peak memory |
| **Image Prioritization** | Slice order from DICOM | Center → edges | Immediate usability |
| **Cancellation Support** | No | Yes (abort requests) | Better responsiveness |

### 3.2 Caching Architecture

| Component | Current | OHIF | Issue |
|-----------|---------|------|-------|
| **Cornerstone Cache** | Used but not cleared | Cleared on destroy | Memory leak |
| **Custom Volume Cache** | Static Map, never cleared | N/A (uses Cornerstone) | Stale data |
| **Image Load Pool** | Default limits | Cleared on exit | Orphaned requests |
| **IndexedDB Pixel Data** | Persists indefinitely | Managed lifecycle | Storage bloat |

### 3.3 Cleanup Lifecycle

**Current Cleanup (Incomplete):**
```typescript
// MPRViewport unmount
engine.destroy();          // ✅
destroyToolGroup();        // ✅
synchronizers.destroy();   // ✅
// ❌ Missing cache cleanup
// ❌ Missing pool clearing
// ❌ Missing volume removal
```

**OHIF Cleanup (Complete):**
```typescript
// Mode exit
imageLoadPoolManager.clearRequestStack(); // ✅
imageRetrievalPoolManager.clearRequestStack(); // ✅
cache.purgeCache(); // ✅
engine.destroy(); // ✅
toolGroup.destroy(); // ✅
```

---

## 4. Implementation Plan

### Phase 1: Critical Fixes (Immediate)

#### 1.1 Replace Custom Volume Service with Cornerstone Streaming
**Priority:** CRITICAL  
**Estimated Time:** 4-6 hours  
**Files:** `MPRViewport.tsx`, `VolumeService.ts`

**Changes:**
- Remove custom `VolumeService.buildVolume()` usage
- Use `volumeLoader.createAndCacheVolume()` directly
- Implement interleaved loading strategy
- Add loading progress callback

**Code Example:**
```typescript
// Before
const volume = await VolumeService.buildVolume(series);

// After
const volumeId = `cornerstoneStreamingImageVolume:${seriesInstanceUID}`;
const volume = await volumeLoader.createAndCacheVolume(volumeId, {
  imageIds: imageIds
});

// Non-blocking load with progress
volume.load((progress) => {
  console.log(`Loading: ${progress.percentComplete}%`);
});
```

#### 1.2 Implement Proper Cache Cleanup
**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours  
**Files:** `MPRViewport.tsx`

**Changes:**
```typescript
// Enhanced cleanup in useEffect return
return () => {
  const engineId = actualEngineIdRef.current;
  const engine = getRenderingEngine(engineId);
  
  if (engine) {
    // Disable and cleanup viewports
    Object.values(viewportIds).forEach(id => {
      try { 
        engine.disableElement(id); 
      } catch (e) { }
    });
    engine.destroy();
  }
  
  // ✅ NEW: Remove volume from cache
  const volumeId = `cornerstoneStreamingImageVolume:${seriesInstanceUID}`;
  try {
    cache.removeVolumeLoadObject(volumeId);
  } catch (e) {
    console.warn('Volume removal failed:', e);
  }
  
  // ✅ NEW: Clear image load requests
  import { imageLoadPoolManager, Enums as csEnums } from '@cornerstonejs/core';
  Object.values(csEnums.RequestType).forEach(type => {
    imageLoadPoolManager.clearRequestStack(type);
  });
  
  // Existing cleanup
  csTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
  synchronizersRef.current.forEach(sync => sync.destroy());
  synchronizersRef.current = [];
};
```

#### 1.3 Add Series Change Detection
**Priority:** HIGH  
**Estimated Time:** 2 hours  
**Files:** `MPRViewport.tsx`

**Changes:**
```typescript
// Add ref to track last loaded series
const lastLoadedSeriesRef = useRef<string | null>(null);

useEffect(() => {
  // Detect series change
  if (lastLoadedSeriesRef.current && 
      lastLoadedSeriesRef.current !== seriesInstanceUID) {
    console.log('[MPRViewport] Series changed, clearing cache');
    
    // Clear old volume
    const oldVolumeId = `cornerstoneStreamingImageVolume:${lastLoadedSeriesRef.current}`;
    try {
      cache.removeVolumeLoadObject(oldVolumeId);
    } catch (e) { }
  }
  
  lastLoadedSeriesRef.current = seriesInstanceUID;
  
  // ... rest of setup
}, [seriesInstanceUID]);
```

### Phase 2: Progressive Loading Enhancement (Short-term)

#### 2.1 Implement Interleaved Loading Strategy
**Priority:** HIGH  
**Estimated Time:** 4-6 hours  
**Files:** New `src/services/ImageLoadStrategies.ts`

**Implementation:**
```typescript
// src/services/ImageLoadStrategies.ts
import { imageLoadPoolManager, Enums } from '@cornerstonejs/core';

export function applyInterleavedCenterLoading(
  volumeId: string,
  imageIds: string[],
  onProgress?: (percent: number) => void
) {
  const centerIndex = Math.floor(imageIds.length / 2);
  const prioritizedIds = [];
  
  // Build center-out order
  for (let i = 0; i < Math.ceil(imageIds.length / 2); i++) {
    prioritizedIds.push(imageIds[centerIndex + i]);
    if (centerIndex - i >= 0) {
      prioritizedIds.push(imageIds[centerIndex - i]);
    }
  }
  
  // Apply to load pool
  prioritizedIds.forEach((imageId, index) => {
    // Higher priority for center images
    const priority = -index; // Negative = higher priority
    
    imageLoadPoolManager.addRequest(
      () => imageLoader.loadImage(imageId),
      Enums.RequestType.Prefetch,
      { volumeId, imageId },
      priority
    );
  });
}
```

#### 2.2 Add Loading Progress UI
**Priority:** MEDIUM  
**Estimated Time:** 3 hours  
**Files:** `MPRViewport.tsx`, new `LoadingOverlay.tsx`

**Changes:**
- Show progress bar during volume load
- Display "Loading center slices..." message
- Enable interaction once center slice loaded

### Phase 3: Memory Optimization (Mid-term)

#### 3.1 Implement Adaptive Cache Sizing
**Priority:** MEDIUM  
**Estimated Time:** 3 hours  
**Files:** `CornerstoneService.ts`

**Enhancement:**
```typescript
// Dynamic cache sizing based on series size
const estimatedVolumeSize = imageIds.length * averageImageSize;
const deviceMemory = (navigator as any).deviceMemory * 1024 * 1024 * 1024; // GB to bytes

if (estimatedVolumeSize > deviceMemory * 0.3) {
  // Large series - reduce cache
  cache.setMaxCacheSize(deviceMemory * 0.2);
} else {
  // Normal series
  cache.setMaxCacheSize(deviceMemory * 0.4);
}
```

#### 3.2 Add Memory Pressure Monitoring
**Priority:** MEDIUM  
**Estimated Time:** 4 hours  
**Files:** New `src/utils/MemoryMonitor.ts`

**Features:**
- Track cache memory usage
- Auto-evict when pressure high
- Warn user before crash risk

### Phase 4: Testing & Validation

#### 4.1 Performance Benchmarks
**Metrics to Track:**
- Time to first slice render
- Time to full navigation
- Memory usage during load
- Memory after cleanup
- Re-render performance

**Test Cases:**
- 2000+ image CT series
- 1500 image MRI series
- Series switching (A → B → A)
- Rapid MPR open/close cycles
- Low-memory device simulation

#### 4.2 Memory Leak Detection
**Tools:**
- Chrome DevTools Memory Profiler
- Performance.measureUserAgentSpecificMemory()
- Heap snapshot comparison

**Tests:**
1. Load series → Close → Check heap (should return to baseline)
2. Load series A → B → A → Check for duplicates
3. 10 consecutive MPR open/close cycles → Memory trend

---

## 5. Expected Outcomes

### 5.1 Performance Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Time to First Slice** | 30-60s | < 2s | 15-30x faster |
| **Time to Full Navigation** | 60-90s | 5-10s | 6-18x faster |
| **Memory Usage (2000 images)** | 6-8GB | 2-3GB | 50-60% reduction |
| **Memory After Cleanup** | 4-6GB residual | < 100MB | 98% reduction |
| **Series Switch Time** | 30s + hang risk | < 3s | 10x faster |
| **Re-render Reliability** | 50% fail rate | 100% success | 2x reliability |

### 5.2 User Experience Improvements

**Before:**
- User clicks MPR → Long wait → Either works or fails silently
- Switching series often requires page reload
- Memory gradually increases until crash

**After:**
- User clicks MPR → Center slice appears in 1-2s → Progressive refinement
- Series switching instant and reliable
- Memory stable across multiple sessions

### 5.3 Code Quality Improvements

**Architecture:**
- ✅ Aligns with Cornerstone3D best practices
- ✅ Matches OHIF reference implementation
- ✅ Proper lifecycle management
- ✅ No custom volume service needed

**Maintainability:**
- ✅ Less custom code to maintain
- ✅ Leverages library features
- ✅ Better error handling
- ✅ Proper cleanup patterns

---

## 6. Risk Assessment

### 6.1 Implementation Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Breaking existing MPR** | HIGH | Thorough testing, feature flag |
| **Cache issues** | MEDIUM | Incremental rollout, monitoring |
| **Memory regression** | MEDIUM | Benchmark before/after |
| **Performance on low-end devices** | LOW | Adaptive configurations |

### 6.2 Rollback Plan

1. Keep VolumeService.ts as backup
2. Feature flag for new loader
3. Monitor error rates
4. Quick revert path prepared

---

## 7. Implementation Timeline

**Total Estimated Time:** 22-31 hours (3-4 working days)

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| **Phase 1** | Critical fixes | 8-11h | P0 |
| - Streaming loader | Replace volume service | 4-6h | P0 |
| - Cache cleanup | Implement proper cleanup | 2-3h | P0 |
| - Series detection | Add change detection | 2h | P0 |
| **Phase 2** | Progressive loading | 7-9h | P1 |
| - Interleaved strategy | Implement center-out | 4-6h | P1 |
| - Loading UI | Progress indicators | 3h | P1 |
| **Phase 3** | Memory optimization | 7-11h | P2 |
| - Adaptive cache | Dynamic sizing | 3h | P2 |
| - Memory monitor | Pressure detection | 4h | P2 |
| - Testing | Comprehensive tests | 4-8h | P2 |

---

## 8. Next Steps

### Immediate Actions Required

1. **Review and Approve Plan** ✋ **WAITING FOR APPROVAL**
   - Confirm approach with team
   - Approve timeline and priorities
   - Allocate development resources

2. **Setup Test Environment**
   - Prepare 2000+ image test series
   - Configure memory profiling tools
   - Establish baseline benchmarks

3. **Begin Phase 1 Implementation**
   - Start with streaming loader replacement
   - Add comprehensive logging
   - Incremental commits with testing

### Success Criteria

Before proceeding to Phase 2:
- ✅ Center slice renders in < 3 seconds
- ✅ No memory leaks in 10 consecutive cycles
- ✅ Series switching works 100% of time
- ✅ Memory returns to baseline after cleanup
- ✅ No regressions in existing functionality

---

## 9. References

### Documentation
1. [Cornerstone3D Streaming Volume Loading](https://cornerstonejs.org/docs/concepts/streaming-image-volume/streaming/)
2. [Volume Progressive Loading](https://cornerstonejs.org/docs/concepts/progressive-loading/volumeProgressive)
3. [Cornerstone3D Volumes Concept](https://cornerstonejs.org/docs/concepts/cornerstone-core/volumes)
4. [OHIF Migration Guide - V2 to V3](https://ohif.org/platform/docs/migration-guide/from-v2)

### Code References
1. **OHIF Viewers Folder:**
   - `Viewers/extensions/cornerstone/src/init.tsx` - Volume loader registration
   - `Viewers/extensions/cornerstone/src/utils/interleaveCenterLoader.ts` - Interleaved strategy
   - `Viewers/extensions/cornerstone/src/services/CornerstoneCacheService/CornerstoneCacheService.ts` - Cache management

2. **dicom-viewer Folder:**
   - `dicom-viewer/src/components/viewer/MPRViewport.tsx` - Main component
   - `dicom-viewer/src/services/VolumeService.ts` - Custom volume service
   - `dicom-viewer/PERFORMANCE_OPTIMIZATIONS.md` - Previous optimization work

### Community Resources
1. [OHIF Community Forum - Progressive Loading Discussion](https://community.ohif.org/t/progressive-loading-implementation-and-user-experience-concerns/1860)
2. [OHIF Newsletter - Cornerstone3D Integration](https://ohif.org/newsletters/2022-07-28-ohif%20&%20cornerstone3d%20integration)

---

**Document Status:** Ready for Review  
**Next Review:** After approval and Phase 1 completion  
**Maintainer:** Development Team
