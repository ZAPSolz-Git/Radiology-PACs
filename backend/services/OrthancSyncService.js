import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import logger from '../config/logger.js';

/**
 * OrthancSyncService
 * 
 * Handles mirroring of DICOM studies from the project's local storage to Orthanc.
 * This allows the frontend to use Orthanc's high-performance WADO-RS for viewing.
 */
class OrthancSyncService {
    constructor() {
        this.orthancUrl = process.env.ORTHANC_URL || 'http://localhost:8042';
        this.orthancAuth = {
            username: process.env.ORTHANC_USER || 'orthanc',
            password: process.env.ORTHANC_PASSWORD || 'orthanc'
        };
    }

    /**
     * Pushes all DICOM files in a local directory to Orthanc.
     * @param {string} studyDir Absolute path to the study directory containing /dicom folder
     */
    async syncStudy(studyDir) {
        const dicomDir = path.join(studyDir, 'dicom');

        if (!fs.existsSync(dicomDir)) {
            logger.warn(`[OrthancSync] Dicom directory not found: ${dicomDir}`);
            return;
        }

        const files = fs.readdirSync(dicomDir).filter(f => f.toLowerCase().endsWith('.dcm'));

        logger.info(`[OrthancSync] Starting sync for ${files.length} files to Orthanc at ${this.orthancUrl}...`);

        let successCount = 0;
        let failCount = 0;

        // We use a larger concurrency limit to utilize the 10 vCPU server capacity
        const concurrency = 20;
        for (let i = 0; i < files.length; i += concurrency) {
            const chunk = files.slice(i, i + concurrency);
            const results = await Promise.all(chunk.map(file => this.uploadFile(path.join(dicomDir, file))));
            results.forEach(r => r ? successCount++ : failCount++);
        }

        logger.info(`[OrthancSync] Sync complete for ${studyDir} — Success: ${successCount}, Failed: ${failCount}`);
    }

    async uploadFile(filePath) {
        return this.uploadStream(filePath, path.basename(filePath));
    }

    /**
     * Uploads a DICOM file as a stream to Orthanc, preventing Out-Of-Memory errors
     * @param {string} filePath Absolute path to the DICOM file
     * @param {string} fileName Descriptive name for logging
     */
    async uploadStream(filePath, fileName = 'file') {
        try {
            const stream = fs.createReadStream(filePath);
            await axios.post(`${this.orthancUrl}/instances`, stream, {
                headers: { 'Content-Type': 'application/dicom' },
                auth: this.orthancAuth,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            return true;
        } catch (error) {
            if (error.response && error.response.status === 409) {
                return true; // Already exists
            }
            logger.error(`[OrthancSync] Failed to stream ${fileName}: ${error.message} (status: ${error.response?.status || 'N/A'})`);
            return false;
        }
    }

    /**
     * Uploads a raw DICOM buffer to Orthanc
     * @param {Buffer} buffer DICOM file buffer
     * @param {string} fileName Descriptive name for logging
     */
    async uploadBuffer(buffer, fileName = 'buffer') {
        try {
            await axios.post(`${this.orthancUrl}/instances`, buffer, {
                headers: { 'Content-Type': 'application/dicom' },
                auth: this.orthancAuth,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            return true;
        } catch (error) {
            if (error.response && error.response.status === 409) {
                return true; // Already exists
            }
            logger.error(`[OrthancSync] Failed to upload ${fileName}: ${error.message} (status: ${error.response?.status || 'N/A'})`);
            return false;
        }
    }

    /**
     * Converts a JPEG/PNG image to DICOM and uploads it to Orthanc
     * @param {string} imagePath Absolute path to the image file
     * @param {object} patientTags Tags for the new DICOM instance
     * @param {string} orthancStudyId Optional parent study ID to attach to
     */
    async dicomizeImage(imagePath, patientTags, orthancStudyId = null) {
        try {
            // Step 1: Read and convert to PNG (Orthanc requirement for /tools/create-dicom)
            const pngBuffer = await sharp(imagePath)
                .png()
                .toBuffer();

            const base64 = pngBuffer.toString('base64');

            // Step 2: Prepare Orthanc payload
            const payload = {
                Force: true,
                Content: `data:image/png;base64,${base64}`,
                Tags: {
                    PatientName: patientTags.patientName || 'ANONYMOUS',
                    PatientID: patientTags.patientId || '000000',
                    PatientBirthDate: patientTags.patientBirthDate || '',
                    PatientSex: patientTags.patientSex || 'O',
                    StudyDate: patientTags.studyDate || new Date().toISOString().split('T')[0].replace(/-/g, ''),
                    StudyInstanceUID: patientTags.studyInstanceUID,
                    SeriesInstanceUID: `1.2.826.0.1.3680043.8.498.${Date.now()}.${Math.floor(Math.random() * 1000)}`,
                    Modality: 'SC', // Secondary Capture
                    SeriesDescription: 'Clinical Images',
                    SOPClassUID: '1.2.840.10008.5.1.4.1.1.7', // Secondary Capture Image Storage
                }
            };

            if (orthancStudyId) {
                payload.Parent = orthancStudyId;
            }

            // Step 3: POST to Orthanc
            const response = await axios.post(
                `${this.orthancUrl}/tools/create-dicom`,
                payload,
                { auth: this.orthancAuth }
            );

            return response.data.ID;
        } catch (error) {
            logger.error(`[OrthancSync] Failed to dicomize image ${imagePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Finds the Orthanc internal Study ID for a given StudyInstanceUID
     * @param {string} studyInstanceUID 
     */
    async getStudyIdByUID(studyInstanceUID) {
        try {
            const response = await axios.post(
                `${this.orthancUrl}/tools/find`,
                {
                    Level: 'Study',
                    Query: { StudyInstanceUID: studyInstanceUID }
                },
                { auth: this.orthancAuth }
            );

            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            logger.error(`[OrthancSync] Failed to find study by UID ${studyInstanceUID}: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetches raw DICOM file buffer from Orthanc
     */
    async getInstanceFile(instanceId) {
        const response = await axios.get(`${this.orthancUrl}/instances/${instanceId}/file`, {
            auth: this.orthancAuth,
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    }
}

export const orthancSyncService = new OrthancSyncService();
