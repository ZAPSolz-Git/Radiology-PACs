/**
 * Diagnostic: Read a local DICOM file and extract metadata
 * to verify if the dicom-parser can read the patient demographics.
 */
import fs from "fs";
import dicomParser from "dicom-parser";

const FILE = "C:\\Users\\admin\\Desktop\\Varun\\conference\\(KASINATHAN  69Y  M) LOWER LIMB\\53450605\\53450605_1.dcm";

const buffer = fs.readFileSync(FILE);
const byteArray = new Uint8Array(buffer);

try {
    const dataSet = dicomParser.parseDicom(byteArray);

    const tags = {
        'PatientName (0010,0010)': dataSet.string('x00100010'),
        'PatientID (0010,0020)': dataSet.string('x00100020'),
        'PatientAge (0010,1010)': dataSet.string('x00101010'),
        'PatientSex (0010,0040)': dataSet.string('x00100040'),
        'Institution (0008,0080)': dataSet.string('x00080080'),
        'StudyInstanceUID (0020,000d)': dataSet.string('x0020000d'),
        'SeriesInstanceUID (0020,000e)': dataSet.string('x0020000e'),
        'SOPInstanceUID (0008,0018)': dataSet.string('x00080018'),
        'Modality (0008,0060)': dataSet.string('x00080060'),
        'StudyDescription (0008,1030)': dataSet.string('x00081030'),
        'BodyPart (0018,0015)': dataSet.string('x00180015'),
        'AccessionNumber (0008,0050)': dataSet.string('x00080050'),
        'TransferSyntax (0002,0010)': dataSet.string('x00020010'),
    };

    console.log('\n📋 DICOM Metadata from original file:\n');
    for (const [label, value] of Object.entries(tags)) {
        console.log(`   ${label}: ${value === undefined ? '❌ MISSING' : `"${value}"`}`);
    }
} catch (e) {
    console.error('Parse error:', e.message);
}
