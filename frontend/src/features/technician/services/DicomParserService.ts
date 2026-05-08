import dicomParser from 'dicom-parser';

export interface DicomMetadata {
    patientName: string;
    patientId: string;
    patientAge: number;
    patientGender: 'M' | 'F' | 'O';
    modality: string;
    bodyPart: string;
    studyInstanceUID: string;
    studyDescription: string;
    studyDate: string;
    institution: string;
    accessionNumber: string;
    seriesCount: number;
    imageCount: number;
}

export const DicomParserService = {
    async parseFiles(files: File[]): Promise<DicomMetadata> {
        if (files.length === 0) {
            throw new Error("No files provided for parsing");
        }

        // Filter and find the first valid DICOM file
        let firstValidFile: File | null = null;
        let dataSet: any = null;

        // Sort files to try and prioritize actual DICOM files (often have .dcm or no extension)
        const sortedFiles = [...files].sort((a, b) => {
            if (a.name.toLowerCase().endsWith('.dcm')) return -1;
            if (b.name.toLowerCase().endsWith('.dcm')) return 1;
            return 0;
        });

        for (const file of sortedFiles) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const byteArray = new Uint8Array(arrayBuffer);
                const ds = dicomParser.parseDicom(byteArray);

                // CRITICAL: Ensure we actually get a StudyInstanceUID
                const uid = ds.string('x0020000d');
                if (uid) {
                    dataSet = ds;
                    firstValidFile = file;
                    console.log(`Successfully parsed DICOM file with UID: ${file.name}`);
                    break; // Found a valid DICOM file with UID
                }
            } catch (err) {
                // Not a valid DICOM or parsing error, continue to next file
                continue;
            }
        }

        if (!firstValidFile || !dataSet) {
            throw new Error("No valid DICOM files found in the selection");
        }

        const getCleanString = (tag: string) => {
            const val = dataSet.string(tag) || '';
            return val.replace(/\^/g, ' ').trim();
        };

        const rawGender = dataSet.string('x00100040')?.toUpperCase() || '';
        let mappedGender: 'M' | 'F' | 'O' = 'O';
        if (rawGender === 'M') mappedGender = 'M';
        if (rawGender === 'F') mappedGender = 'F';

        const metadata: DicomMetadata = {
            patientName: getCleanString('x00100010'),
            patientId: getCleanString('x00100020'),
            patientAge: parseInt(dataSet.string('x00101010') || '0'),
            patientGender: mappedGender,
            modality: getCleanString('x00080060'),
            bodyPart: getCleanString('x00180015') || getCleanString('x00081030').split(' ')[0] || 'GENERAL',
            studyInstanceUID: dataSet.string('x0020000d') || `LOCAL_${Date.now()}`,
            studyDescription: getCleanString('x00081030'),
            studyDate: getCleanString('x00080020'),
            institution: getCleanString('x00080080'),
            accessionNumber: getCleanString('x00080050'),
            seriesCount: 1, // Basic estimation
            imageCount: files.length
        };

        console.log("Real Metadata Parsed:", metadata);
        return metadata;
    },

    validateStudy(metadata: DicomMetadata, selectedType: string): { isValid: boolean; warning?: string } {
        if (selectedType === 'Brain' && metadata.studyDescription.includes('CHEST')) {
            return {
                isValid: false,
                warning: "Metadata mismatch: Study is 'CT CHEST' but 'Brain' was selected."
            };
        }
        return { isValid: true };
    }
};
