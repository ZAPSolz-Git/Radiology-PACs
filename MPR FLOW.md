Now I have enough to give you a very thorough breakdown. Let me put this all together.Now let me build the full visual + deep-research writeup:Here's the complete deep-research breakdown — what Stradus and all similar companies are doing, and exactly how to replicate it.

---

## What Stradus is doing specifically

Stradus markets itself as a **"Hybrid PACS"** — meaning images live both locally at the facility (for speed) and offsite in their datacenter (for outside access). Their viewer is 100% zero footprint: no software installation needed on PC, Mac, iPad, iPhone, or Android — just a browser. The `view.stradus.com` URL you shared is their cloud viewer endpoint. Based on the feature list, they implement full MPR, MIP, hanging protocols, and synchronized scrolling — all in-browser.

---

## The full technology stack (what every serious player uses)

### 1. The Transport Protocol: DICOMweb / WADO-RS
DICOMweb is the DICOM standard for web-based medical imaging — a set of RESTful services enabling web developers to access healthcare images using industry-standard toolsets. The viewer never downloads the whole study. It requests only the slices it needs right now via `WADO-RS` endpoints like:
```
GET /wado/rs/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}/frames/1
```

### 2. The Magic Encoding: HTJ2K (High Throughput JPEG 2000)
This is the single biggest technical breakthrough. The DICOM Standards Committee added support for HTJ2K, which enables progressive decoding — meaning if the first N bytes of the image are available, they can be decoded into a lower-resolution but displayable image. The configuration enabling this is called HTJ2K RPCL (Resolution Position Component Layer).

So what you see in your screenshot — images loading at 75% while already being viewable — is HTJ2K doing exactly this. XHR streaming keeps a persistent connection and sends data incrementally as it arrives, instead of waiting for the entire response.

AWS HealthImaging uses lossless HTJ2K encoding with their high-performance network backbone, offering subsecond image retrieval from anywhere.

### 3. The Rendering Engine: Cornerstone3D + WebGL + WebAssembly
Cornerstone3D drives every viewport from a single shared WebGL context, rendering offscreen and compositing the results — rather than spinning up a separate WebGL context per viewport, which would hit browser limits fast in a layout with ten panels. WebAssembly handles JPEG 2000 and JPEG-LS decompression in parallel via web workers.

Cornerstone3D is fast because it leverages WebGL for high-performance image rendering and WebAssembly for fast image decompression.

### 4. Memory Architecture: Why 128MB GPU is enough
The volume pixel data (Int16Array) lives entirely in **system RAM**, not VRAM. Cornerstone3D 2.0 introduced VoxelManager, which cuts memory usage in half while optimizing data access. The GPU only ever sees one 2D texture per viewport at any moment — tiny. MPR math (reslicing axial→sagittal→coronal) runs on the CPU.

### 5. Progressive Loading
OHIF now supports interleaved HTJ2K and volume progressive loading — this means the viewer shows a blurry-but-complete image in milliseconds, then progressively sharpens it as more bytes arrive.

---

## Companies using this stack

| Company | Approach | Tech |
|---|---|---|
| **Stradus** | Hybrid PACS, zero footprint | Proprietary, DICOMweb backend |
| **OHIF Viewer** | Open source platform | Cornerstone3D, React, DICOMweb |
| **Ambra Health** (now Intelerad) | Cloud PACS | FDA 510(k) cleared zero-footprint HTML5 viewer on Google Cloud infrastructure |
| **PostDICOM** | Cloud PACS with HTML5 viewer supporting MPR, MIP, MinIP, 3D rendering on any device | DICOMweb client |
| **Medicai** | Cloud PACS | Browser-based, local processing |
| **AWS HealthImaging** | Cloud storage + decoding | HTJ2K + GPU nvJPEG2000 |

---

## How to build this yourself

Here's the exact recipe:

**Backend (PACS / DICOMweb server)**
- Use **Orthanc** (open source) or **dcm4chee** — both expose WADO-RS endpoints
- Re-encode your DICOM files to **HTJ2K RPCL** format (use `openjph` CLI tool)
- Enable HTTP Range request support on your server

**Frontend (viewer)**
- Use **Cornerstone3D** + **OHIF Viewer** (both open source, MIT licensed)
- Or build on top of Cornerstone3D directly for a custom UI
- Use `cornerstoneWADOImageLoader` for the WADO-RS image fetching
- Use `dicom-parser` for metadata

**The progressive loading config to replicate that "75% loading" effect:**
```javascript
// In Cornerstone3D, configure retrieve stages:
retrieveOptions: {
  single: {
    retrieveType: 'singleFast',  // low-res first
  },
  volume: {
    retrieveType: 'interleaved', // loads middle slices first
  }
}
```

**Key libraries:**
- `@cornerstonejs/core` — rendering engine
- `@cornerstonejs/tools` — MPR, windowing, measurements
- `@cornerstonejs/dicom-image-loader` — WADO-RS streaming
- `dicom-parser` — DICOM tag parsing
- `openjph` (WebAssembly) — HTJ2K decode

The entire open-source stack (OHIF + Cornerstone3D + Orthanc) can replicate exactly what you saw in those screenshots — including the progressive load percentages, 3-plane MPR, and low-GPU-memory footprint.