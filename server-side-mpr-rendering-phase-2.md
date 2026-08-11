Production-Grade Plan: Server-Side MPR Rendering

1. Architecture Overview
Current Flow (Problem)

OHIF Browser
  → fetches ALL DICOM slices from Orthanc
  → browser GPU builds 3D volume (2GB+)
  → browser renders MPR
  ❌ fails on low-end GPU (128MB VRAM)
Target Flow (Solution)

OHIF Browser
  → requests ONE rendered JPEG frame from MPR Service
  → MPR Service fetches slices from Orthanc
  → MPR Service builds volume in server RAM
  → MPR Service computes MPR slice → returns JPEG
  → Browser just displays the JPEG
  ✅ works on any device, zero GPU needed

2. New System Architecture

┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐  │
│  │  OHIF    │───▶│  Nginx   │───▶│  Node.js      │  │
│  │  Viewer  │    │  Proxy   │    │  Backend      │  │
│  │ (port    │    │          │    │  (port 5000)  │  │
│  │  8080)   │    │          │    └───────┬───────┘  │
│  └──────────┘    │          │            │           │
│                  │          │    ┌───────▼───────┐  │
│                  │          │───▶│  MPR Service  │  │
│                  │          │    │  Python/FastAPI│  │
│                  └──────────┘    │  (port 8100)  │  │
│                                  └───────┬───────┘  │
│  ┌──────────┐    ┌──────────┐            │           │
│  │  Redis   │◀───│          │◀───────────┘           │
│  │  Cache   │    │ Orthanc  │                        │
│  │ (6379)   │    │  (8042)  │                        │
│  └──────────┘    └──────────┘                        │
└─────────────────────────────────────────────────────┘

3. New Component: MPR Rendering Microservice
Why Python, not Node.js
Your backend is Node.js — but for MPR computation, Python is the right tool:

Requirement	                                     Python	                                     Node.js
3D volume from DICOM	                         pydicom + numpy (battle-tested)	         No mature equivalent
MPR slice resampling	                         SimpleITK (used in hospitals worldwide)	 Not available
JPEG frame output	                             Pillow / OpenCV	                         Sharp (workable but limited)
Future AI features (auto-detect, segmentation)	 Native (PyTorch, MONAI)	                 Not applicable
 
Technology Stack for MPR Service

Language:    Python 3.11
Framework:   FastAPI (async, fast, auto Swagger docs)
DICOM:       pydicom (read DICOM files)
Volume:      numpy (3D array operations)
MPR:         SimpleITK (medical image resampling — industry standard)
Image out:   Pillow (JPEG encoding)
Cache:       Redis (your existing Redis container)
HTTP client: httpx (async calls to Orthanc DICOMweb)

4. MPR Service API Design
Endpoints

GET /health
→ Health check for Docker

GET /mpr/frame
  Query params:
    studyUID       — DICOM StudyInstanceUID
    seriesUID      — DICOM SeriesInstanceUID
    plane          — axial | sagittal | coronal
    sliceIndex     — 0 to N (which slice in that plane)
    windowCenter   — (optional) WW/WL window center
    windowWidth    — (optional) WW/WL window width
    quality        — (optional) JPEG quality 60-95, default 80

Response:
  Content-Type: image/jpeg
  X-Total-Slices: 512       ← OHIF uses this to build scrollbar
  X-Slice-Thickness: 1.5    ← metadata
  Cache-Control: max-age=3600
  Body: <JPEG bytes>

GET /mpr/metadata
  Query params:
    studyUID
    seriesUID
  Response: JSON with dimensions, spacing, slice counts per plane

5. Internal Processing Pipeline (inside MPR Service)

Request arrives: plane=sagittal, sliceIndex=128
         │
         ▼
Step 1 — Cache Check
  Redis key: mpr:{seriesUID}:{plane}:{sliceIndex}:{ww}:{wl}
  HIT  → return cached JPEG immediately (< 5ms)
  MISS → continue
         │
         ▼
Step 2 — Volume Cache Check
  Is this series already loaded in server memory?
  YES → skip to Step 4
  NO  → continue
         │
         ▼
Step 3 — Fetch from Orthanc
  GET http://orthanc:8042/dicom-web/studies/{uid}/series/{uid}/instances
  For each instance → GET .../frames/1  (raw pixel data)
  Stream all slices in parallel (async httpx, 20 concurrent)
         │
         ▼
Step 4 — Build 3D Volume
  Sort slices by ImagePositionPatient Z coordinate
  Stack into numpy 3D array: shape (Z, Y, X)
  Apply RescaleSlope + RescaleIntercept (Hounsfield units)
  Store volume in LRU memory cache (max 3 volumes, ~3GB RAM limit)
         │
         ▼
Step 5 — Extract MPR Slice
  axial    → volume[sliceIndex, :, :]         (no resampling needed)
  coronal  → SimpleITK resample → volume[:, sliceIndex, :]
  sagittal → SimpleITK resample → volume[:, :, sliceIndex]
         │
         ▼
Step 6 — Apply Window/Level
  pixel_value = clip(HU, WC - WW/2, WC + WW/2)
  normalize to 0-255 uint8
         │
         ▼
Step 7 — Encode & Cache
  Pillow → encode as JPEG (quality=80)
  Store in Redis: TTL = 1 hour
  Return JPEG bytes

6. Caching Strategy (3 Layers)

Layer 1 — Browser Cache (free)
  Cache-Control: max-age=3600
  ETag header on every response
  → User scrolling same study: zero server calls

Layer 2 — Redis Cache (your existing Redis)
  Key:   mpr:{seriesUID}:{plane}:{sliceIndex}:{wc}:{ww}
  TTL:   1 hour
  Size:  ~30KB per JPEG × 500 slices × 3 planes = ~45MB per series
  → Same study, different user: served from Redis instantly

Layer 3 — Server RAM (LRU Volume Cache)
  Keep last 3 loaded volumes in Python process memory
  Each CT volume ≈ 500MB RAM (2000 slices × 512×512 × 2 bytes)
  → Same series, next slice: no Orthanc call, compute directly

7. OHIF Integration Strategy
This is the trickiest part. OHIF currently fetches raw DICOM for volume viewports. You need to intercept this for MPR mode only.

Two sub-options:
Option A — Custom OHIF Mode (Recommended)

Create a new mode called mpr-server alongside the existing basic mode
This mode uses a custom viewport that calls your MPR Service API instead of Cornerstone volume loader
Regular modes (stack viewing, 2D) stay unchanged
Doctor explicitly clicks "Server MPR" button to enter this mode
Fallback: if MPR Service is down, show "unavailable" message
Option B — Custom Data Source Adapter

Override the OHIF data source to intercept volume frame requests
Transparently redirect to MPR Service
Doctor sees no difference in UI
More complex, higher risk of breaking existing flows
Recommendation: Option A — cleaner, lower risk, easier to test independently.

What changes in OHIF

New button in toolbar: "MPR (Server)"
  → triggers mpr-server mode
  → loads custom viewport component
  → viewport calls GET /api/mpr/frame?plane=axial&sliceIndex=0
  → displays returned JPEG
  → scroll wheel increments sliceIndex, fetches next frame
  → crosshair sync works via sliceIndex across 3 panels

8. Docker Compose Changes
Add one new service to your existing docker-compose.yml:


New service: mpr_service
  Image:    custom Python/FastAPI image
  Port:     8100 (internal only, not exposed to outside)
  RAM:      limit 4GB (for 3 volume cache)
  CPU:      limit 2 cores
  Depends:  orthanc, redis
  Restart:  always
  Network:  same internal Docker network as orthanc + redis
Nginx gets one new route:


/api/mpr/ → http://mpr_service:8100/
No public port exposure — all MPR traffic goes through your existing Nginx + Node.js auth layer.

9. Security Layer
MPR frames contain patient data — must be secured.


OHIF → Nginx → Node.js Backend (auth check) → MPR Service

Flow:
1. OHIF sends request with JWT token (existing auth)
2. Nginx routes /api/mpr/* to Node.js backend
3. Node.js backend validates JWT (existing middleware)
4. Node.js backend proxies request to MPR Service (internal only)
5. MPR Service has NO public exposure — internal Docker network only
6. MPR Service trusts only requests from Node.js backend IP
MPR Service never talks directly to the internet. Existing auth (protect middleware in your server.js) covers it automatically.

10. Performance Targets
      Metric	                           Target
First frame (cold, volume not cached)	   < 8 seconds
First frame (volume in RAM cache)	       < 500ms
Subsequent frames (Redis hit)	           < 50ms
Subsequent frames (RAM + compute)	       < 200ms
Concurrent users on same study	           Served from Redis, near-instant
Max studies in RAM at once	               3
RAM usage ceiling	                       4 GB


11. Rollout Phases
Phase 1 — MPR Service (3-4 weeks)
Build Python/FastAPI MPR Service
Containerize it
Test MPR frame generation against your Orthanc data
Add Redis caching
Internal API working and tested
Phase 2 — Backend Proxy (1 week)
Add /api/mpr/* proxy route to Node.js backend
Wire through existing JWT auth middleware
Rate limit MPR endpoint separately (it's heavy)
Phase 3 — OHIF Custom Mode (2-3 weeks)
Build mpr-server mode in OHIF
Custom viewport that fetches JPEG frames
Scroll, crosshair sync, window/level controls
Test on both System 1 (i5-6500) and System 2 (i5-7500)
Phase 4 — Hardening (1 week)
Load test: 10 concurrent users, different studies
Monitor Redis memory usage
Add MPR service health to your existing /health endpoint
Set up alerts if MPR service goes down
Phase 5 — Gradual Rollout
Enable "Server MPR" button for internal users first
Keep old "Client MPR" button as fallback
Monitor performance, remove old MPR once stable

12. What This Solves Permanently
     Problem	                             After Implementation
MPR crashes on 128MB GPU	              Gone — no GPU used at all
2000-slice study hangs browser	          Gone — only 1 JPEG per frame
Low-end device (i5-6500) can't MPR	      Works on any device with a browser
WASM memory overflow	                  Gone — all processing on server
First-load wait for full volume	          Reduced — first frame in < 8s

13. What You Need to Procure/Decide Before Starting
Server RAM: The MPR service needs ~4GB RAM dedicated. Check your production server has this headroom.
Python developer or your Node.js dev learning Python for the MPR service — SimpleITK knowledge needed.
Decide on Option A vs B for OHIF integration (recommend A).
Redis memory limit: Check your current Redis config — MPR frames will add ~45MB per cached series. Set a maxmemory policy on Redis.


