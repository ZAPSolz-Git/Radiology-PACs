**Here's the honest reality first — then the plan:**

EXIF data is embedded in consumer image formats (JPEG, TIFF) and records camera settings like exposure, focal length, and GPS coordinates. DICOM metadata is specific to medical imaging and records clinical information including patient demographics, imaging modality, acquisition parameters, and study context — with over 4,000 standard-defined fields.

This means JPEG/PNG files **will not** have PatientName, PatientID, or StudyInstanceUID like DICOM does. However, screen captures and exported JPEGs derived from medical images may carry patient information visible in the original scan overlay (now permanently embedded as pixels), filename conventions that include patient names and MRNs, and EXIF metadata inherited from the capture device.

---

# Image Upload (JPG/PNG) — Implementation Plan

## What We Can Actually Extract

| Field | Source | Reliability |
|---|---|---|
| Image dimensions (width/height) | EXIF | ✅ Always present |
| Date taken | EXIF `DateTimeOriginal` | ✅ Usually present |
| Device/Equipment | EXIF `Make` + `Model` | ⚠️ Only if from medical device |
| Description/Study | EXIF `ImageDescription` or IPTC `Caption` | ⚠️ Inconsistent |
| PatientName, PatientID, Modality | **Not in EXIF** | ❌ Must be entered manually |

**Conclusion:** Auto-fill will be partial. The form still goes to Step 2 for manual completion, just like PACS Import.

---

## Proposed Changes

### Phase 1 — Frontend: New Tab in `CaseCreationModal.tsx`

**[MODIFY] `CaseCreationModal.tsx`**
- Add `'image-upload'` to the `uploadMode` union type
- Add a 5th button in the tab selector: **"Image Upload"** (with `ImageIcon` from lucide-react)
- Accept `.jpg`, `.jpeg`, `.png` files — NOT `webkitdirectory`, just a regular multi-file picker
- Limit: max 50 images per upload, max 10MB per file

**[NEW] `DicomParserService.ts` — extend with `parseImageFiles()`**

Install `exifr` (the fastest EXIF parser, ~2.5ms per file with chunked reading and zero dependencies):
```
npm install exifr
```

Add `parseImageFiles(files: File[])` that extracts:
```ts
{
  dateTime: tags.DateTimeOriginal || tags.DateTime,
  width: tags.ImageWidth || tags.ExifImageWidth,
  height: tags.ImageHeight || tags.ExifImageHeight,
  equipment: `${tags.Make || ''} ${tags.Model || ''}`.trim(),
  description: tags.ImageDescription || tags.Caption || '',
  institution: tags.Artist || '', // Sometimes populated by medical devices
}
```

Map to form fields:
- `description` → `clinicalHistory` (pre-fill)
- `equipment` → `institution` (pre-fill if present)
- `dateTime` → stored as `studyDate`
- **PatientName, PatientID, Age, Gender, Modality** → left empty for manual entry

**[MODIFY] `CaseCreationModal.tsx` — `handleImageFileChange()`**
- After `exifr.parse()`, move to Step 2 with whatever was extracted
- Show a yellow notice: **"Image metadata is limited — please complete patient details manually"**
- Show a thumbnail preview strip of the selected images (max 5 shown)

---

### Phase 2 — Backend: `caseController.js`

**[MODIFY] `uploadCase` controller**

The image files arrive via the existing `/api/cases/upload` endpoint. Add handling for image MIME types:

```js
const imageFiles = req.files['files']?.filter(f =>
  ['image/jpeg', 'image/png', 'image/jpg'].includes(f.mimetype)
) || [];
```

For image files:
1. **Skip** `extractDicomMetadata()` — not applicable
2. **Move** files to `uploads/cases/[studyUID]/images/` (separate folder from `/dicom/`)
3. **Save** as attachments with `category: 'ClinicalImage'` — NOT in `dicomFiles` array
4. **Do NOT push** to Orthanc — these aren't DICOM, Orthanc will reject them
5. Generate a `LOCAL_IMG_${Date.now()}` studyInstanceUID if none provided

**[MODIFY] `Case.js` model — add new attachment category**
```js
category: {
  type: String,
  enum: ['OldReport', 'OldImage', 'Snapshot', 'ClinicalImage'], // ← add ClinicalImage
}
```

---

### Phase 3 — Viewer Integration

Images saved as `ClinicalImage` attachments are viewable via the existing attachment viewer — no OHIF integration needed since they aren't DICOM. They show in the case details modal like any other attachment.

---

## What Your AI Should NOT Do

1. **Do NOT** try to convert JPG/PNG to DICOM format — this is complex, lossy, and unnecessary
2. **Do NOT** push images to Orthanc — it won't accept non-DICOM files via `POST /instances`
3. **Do NOT** add them to `dicomFiles` array — they are attachments, not study slices
4. **Do NOT** run `StudyIntegrityService` on image-only cases — integrity checks expect DICOM structure

---

## User Review Required

> **Mixed uploads:** Should a technician be allowed to upload both DICOM files AND JPG/PNG images in the same case? Or are these two separate workflows?

> **Viewer access:** When a radiologist opens an image-only case, should they see the images in the OHIF viewer (they won't — no DICOM) or in a simple inline image gallery? The plan currently uses the attachment viewer.

Answer these two before your AI codes it.

Mixed uploads: Should a technician be allowed to upload both DICOM files AND JPG/PNG images in the same case? Or are these two separate workflows?
yes in the same cases

Viewer access: When a radiologist opens an image-only case, should they see the images in the OHIF viewer
yes

Found the key. Orthanc's `/tools/create-dicom` endpoint can convert JPEG/PNG to DICOM by posting the image as a base64 data URI with patient tags. The `Parent` parameter attaches the new instance directly to an existing study in Orthanc.

This means the viewer integration is **fully solvable** using Orthanc itself — no external library needed.

JPEG is not supported for `/tools/create-dicom` because JPEG decompression is non-normative. Only PNG is accepted. For JPEGs, convert locally to a DICOM file first, then POST to `/instances`.

---

# Image Upload (JPG/PNG) — Complete Implementation Plan

## Architecture

```
User uploads JPG/PNG
        ↓
Backend: JPEG → PNG conversion (Sharp)
        ↓
Backend: POST /tools/create-dicom (Orthanc)
  with: { Content: "data:image/png;base64,...",
          Parent: orthancStudyId,  ← attaches to same study
          Tags: { PatientName, PatientID, Modality: "SC", ... } }
        ↓
Orthanc stores it as DICOM Secondary Capture
        ↓
OHIF Viewer shows it alongside DICOM slices ✅
```

---

## Phase 1 — Backend

### [MODIFY] `package.json`
```
npm install sharp
```
Sharp is used to convert JPEG → PNG (required by Orthanc's `/tools/create-dicom`) and to get image dimensions.

### [MODIFY] `OrthancSyncService.js` — add `dicomizeImage()`

New method that handles the conversion pipeline:

```js
async dicomizeImage(imagePath, patientTags, orthancStudyId) {
  // Step 1: Read file and convert JPEG → PNG using Sharp (Orthanc only accepts PNG)
  const pngBuffer = await sharp(imagePath)
    .png()
    .toBuffer();

  const base64 = pngBuffer.toString('base64');

  // Step 2: POST to Orthanc /tools/create-dicom
  const payload = {
    Content: `data:image/png;base64,${base64}`,
    Parent: orthancStudyId,   // attach to existing study
    Tags: {
      PatientName:    patientTags.patientName,
      PatientID:      patientTags.patientId,
      StudyDate:      patientTags.studyDate,
      Modality:       'SC',   // Secondary Capture — standard for non-native images
      SeriesDescription: 'Clinical Images',
      SOPClassUID:    '1.2.840.10008.5.1.4.1.1.7', // Secondary Capture SOP Class
    }
  };

  const response = await axios.post(
    `${orthancUrl}/tools/create-dicom`,
    payload,
    { auth: orthancAuth }
  );

  return response.data.ID; // Orthanc instance ID
}
```

### [MODIFY] `caseController.js` — `uploadCase()`

Add image file handling alongside existing DICOM processing:

```js
const imageFiles = req.files['images'] || [];  // new field key
```

For each image file, after saving to disk:
1. Call `orthancSyncService.dicomizeImage(filePath, patientTags, orthancStudyId)`
2. Store the result in `case.attachments` with `category: 'ClinicalImage'`
3. **Do NOT** add to `case.dicomFiles` — images are not DICOM slices

**Get `orthancStudyId`** after the DICOM files are synced to Orthanc (it already happens in the existing flow). Use `POST /tools/find` to get the Orthanc internal ID from `studyInstanceUID`.

### [MODIFY] `Case.js` model
```js
// In attachments subdocument, add to category enum:
category: {
  enum: ['OldReport', 'OldImage', 'Snapshot', 'ClinicalImage'] // ← add ClinicalImage
}
```

### [MODIFY] `multer` config in `caseRoutes.js`
Add `images` as a new accepted field name alongside existing `files` and `attachments`:
```js
upload.fields([
  { name: 'files', maxCount: 1000 },
  { name: 'images', maxCount: 50 },      // ← new
  { name: 'attachments', maxCount: 20 }
])
```

---

## Phase 2 — Frontend: `DicomParserService.ts`

Install `exifr`:
```
npm install exifr
```

Add `parseImageFiles(files: File[])`:
```ts
import exifr from 'exifr';

async parseImageFiles(files: File[]) {
  const first = files[0];
  const tags = await exifr.parse(first, {
    pick: ['DateTimeOriginal', 'DateTime', 'ImageDescription',
           'Make', 'Model', 'ImageWidth', 'ImageHeight']
  });

  return {
    studyDate: tags?.DateTimeOriginal || tags?.DateTime || new Date().toISOString(),
    clinicalHistory: tags?.ImageDescription || '',
    institution: tags?.Make ? `${tags.Make} ${tags.Model || ''}`.trim() : '',
    imageCount: files.length,
    // These MUST be entered manually — not in EXIF:
    patientName: '',
    patientId: '',
    age: '',
    gender: 'O' as const,
    modality: 'SC',
    bodyPart: '',
  };
}
```

---

## Phase 3 — Frontend: `CaseCreationModal.tsx`

**Add `'image-upload'` as 5th tab:**
```tsx
<button onClick={() => setUploadMode('image-upload')}>
  <ImageIcon className="w-3 h-3" />
  Image Upload
</button>
```

**File picker for images:**
```tsx
<input
  type="file"
  accept=".jpg,.jpeg,.png"
  multiple           // ← multi-file, NOT webkitdirectory
  onChange={handleImageFileChange}
/>
```

**`handleImageFileChange()`:**
1. Call `DicomParserService.parseImageFiles(files)`
2. Pre-fill whatever was extracted (date, description, institution)
3. Show yellow notice: **"Patient details could not be read from image files — please complete Step 2 manually"**
4. Move to Step 2
5. Show thumbnail strip of selected images (first 5)

**`handleFinalSubmit()` — image upload branch:**
```ts
const formData = new FormData();
// existing metadata fields...
selectedImageFiles.forEach(file => formData.append('images', file));
formData.append('uploadMode', 'image-upload');
```

---

## What This Looks Like in OHIF

After the images are dicomized via `/tools/create-dicom` with `Parent: orthancStudyId`:

- They appear as a **separate series** called "Clinical Images" in the OHIF series panel
- Modality shown as `SC` (Secondary Capture)
- Radiologist can click between DICOM slices and the uploaded photos in the same viewer session
- No OHIF configuration changes needed — Orthanc handles the rest

---






Image-only case (no DICOM): If a technician uploads ONLY JPG/PNG files (no DICOM at all), there is no existing Orthanc study to use as `Parent`. In this case we generate a new `studyInstanceUID` and call `/tools/create-dicom` without a `Parent` — Orthanc creates a new study automatically. The OHIF viewer can still open it. **Is this acceptable?**
yes
