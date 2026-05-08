import axios from 'axios';
import fs from 'fs';
import path from 'path';
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
                auth: {
                    username: process.env.ORTHANC_USER || 'orthanc',
                    password: process.env.ORTHANC_PASSWORD || 'orthanc'
                },
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
                auth: {
                    username: process.env.ORTHANC_USER || 'orthanc',
                    password: process.env.ORTHANC_PASSWORD || 'orthanc'
                },
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
}

export const orthancSyncService = new OrthancSyncService();
