# MPR Viewport Performance - Quick Summary

**Status:** 🔴 Critical Issues Identified | ⏳ Awaiting Approval for Implementation

---

## 🔥 Critical Issues

### 1. Slow Initial Rendering (2000+ Images)
**Problem:** 30-60 second wait before seeing any image  
**Root Cause:** Custom volume service loads ALL slices synchronously before rendering  
**OHIF Approach:** Streaming loader shows center slice in < 2 seconds

### 2. Viewport State Fails on Reopen
**Problem:** MPR → Close → MPR (again) = no render or late render  
**Root Cause:** Incomplete cache cleanup leaves stale volumes  
**Missing:** `cache.removeVolumeLoadObject()`, `clearRequestStack()`

### 3. Different Series Fails to Render
**Problem:** Series A → Close → Series B = render failure  
**Root Cause:** No cache invalidation between series switches  
**Impact:** Memory leaks accumulate, browser crash risk

---

## 📊 Key Findings

| Issue | Current State | OHIF Standard | Gap |
|-------|---------------|---------------|-----|
| **First render time** | 30-60s | < 2s | 15-30x slower |
| **Memory cleanup** | Incomplete | Full purge | Leaks 4-6GB |
| **Loading strategy** | Sequential | Interleaved | No prioritization |
| **Progressive display** | None | Yes | Poor UX |

---

## 🎯 Immediate Fixes Needed

### Fix #1: Replace Custom Volume Loader (CRITICAL - 4-6h)
```typescript
// ❌ Current (dicom-viewer/src/services/VolumeService.ts)
const volume = await VolumeService.buildVolume(series); // Blocks 30-60s

// ✅ Recommended (OHIF approach)
const volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
volume.load(); // Non-blocking, progressive
```

### Fix #2: Add Proper Cleanup (CRITICAL - 2-3h)
```typescript
// Add to MPRViewport.tsx cleanup
return () => {
  // ... existing cleanup ...
  
  // ✅ NEW: Remove volume from cache
  cache.removeVolumeLoadObject(volumeId);
  
  // ✅ NEW: Clear image load requests
  Object.values(csEnums.RequestType).forEach(type => {
    imageLoadPoolManager.clearRequestStack(type);
  });
};
```

### Fix #3: Series Change Detection (HIGH - 2h)
```typescript
// Track series changes and invalidate cache
const lastLoadedSeriesRef = useRef<string | null>(null);

if (lastLoadedSeriesRef.current !== seriesInstanceUID) {
  cache.removeVolumeLoadObject(oldVolumeId); // Clear old
}
```

---

## 📈 Expected Results

### Performance Improvements
- **Time to First Image:** 30-60s → **< 2s** (15-30x faster)
- **Memory Usage:** 6-8GB → **2-3GB** (50-60% reduction)
- **Memory After Close:** 4-6GB residual → **< 100MB** (98% reduction)
- **Series Switch:** 30s + hang → **< 3s** (10x faster)
- **Reliability:** 50% fail rate → **100% success**

### User Experience
**Before:** Long wait → Either works or silently fails  
**After:** Immediate center slice → Progressive refinement → Reliable switching

---

## 🛠️ Implementation Plan

### Phase 1: Critical Fixes (8-11 hours) - P0
1. ✅ **Replace volume loader** with Cornerstone streaming (4-6h)
2. ✅ **Implement cache cleanup** in useEffect return (2-3h)
3. ✅ **Add series change detection** (2h)

### Phase 2: Progressive Loading (7-9 hours) - P1
4. **Implement interleaved loading** (center-out) (4-6h)
5. **Add loading progress UI** (3h)

### Phase 3: Memory Optimization (7-11 hours) - P2
6. **Adaptive cache sizing** (3h)
7. **Memory pressure monitoring** (4h)
8. **Comprehensive testing** (4-8h)

**Total Time:** 22-31 hours (3-4 days)

---

## 🎓 Key Learnings from OHIF

### 1. Streaming Volume Loader
OHIF uses `cornerstoneStreamingImageVolumeLoader`:
- Pre-fetches metadata only
- Streams pixel data progressively
- Renders as images arrive
- No blocking wait

### 2. Interleaved Loading Strategy
OHIF loads from center outward:
```
Center slice (index 1000) → 1001, 999 → 1002, 998 → ...
```
Result: User sees critical anatomy immediately

### 3. Complete Lifecycle Management
OHIF's cleanup on mode exit:
```typescript
imageLoadPoolManager.clearRequestStack();
imageRetrievalPoolManager.clearRequestStack();
cache.purgeCache();
engine.destroy();
```

---

## 📚 Reference Files

### OHIF Viewers (Reference Implementation)
- `Viewers/extensions/cornerstone/src/init.tsx` - Volume loader setup
- `Viewers/extensions/cornerstone/src/utils/interleaveCenterLoader.ts` - Interleaved strategy
- `Viewers/extensions/cornerstone/src/services/ViewportService/CornerstoneViewportService.ts` - Cleanup

### dicom-viewer (Current Implementation)
- `dicom-viewer/src/components/viewer/MPRViewport.tsx` - Main component (lines 411-663)
- `dicom-viewer/src/services/VolumeService.ts` - Custom volume service (needs replacement)
- `dicom-viewer/PERFORMANCE_OPTIMIZATIONS.md` - Phase 1 work completed

### Documentation
- [Cornerstone3D Streaming](https://cornerstonejs.org/docs/concepts/streaming-image-volume/streaming/)
- [Volume Progressive Loading](https://cornerstonejs.org/docs/concepts/progressive-loading/volumeProgressive)

---

## ⚠️ Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing MPR | HIGH | Feature flag, thorough testing |
| Cache issues | MEDIUM | Incremental rollout, monitoring |
| Memory regression | MEDIUM | Benchmark before/after |

---

## ✅ Success Criteria

Before deploying:
- ✅ Center slice renders in < 3 seconds
- ✅ No memory leaks in 10 consecutive open/close cycles
- ✅ Series switching works 100% of time
- ✅ Memory returns to baseline after cleanup
- ✅ No regressions in existing functionality

---

## 🚀 Next Steps

1. **Review & Approve** this plan ⏳ **WAITING**
2. **Setup test environment** (2000+ image series)
3. **Begin Phase 1 implementation**
4. **Incremental testing and validation**
5. **Proceed to Phase 2 after success criteria met**

---

**Full Details:** See [MPR_VIEWPORT_PERFORMANCE_INVESTIGATION.md](./MPR_VIEWPORT_PERFORMANCE_INVESTIGATION.md)  
**Created:** January 28, 2026  
**Status:** Ready for Implementation Approval
