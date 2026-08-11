import dicomParser from "dicom-parser";

/**
 * Parses a DICOM buffer and extracts essential metadata for the viewer.
 * @param {Buffer} buffer - The raw DICOM file buffer
 * @returns {Object} Extracted metadata (SOP UID, geometry, windowing, etc.)
 */
export const extractDicomMetadata = (buffer) => {
    try {
        // dicomParser expects a Uint8Array
        const byteArray = new Uint8Array(buffer);
        const dataSet = dicomParser.parseDicom(byteArray);

        const getString = (tag) => {
            const val = dataSet.string(tag);
            return val ? val.trim() : undefined;
        };

        const getFloat = (tag) => {
            const val = dataSet.string(tag);
            return val ? parseFloat(val) : undefined;
        };

        const getInt = (tag) => {
            const val = dataSet.uint16(tag);
            return val;
        };

        const getFloatArray = (tag) => {
            const val = dataSet.string(tag);
            return val ? val.split('\\').map(parseFloat) : undefined;
        };

        const getPatientAge = (tag) => {
            const val = getString(tag);
            if (!val) return undefined;
            const match = val.match(/(\d+)[YMDW]/);
            if (match) return parseInt(match[1]);
            return parseInt(val) || undefined;
        };

        // Format Patient Name (e.g. "MOUSE^MICKEY" -> "Mickey Mouse")
        const formatPatientName = (name) => {
            if (!name) return undefined;
            return name.split('^').filter(Boolean).map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
        };

        return {
            // Demographics
            patientName: formatPatientName(getString('x00100010')) || 'ANONYMOUS',
            patientId: getString('x00100020') || 'UNKNOWN',
            patientAge: getPatientAge('x00101010') || 0,
            patientGender: getString('x00100040') || 'O',
            institution: getString('x00080080') || '',
            
            // IDs

            sopInstanceUID: getString('x00080018'),
            seriesInstanceUID: getString('x0020000e'),
            studyInstanceUID: getString('x0020000d'),
            sopClassUID: getString('x00080016'),

            // [NEW] Series/Study Context
            seriesNumber: parseInt(getString('x00200011') || '0'),
            seriesDescription: getString('x0008103e'),
            modality: getString('x00080060'),
            studyDescription: getString('x00081030'),
            studyDate: getString('x00080020'),
            studyTime: getString('x00080030'),

            // Image Module (Geometry)
            rows: getInt('x00280010'),
            columns: getInt('x00280011'),
            pixelSpacing: getFloatArray('x00280030'), // [Row, Col]
            sliceThickness: getFloat('x00180050'),
            spacingBetweenSlices: getFloat('x00180088'),
            sliceLocation: getFloat('x00201041'),
            imagePositionPatient: getFloatArray('x00200032'), // [x, y, z]
            imageOrientationPatient: getFloatArray('x00200037'), // [xx, xy, xz, yx, yy, yz]
            frameOfReferenceUID: getString('x00200052'),

            // Pixel Module
            bitsAllocated: getInt('x00280100'),
            bitsStored: getInt('x00280101'),
            highBit: getInt('x00280102'),
            pixelRepresentation: getInt('x00280103'),
            samplesPerPixel: getInt('x00280002'),
            photometricInterpretation: getString('x00280004'),

            // Rescale / Windowing
            rescaleIntercept: getFloat('x00281052'),
            rescaleSlope: getFloat('x00281053'),
            windowCenter: getFloatArray('x00281050')?.[0], // Take first if array
            windowWidth: getFloatArray('x00281051')?.[0],

            // Misc
            // [FIX] x00200013 is an IS (Integer String) tag, not a uint16
            instanceNumber: parseInt(getString('x00200013') || '0'),
            transferSyntax: getString('x00020010')
        };
    } catch (error) {
        console.error("DICOM Parsing Error:", error.message);
        return null; // Return null if not a valid DICOM
    }
};
