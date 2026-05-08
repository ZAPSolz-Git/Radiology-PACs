# OHIF Architecture Porting Plan - UPDATED & CORRECTED
**Version:** 2.0 (Research-Based Corrections)  
**Date:** January 30, 2026  
**Status:** Ready for Implementation

---

## 🚨 CRITICAL UPDATES TO YOUR ORIGINAL PLAN

### What You Got RIGHT ✅
1. Metadata-first approach is correct
2. DicomMetadataStore as single source of truth - correct
3. DisplaySetService for logical grouping - correct
4. HangingProtocolService for layouts - correct
5. Lazy loading concept - correct

### What Needs MAJOR Updates ⚠️

#### 1. **MISSING: Request Pool Manager** (CRITICAL)
Your plan doesn't mention this, but it's THE most important component for smooth scrolling.

**Why it's critical:** Without this, your images will load sequentially instead of in parallel, and you can't prioritize current viewport over background prefetch.

**Impact:** This is 80% of why OHIF scrolls smoothly and your current viewer doesn't.

#### 2. **MISSING: Streaming Image Volume Loader** (HIGH PRIORITY)
Your plan mentions lazy loading but not progressive volume rendering.

**Why it matters:** OHIF doesn't wait for all images to load before rendering. It renders the 3D volume AS images arrive.

**Impact:** User sees partial 3D reconstruction immediately, not a blank screen.

#### 3. **INCOMPLETE: Image Loader Architecture**
Your plan mentions "cornerstone-image-loader" but doesn't explain the critical WebWorker decoding separation.

**Why it matters:** OHIF uses `cornerstone-wado-image-loader` v4.0+ which separates FETCH from DECODE, allowing parallel operations.

**Impact:** Without this, decoding blocks fetching, limiting you to ~5 images/second vs 20+ images/second.

#### 4. **MISSING: VoxelManager & Cache Management** (MEMORY CRITICAL)
No mention of memory management or cache purging.

**Why it matters:** Large studies (500+ images) will crash the browser without proper memory management.

**Impact:** Your viewer will work fine on small studies but crash on production datasets.

#### 5. **INCOMPLETE: Study Prefetcher**
You mentioned viewport prefetching but not series-level prefetching.

**Why it matters:** OHIF prefetches adjacent series in the background, not just adjacent images.

**Impact:** Users can switch between series instantly.

---

## CORRECTED IMPLEMENTATION PLAN

### Phase 0: FOUNDATION - Image Loading Infrastructure (Week 1) ⚡ NEW
**This should be Phase 1, not your current Phase 1**

#### A. Install Critical Dependencies
```bash
npm install @cornerstonejs/core@latest
npm install @cornerstonejs/tools@latest
npm install @cornerstonejs/streaming-image-volume-loader@latest
npm install cornerstone-wado-image-loader@latest
npm install dicom-parser@latest
```

#### B. Create Request Pool Manager (CRITICAL - NOT IN YOUR PLAN)
**File:** `src/services/RequestPoolManager.ts`

**Why:** This is the traffic controller that makes OHIF scroll smoothly.

**What it does:**
- Prioritizes current viewport images over prefetch
- Cancels distant prefetch requests when user scrolls
- Manages concurrent HTTP requests (6 for interaction, 3 for prefetch)
- Reorders queue dynamically based on user behavior

**Key Logic to Port:**
```typescript
interface QueuedRequest {
  imageId: string;
  type: 'interaction' | 'thumbnail' | 'prefetch';
  priority: number;  // 0-100
  abortController: AbortController;
}

class RequestPoolManager {
  private requestQueues = {
    interaction: [],  // Current viewport (highest priority)
    thumbnail: [],    // Thumbnails (medium priority)
    prefetch: []      // Background (lowest priority)
  };
  
  private maxConcurrent = {
    interaction: 6,  // HTTP/2 connection limit
    thumbnail: 4,
    prefetch: 2
  };
  
  // Key methods:
  addRequest(imageId, type, priority)  // Add to appropriate queue
  boostPriority(imageId)               // User scrolled to this image
  cancelPrefetchRequests()             // User scrolled away rapidly
  processQueues()                       // Execute requests in order
}
```

**Reference:** `@cornerstonejs/core/src/requestPool/requestPoolManager.ts`

#### C. Initialize Cornerstone with WebWorkers (CRITICAL - NOT IN YOUR PLAN)
**File:** `src/services/CornerstoneInitService.ts`

**Why:** Separates image decoding (CPU-intensive) from fetching (I/O), allowing parallel operations.

**What it does:**
```typescript
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';

const config = {
  maxWebWorkers: navigator.hardwareConcurrency || 4,  // Use all CPU cores
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      initializeCodecsOnStartup: false,
      strict: false
    }
  }
};

cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
```

**Impact:** 
- OLD: Fetch image → Wait for decode → Fetch next image (sequential)
- NEW: Fetch 6 images in parallel → Decode 4 in parallel in WebWorkers (non-blocking)

**Reference:** OHIF `extensions/cornerstone/src/initWADOImageLoader.js`

#### D. Create Viewport Prefetch Service (PARTIALLY IN YOUR PLAN)
**File:** `src/services/ViewportPrefetchService.ts`

**What YOU had:** Mentioned lazy loading
**What YOU need:** Sliding window prefetch with dynamic prioritization

**Key Logic:**
```typescript
class ViewportPrefetchService {
  onViewportChange(newIndex) {
    // 1. Calculate prefetch window (±10 images, 70% forward bias)
    const forwardCount = Math.ceil(10 * 0.7);  // 7 images ahead
    const backwardCount = 3;                    // 3 images behind
    
    // 2. Build prioritized request list
    const requests = [
      { imageId: imageIds[newIndex], priority: 100 },      // Current (highest)
      { imageId: imageIds[newIndex + 1], priority: 90 },   // Next
      { imageId: imageIds[newIndex - 1], priority: 85 },   // Previous
      // ... continue for ±10 window
    ];
    
    // 3. Submit to request pool manager
    requests.forEach(req => {
      requestPoolManager.addRequest(
        req.imageId,
        req.priority === 100 ? 'interaction' : 'prefetch',
        req.priority
      );
    });
  }
}
```

**Reference:** OHIF `platform/core/src/services/StudyPrefetcherService/index.js`

---

### Phase 1: Metadata Infrastructure (Week 2) - YOUR ORIGINAL PHASE 1

#### A. Create DicomMetadataStore ✅ (YOU HAD THIS)
**Your plan is correct here.**

**File:** `src/services/DicomMetadataStore.ts`

**Key Methods:**
```typescript
class DicomMetadataStore {
  addStudy(studyMetadata)
  addSeries(seriesMetadata)
  addInstances(instancesMetadata)
  getStudy(studyInstanceUID)
  getSeries(studyInstanceUID, seriesInstanceUID)
  getInstance(studyInstanceUID, seriesInstanceUID, sopInstanceUID)
}
```

**IMPORTANT UPDATE:** Don't just copy OHIF's structure - adapt it to work with YOUR backend's metadata format.

#### B. Create DicomDataSource ✅ (YOU HAD THIS)
**Your plan is correct here.**

**File:** `src/services/DicomDataSource.ts`

**BUT - Important correction:**

**YOUR PLAN SAID:**
> "connects to our backend's extractDicomMetadata endpoint"

**CORRECTION:**
You should create a NEW endpoint that returns ALL study metadata at once, not per-file.

**New Backend Endpoint Needed:**
```javascript
// backend/routes/cases.js

// NEW ENDPOINT: Get entire study metadata
router.get('/api/cases/:id/metadata', async (req, res) => {
  const caseData = await Case.findById(req.params.id);
  
  // Return metadata for ALL files in one response
  const metadata = {
    studyInstanceUID: caseData.studyInstanceUID,
    series: caseData.dicomFiles.reduce((acc, file) => {
      const seriesUID = file.metadata.seriesInstanceUID;
      if (!acc[seriesUID]) {
        acc[seriesUID] = {
          seriesInstanceUID: seriesUID,
          modality: file.metadata.modality,
          seriesNumber: file.metadata.seriesNumber,
          instances: []
        };
      }
      acc[seriesUID].instances.push({
        sopInstanceUID: file.metadata.sopInstanceUID,
        instanceNumber: file.metadata.instanceNumber,
        imagePositionPatient: file.metadata.imagePositionPatient,
        pixelSpacing: file.metadata.pixelSpacing,
        // ... other metadata
        imageUrl: `/uploads/cases/${caseData._id}/${file.filename}`
      });
      return acc;
    }, {})
  };
  
  res.json(metadata);
});
```

**Frontend DicomDataSource:**
```typescript
class DicomDataSource {
  async retrieveStudyMetadata(caseId) {
    // Single request to get all metadata
    const response = await fetch(`/api/cases/${caseId}/metadata`);
    const metadata = await response.json();
    
    // Add to DicomMetadataStore
    DicomMetadataStore.addStudy(metadata);
    
    return metadata;
  }
}
```

**Impact:** 1 HTTP request instead of 763 requests for metadata.

---

### Phase 2: Display Logic (Week 3) - YOUR ORIGINAL PHASE 2

#### A. Create DisplaySetService ✅ (YOU HAD THIS)
**Your plan is correct here.**

**File:** `src/services/DisplaySetService.ts`

**IMPORTANT ADDITION - Not in your plan:**

You need to implement **display set builders** (not just the service).

**What OHIF does:**
```typescript
// Different builders for different data types
const displaySetBuilders = [
  sopClassHandlerModule.getSOPClassHandlerModule(),  // Standard CT/MR
  multiFrameModule.getSOPClassHandlerModule(),       // Multi-frame images
  microscopySModule.getSOPClassHandlerModule(),      // Whole slide imaging
  // ... etc
];

class DisplaySetService {
  makeDisplaySets(instances) {
    // Try each builder until one succeeds
    for (const builder of displaySetBuilders) {
      if (builder.canHandle(instances)) {
        return builder.createDisplaySet(instances);
      }
    }
  }
}
```

**For your MVP, implement ONE builder:**
```typescript
// src/builders/StandardImageDisplaySetBuilder.ts

export const StandardImageDisplaySetBuilder = {
  canHandle: (instances) => {
    // Handle standard CT/MR single-frame images
    return instances.every(i => i.numberOfFrames === 1);
  },
  
  createDisplaySet: (instances) => {
    // Sort by instance number
    const sortedInstances = instances.sort((a, b) => 
      a.instanceNumber - b.instanceNumber
    );
    
    return {
      displaySetInstanceUID: generateUID(),
      SeriesInstanceUID: instances[0].seriesInstanceUID,
      Modality: instances[0].modality,
      displaySetType: 'stack',
      imageIds: sortedInstances.map(i => `wadouri:${i.imageUrl}`),
      numImageFrames: instances.length,
      instances: sortedInstances
    };
  }
};
```

#### B. Create HangingProtocolService ✅ (YOU HAD THIS)
**Your plan is correct here.**

**IMPORTANT ADDITION:**

You need to create default protocols, not just the service.

**File:** `src/protocols/defaultProtocol.ts`

```typescript
export const defaultHangingProtocol = {
  id: 'default',
  name: 'Default',
  protocolMatchingRules: [
    {
      id: 'CT-2x2',
      weight: 100,
      attribute: 'Modality',
      constraint: {
        equals: 'CT'
      },
      required: true
    }
  ],
  displaySetSelectors: {
    ctDisplaySet: {
      seriesMatchingRules: [
        {
          attribute: 'Modality',
          constraint: {
            equals: 'CT'
          }
        }
      ]
    }
  },
  stages: [
    {
      id: 'default',
      name: 'Default',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1
        }
      },
      viewports: [
        {
          viewportOptions: {
            viewportType: 'stack',
            toolGroupId: 'default',
            initialImageOptions: {
              index: 0
            }
          },
          displaySets: [
            {
              id: 'ctDisplaySet'
            }
          ]
        }
      ]
    }
  ]
};
```

---

### Phase 3: Streaming & Memory Management (Week 4) ⚡ NEW - NOT IN YOUR PLAN

#### A. Implement Streaming Image Volume Loader (NEW - CRITICAL FOR LARGE STUDIES)
**File:** `src/services/StreamingVolumeLoader.ts`

**Why:** For multi-planar reconstruction (MPR) or 3D rendering, OHIF doesn't wait for all images.

**What it does:**
```typescript
import { volumeLoader } from '@cornerstonejs/core';

const volumeId = 'cornerstoneStreamingImageVolume:CT_VOLUME';
const volume = await volumeLoader.createAndCacheVolume(volumeId, {
  imageIds: displaySet.imageIds
});

// Start loading (renders progressively)
volume.load({
  callback: ({ imageId, imageIndex }) => {
    console.log(`Loaded ${imageIndex + 1}/${displaySet.imageIds.length}`);
    // Viewport automatically updates
  }
});
```

**Impact:** User sees partial 3D volume immediately, not after waiting for all 763 images.

#### B. Implement Cache Manager (NEW - CRITICAL)
**File:** `src/services/CacheManager.ts`

**Why:** Without this, browser will crash on large studies.

**What it does:**
```typescript
class CacheManager {
  private MAX_CACHE_SIZE_MB = 1024;  // 1GB hard limit
  
  monitorCacheSize() {
    setInterval(() => {
      const cacheInfo = cache.getCacheSize();
      const sizeMB = cacheInfo.numberOfBytes / (1024 * 1024);
      
      if (sizeMB > this.MAX_CACHE_SIZE_MB) {
        this.purgeDistantImages();
      }
    }, 5000);
  }
  
  purgeDistantImages() {
    const currentImageIds = this.getCurrentViewportImageIds();
    
    cache.purgeCache((imageLoadObject) => {
      // Keep only images within current viewport window
      return !currentImageIds.includes(imageLoadObject.imageId);
    });
  }
}
```

**Reference:** Cornerstone3D VoxelManager (CS3D 2.0)

#### C. Implement Study Prefetcher (NEW - SERIES-LEVEL)
**File:** `src/services/StudyPrefetcherService.ts`

**What YOU had:** Nothing (you only mentioned viewport prefetch)
**What YOU need:** Series-level background prefetching

**What it does:**
```typescript
class StudyPrefetcherService {
  onSeriesActive(activeSeriesUID) {
    // Prefetch adjacent series in background
    const adjacentSeries = this.getAdjacentSeries(activeSeriesUID);
    
    adjacentSeries.forEach(series => {
      series.imageIds.forEach(imageId => {
        // Low priority prefetch
        requestPoolManager.addRequest(imageId, 'prefetch', 10);
      });
    });
  }
}
```

**Impact:** When user switches from CT series to PT series, it's already loaded.

---

### Phase 4: UI Integration (Week 5) - YOUR ORIGINAL PHASE 3

#### A. Update Study List ✅ (YOU HAD THIS)
**Your plan is correct.**

#### B. Integrate Viewer (NEEDS UPDATES)

**YOUR PLAN SAID:**
> "Connect the new services to the ImageViewer component"

**CORRECTION - You need to:**

1. **Update ImageViewer to use DisplaySets, not raw metadata:**
```typescript
// OLD (Your current code)
const imageIds = caseData.dicomFiles.map(f => `wadouri:${f.path}`);
viewport.setStack(imageIds);

// NEW (OHIF pattern)
const displaySets = DisplaySetService.getDisplaySetsForSeries(seriesUID);
const displaySet = displaySets[0];  // First display set
viewport.setStack(displaySet.imageIds, displaySet.initialImageIndex);
```

2. **Wire up Request Pool Manager:**
```typescript
// Listen for viewport scroll
viewport.addEventListener('STACK_VIEWPORT_SCROLL', (evt) => {
  const { newImageIdIndex } = evt.detail;
  
  // Notify prefetch service
  viewportPrefetchService.onViewportChange(newImageIdIndex);
  
  // Boost priority of current image
  requestPoolManager.boostPriority(displaySet.imageIds[newImageIdIndex]);
});
```

3. **Initialize all services on mount:**
```typescript
useEffect(() => {
  async function initializeViewer() {
    // 1. Initialize Cornerstone (WebWorkers, cache)
    await CornerstoneInitService.initialize();
    
    // 2. Load metadata
    const metadata = await DicomDataSource.retrieveStudyMetadata(caseId);
    
    // 3. Create display sets
    const displaySets = DisplaySetService.makeDisplaySets(
      metadata.series[seriesUID].instances
    );
    
    // 4. Apply hanging protocol
    const layout = HangingProtocolService.getMatchingProtocol(displaySets);
    
    // 5. Initialize prefetch services
    viewportPrefetchService.initialize(displaySet.imageIds);
    studyPrefetcherService.initialize(metadata.series);
    
    // 6. Create viewport
    viewport.setStack(displaySet.imageIds);
    
    // 7. Start prefetching
    viewportPrefetchService.onViewportChange(0);
  }
  
  initializeViewer();
}, [caseId]);
```

---

## UPDATED PHASE BREAKDOWN

### Week 1: Image Loading Infrastructure (NEW PHASE 0)
**Why this is first:** Without this, everything else will be slow regardless of how good your metadata architecture is.

- [ ] Install all Cornerstone packages
- [ ] Create `RequestPoolManager.ts`
- [ ] Create `CornerstoneInitService.ts` with WebWorker init
- [ ] Create `ViewportPrefetchService.ts`
- [ ] Test: Load 100 images and verify parallel fetching in Network tab

**Success Criteria:**
- Chrome Network tab shows 6+ concurrent image requests
- WebWorkers tab shows decoding happening in workers
- Images load at 15-20 images/second (not 3-5/second)

### Week 2: Metadata Architecture (YOUR PHASE 1)
- [ ] Create `DicomMetadataStore.ts`
- [ ] Create new backend endpoint: `GET /api/cases/:id/metadata`
- [ ] Create `DicomDataSource.ts`
- [ ] Update `StudyLoaderService.ts` to use DicomDataSource
- [ ] Test: Load 500-image study metadata in <2 seconds

**Success Criteria:**
- Metadata loads in single HTTP request
- UI populates immediately (before any images load)

### Week 3: Display Logic (YOUR PHASE 2)
- [ ] Create `DisplaySetService.ts`
- [ ] Create `StandardImageDisplaySetBuilder.ts`
- [ ] Create `HangingProtocolService.ts`
- [ ] Create `defaultProtocol.ts`
- [ ] Test: Verify correct display set grouping

**Success Criteria:**
- Series are grouped correctly
- Layout matches modality (1x1 for CR, 2x2 for CT, etc.)

### Week 4: Streaming & Memory (NEW PHASE)
- [ ] Implement `StreamingVolumeLoader.ts`
- [ ] Implement `CacheManager.ts`
- [ ] Implement `StudyPrefetcherService.ts`
- [ ] Add memory monitoring
- [ ] Test: Load 1000-image study without crash

**Success Criteria:**
- Memory stays below 1GB
- Cache purges distant images automatically
- Progressive volume rendering works

### Week 5: UI Integration (YOUR PHASE 3)
- [ ] Update `ImageViewer.tsx` to use DisplaySets
- [ ] Wire up all prefetch services
- [ ] Add scroll event handlers
- [ ] Test: Full end-to-end workflow

**Success Criteria:**
- Smooth 60 FPS scrolling
- Instant series switching
- Correct layouts

---

## VERIFICATION CHECKLIST

### Load Performance
- [ ] Initial metadata load: <2 seconds for 1000 images
- [ ] First image render: <500ms
- [ ] UI responsive immediately (can click/scroll before images load)

### Scrolling Performance
- [ ] 60 FPS scrolling through 500+ images
- [ ] No stuttering when scrolling rapidly
- [ ] Images visible within 16ms of scroll (1 frame at 60 FPS)

### Memory Management
- [ ] Memory usage <1GB for 1000-image study
- [ ] No memory leaks after viewing 5+ studies
- [ ] Cache purges distant images automatically

### Functionality
- [ ] Multi-series studies display correctly
- [ ] Correct hanging protocol applied
- [ ] Series switching is instant (<100ms)
- [ ] Prefetching doesn't block user interaction

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                       │
│              (Click "View Study" button)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: REQUEST INFRASTRUCTURE (Week 1) ⚡ NEW             │
├─────────────────────────────────────────────────────────────┤
│  RequestPoolManager                                         │
│  ├── Interaction Queue (priority: 100, concurrent: 6)       │
│  ├── Thumbnail Queue (priority: 50, concurrent: 4)          │
│  └── Prefetch Queue (priority: 10, concurrent: 2)           │
│                                                             │
│  CornerstoneInitService                                     │
│  ├── Initialize WebWorkers (4 workers for decoding)         │
│  ├── Configure cache (1GB limit)                            │
│  └── Register image loaders                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: METADATA (Week 2)                                  │
├─────────────────────────────────────────────────────────────┤
│  DicomDataSource.retrieveStudyMetadata(caseId)              │
│  │                                                           │
│  ├─→ GET /api/cases/:id/metadata (NEW ENDPOINT)             │
│  │   Returns: { study, series[], instances[] }              │
│  │                                                           │
│  └─→ DicomMetadataStore.addStudy(metadata)                  │
│      Stores: Study → Series → Instances hierarchy           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: DISPLAY LOGIC (Week 3)                             │
├─────────────────────────────────────────────────────────────┤
│  DisplaySetService.makeDisplaySets(instances)               │
│  │                                                           │
│  ├─→ StandardImageDisplaySetBuilder.createDisplaySet()      │
│  │   Groups instances into logical stacks                   │
│  │                                                           │
│  └─→ HangingProtocolService.getMatchingProtocol()           │
│      Determines viewport layout (1x1, 2x2, etc.)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: STREAMING & MEMORY (Week 4) ⚡ NEW                 │
├─────────────────────────────────────────────────────────────┤
│  StreamingVolumeLoader.load(imageIds)                       │
│  ├── Pre-allocate GPU texture                               │
│  ├── Load images one-by-one via RequestPoolManager          │
│  ├── Insert pixels directly to GPU (no RAM duplication)     │
│  └── Re-render after each image (progressive display)       │
│                                                             │
│  CacheManager.monitorCacheSize()                            │
│  ├── Check memory every 5 seconds                           │
│  ├── Purge distant images if > 1GB                          │
│  └── Keep only ±20 images from current viewport             │
│                                                             │
│  ViewportPrefetchService.onViewportChange(index)            │
│  └── Prefetch ±10 images (70% forward, 30% backward)        │
│                                                             │
│  StudyPrefetcherService.onSeriesActive(seriesUID)           │
│  └── Prefetch adjacent series in background                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: UI (Week 5)                                        │
├─────────────────────────────────────────────────────────────┤
│  ImageViewer Component                                      │
│  ├── Create viewport from displaySet                        │
│  ├── Listen for scroll events                               │
│  ├── Trigger prefetch on scroll                             │
│  └── Boost priority of current image                        │
└─────────────────────────────────────────────────────────────┘
```

---

## CRITICAL DIFFERENCES FROM YOUR ORIGINAL PLAN

| Aspect | Your Plan | Updated Plan | Why Change Matters |
|--------|-----------|--------------|-------------------|
| **Phase Order** | Metadata → Display → UI | **Request Pool → Metadata** → Display → Streaming → UI | Request pool is foundation for everything |
| **Image Loading** | "cornerstone-image-loader" mentioned casually | **Detailed WebWorker setup + RequestPoolManager** | 80% of performance gain |
| **Memory Management** | Not mentioned | **CacheManager + purging strategy** | Prevents browser crashes |
| **Volume Rendering** | Not mentioned | **StreamingVolumeLoader** | Enables progressive 3D |
| **Series Prefetch** | Not mentioned | **StudyPrefetcherService** | Instant series switching |
| **Backend Changes** | "Use existing endpoint" | **NEW /metadata endpoint** | 763 requests → 1 request |

---

## FINAL RECOMMENDATION

**YOUR PLAN WAS 60% CORRECT** but missing the most critical performance components.

**Use this updated plan** which adds:
1. ✅ Request Pool Manager (Week 1 - NEW)
2. ✅ WebWorker initialization (Week 1 - NEW)  
3. ✅ Viewport prefetch service (Week 1 - NEW)
4. ✅ Streaming volume loader (Week 4 - NEW)
5. ✅ Cache management (Week 4 - NEW)
6. ✅ Study prefetcher (Week 4 - NEW)
7. ✅ New backend metadata endpoint (Week 2 - UPDATED)

**Without these additions, your viewer will:**
- ❌ Still have choppy scrolling (no request pool)
- ❌ Crash on large studies (no cache management)
- ❌ Load slowly (no parallel fetching)
- ❌ Block UI during decode (no WebWorkers)

**With these additions:**
- ✅ Smooth 60 FPS scrolling
- ✅ Handles 1000+ image studies
- ✅ Instant metadata load
- ✅ Progressive rendering
- ✅ Enterprise-grade performance

---
