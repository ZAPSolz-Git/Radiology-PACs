/**
 * Diagnostic 2: Try reading with explicit element access for Implicit VR
 */
import fs from "fs";
import dicomParser from "dicom-parser";

const FILE = "C:\\Users\\admin\\Desktop\\Varun\\conference\\(KASINATHAN  69Y  M) LOWER LIMB\\53450605\\53450605_1.dcm";

const buffer = fs.readFileSync(FILE);
const byteArray = new Uint8Array(buffer);

try {
    const dataSet = dicomParser.parseDicom(byteArray);

    // List all elements in the dataset
    console.log('\n📋 All elements in the DICOM file:\n');
    let count = 0;
    for (const tag in dataSet.elements) {
        const element = dataSet.elements[tag];
        let value = '';
        try {
            value = dataSet.string(tag) || `[binary ${element.length} bytes]`;
        } catch {
            value = `[binary ${element.length} bytes]`;
        }
        
        // Only show tags in groups 0008, 0010, 0018, 0020, 0028 (standard)
        if (tag.startsWith('x0008') || tag.startsWith('x0010') || 
            tag.startsWith('x0018') || tag.startsWith('x0020') ||
            tag.startsWith('x0028') || tag.startsWith('x0002')) {
            console.log(`   ${tag}: ${typeof value === 'string' ? value.substring(0, 80) : value}`);
            count++;
        }
    }
    console.log(`\n   Total standard-group elements found: ${count}`);
    console.log(`   Total elements in file: ${Object.keys(dataSet.elements).length}`);
} catch (e) {
    console.error('Parse error:', e.message);
}
