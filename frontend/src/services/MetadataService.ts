import { metaData as cs3DMetaData } from "@cornerstonejs/core";

const metadataCache: Record<string, any> = {};
const sopMetadataCache: Record<string, any> = {};

/**
 * Mapping of DICOM tags to common descriptive property names used in our backend/frontend.
 */
const TAG_MAP: Record<string, string> = {
    "00280010": "rows",
    "00280011": "columns",
    "00280030": "pixelSpacing",
    "00181164": "pixelSpacing",
    "00200032": "imagePositionPatient",
    "00200037": "imageOrientationPatient",
    "00180050": "sliceThickness",
    "00180088": "spacingBetweenSlices",
    "00281050": "windowCenter",
    "00281051": "windowWidth",
    "00281052": "rescaleIntercept",
    "00281053": "rescaleSlope",
    "0020000D": "studyInstanceUID",
    "0020000E": "seriesInstanceUID",
    "00100010": "patientName",
    "00100020": "patientId",
};

/**
 * Adds naturalized metadata to the cache for a specific imageId.
 * Merges to avoid losing rich Orthanc metadata.
 */
export const addMetadata = (imageId: string, metadata: any) => {
    if (!metadata) return;

    // [NEW] Robust UID extraction for SOP-based lookup
    const extractSOP = (item: any) => {
        return getVal(item, "00080018") || item.sopInstanceUID || item.SOPInstanceUID;
    };

    const sopInstanceUID = extractSOP(metadata);
    if (sopInstanceUID) {
        sopMetadataCache[sopInstanceUID] = {
            ...(sopMetadataCache[sopInstanceUID] || {}),
            ...metadata
        };
    }

    if (metadataCache[imageId]) {
        metadataCache[imageId] = {
            ...metadataCache[imageId],
            ...metadata
        };
    } else {
        metadataCache[imageId] = metadata;
    }
};

/**
 * Helper to get naturalized value from DICOM JSON or standard object.
 */
const getVal = (item: any, tag: string) => {
    if (!item) return undefined;

    const normalizedTagUpper = tag.toUpperCase().padStart(8, "0");
    const normalizedTagLower = tag.toLowerCase().padStart(8, "0");

    // Check lowercase (Orthanc style) and uppercase (Standard)
    let value = item[normalizedTagLower] !== undefined ? item[normalizedTagLower] : item[normalizedTagUpper];

    if (value !== undefined) {
        // Handle DICOM JSON structure { vr: '...', Value: [...] } or { vr: '...', InlineBinary: '...' }
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            if (value.Value !== undefined) {
                const val = value.Value;
                if (!Array.isArray(val) || val.length === 0) return undefined;

                if (val.length === 1) {
                    const v = val[0];
                    if (v && typeof v === "object" && v.Alphabetic !== undefined)
                        return v.Alphabetic;

                    // [AUTO-PARSE] Convert numeric strings to numbers for Cornerstone compatibility
                    if (typeof v === 'string' && /^-?\d+\.?\d*$/.test(v)) {
                        return parseFloat(v);
                    }
                    return v;
                }

                // For arrays (like PixelSpacing), ensure they are numbers
                if (Array.isArray(val)) {
                    return val.map(v => (typeof v === 'string' && /^-?\d+\.?\d*$/.test(v)) ? parseFloat(v) : v);
                }
                return val;
            } else if (value.InlineBinary !== undefined) {
                return value.InlineBinary;
            }
        }
        return value;
    }

    // [NEW] Fallback: Check for descriptive property name if tag lookup failed
    // This allows lookup in both raw DICOM JSON and our naturalized metadata objects
    const propName = TAG_MAP[normalizedTagUpper];
    if (propName && item[propName] !== undefined) {
        return item[propName];
    }

    return undefined;
};

/**
 * Extracts specific module data from the cached item.
 */
const getModuleData = (type: string, item: any) => {
    switch (type) {
        case "patientModule":
            return {
                patientName: getVal(item, "00100010"),
                patientId: getVal(item, "00100020"),
                patientBirthDate: getVal(item, "00100030"),
                patientSex: getVal(item, "00100040"),
            };
        case "studyModule":
            return {
                studyDate: getVal(item, "00080020"),
                studyTime: getVal(item, "00080030"),
                studyDescription: getVal(item, "00081030"),
                studyInstanceUid: getVal(item, "0020000D"),
            };
        case "generalSeriesModule":
            return {
                modality: getVal(item, "00080060"),
                seriesInstanceUid: getVal(item, "0020000E"),
                seriesNumber: getVal(item, "00200011"),
                seriesDescription: getVal(item, "0008103E"),
            };
        case "generalImageModule":
            return {
                instanceNumber: getVal(item, "00200013"),
            };
        case "imagePixelModule": {
            const samplesPerPixel = parseInt(getVal(item, "00280002")) || 1;
            const rows = parseInt(getVal(item, "00280010"));
            const columns = parseInt(getVal(item, "00280011"));
            let pixelSpacing = getVal(item, "00280030");

            if (!pixelSpacing) {
                pixelSpacing = getVal(item, "00181164");
            }

            return {
                samplesPerPixel,
                photometricInterpretation: getVal(item, "00280004") || "MONOCHROME2",
                rows,
                columns,
                bitsAllocated: parseInt(getVal(item, "00280100")) || 16,
                bitsStored: parseInt(getVal(item, "00280101")) || 12,
                highBit: parseInt(getVal(item, "00280102")) || 11,
                pixelRepresentation: parseInt(getVal(item, "00280103")) || 0,
                pixelSpacing: Array.isArray(pixelSpacing)
                    ? pixelSpacing.map((v: any) => {
                        const parsed = parseFloat(v);
                        return isNaN(parsed) ? undefined : parsed;
                    }).filter(v => v !== undefined)
                    : undefined,
            };
        }
        case "modalityLutModule": {
            const rescaleIntercept = getVal(item, "00281052");
            const rescaleSlope = getVal(item, "00281053");
            const rescaleType = getVal(item, "00281054");

            return {
                rescaleIntercept:
                    rescaleIntercept !== undefined ? parseFloat(rescaleIntercept) : 0,
                rescaleSlope: rescaleSlope !== undefined ? parseFloat(rescaleSlope) : 1,
                rescaleType: rescaleType || "US",
            };
        }
        case "imagePlaneModule": {
            const iop = getVal(item, "00200037");
            const ipp = getVal(item, "00200032");
            let ps = getVal(item, "00280030");

            if (!ps) ps = getVal(item, "00181164");

            if (!iop || !ipp || !ps) return undefined;

            const rowSpacing = parseFloat(ps[0]);
            const colSpacing = parseFloat(ps[1]);

            if (isNaN(rowSpacing) || isNaN(colSpacing)) return undefined;

            const sliceThickness = getVal(item, "00180050");
            const spacingBetweenSlices = getVal(item, "00180088");

            const parsedSliceThickness = sliceThickness !== undefined ? parseFloat(sliceThickness) : undefined;
            const parsedSpacingBetweenSlices = spacingBetweenSlices !== undefined ? parseFloat(spacingBetweenSlices) : undefined;

            return {
                rowCosines: iop.slice(0, 3).map((v: any) => parseFloat(v)).filter(v => !isNaN(v)),
                columnCosines: iop.slice(3, 6).map((v: any) => parseFloat(v)).filter(v => !isNaN(v)),
                imageOrientationPatient: iop.map((v: any) => parseFloat(v)).filter(v => !isNaN(v)),
                imagePositionPatient: ipp.map((v: any) => parseFloat(v)).filter(v => !isNaN(v)),
                pixelSpacing: [rowSpacing, colSpacing],
                rowPixelSpacing: rowSpacing,
                columnPixelSpacing: colSpacing,
                rows: parseInt(getVal(item, "00280010")),
                columns: parseInt(getVal(item, "00280011")),
                sliceThickness: (parsedSliceThickness !== undefined && !isNaN(parsedSliceThickness)) ? parsedSliceThickness : undefined,
                spacingBetweenSlices: (parsedSpacingBetweenSlices !== undefined && !isNaN(parsedSpacingBetweenSlices)) ? parsedSpacingBetweenSlices : undefined,
                frameOfReferenceUID: getVal(item, "00200052"),
            };
        }
        case "voiLutModule": {
            const wc = getVal(item, "00281050");
            const ww = getVal(item, "00281051");

            return {
                windowCenter: Array.isArray(wc)
                    ? wc.map((v: any) => parseFloat(v)).filter(v => !isNaN(v))
                    : [!isNaN(parseFloat(wc)) ? parseFloat(wc) : 40],
                windowWidth: Array.isArray(ww)
                    ? ww.map((v: any) => parseFloat(v)).filter(v => !isNaN(v))
                    : [!isNaN(parseFloat(ww)) ? parseFloat(ww) : 400],
            };
        }
        default:
            return undefined;
    }
};

/**
 * High-priority metadata provider for Cornerstone3D.
 */
const metaDataProvider = (type: string, imageId: string) => {
    let item = metadataCache[imageId];

    if (!item) {
        // [ENHANCED] Robust matching 
        // 1. Try SOP extraction from ImageID
        const sopMatch = imageId.match(/([0-2](\.[0-9]+)+)/); // Broad UID regex
        const potentialSOP = sopMatch ? sopMatch[0] : undefined;

        if (potentialSOP && sopMetadataCache[potentialSOP]) {
            item = sopMetadataCache[potentialSOP];
        } else {
            // 2. Fallback to fuzzy URI matching
            const cleanId = imageId.split('?')[0].replace(/^(wadors:|wadouri:|dicomlocal:)/, '');
            const matchingKey = Object.keys(metadataCache).find(
                (key) => {
                    const cleanKey = key.split('?')[0].replace(/^(wadors:|wadouri:|dicomlocal:)/, '');
                    return cleanId.endsWith(cleanKey) || cleanKey.endsWith(cleanId);
                }
            );
            if (matchingKey) item = metadataCache[matchingKey];
        }
    }

    if (!item) return undefined;
    return getModuleData(type, item);
};

// Register with Cornerstone3D
cs3DMetaData.addProvider(metaDataProvider, 10000); // High priority

/**
 * Returns the raw metadata for a specific imageId or SOP UID.
 * This is useful for diagnostics and linking.
 */
export const getRawMetadata = (id: string) => {
    return metadataCache[id] || sopMetadataCache[id];
};

export default { addMetadata, metaDataProvider, getRawMetadata };
