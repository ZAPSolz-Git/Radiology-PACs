import fs from "fs";
import path from "path";
import dcmjsDimse from "dcmjs-dimse";
const { Client, Dataset } = dcmjsDimse;
const { CEchoRequest, CFindRequest, CMoveRequest, CStoreRequest } = dcmjsDimse.requests;
const { Status } = dcmjsDimse.constants;

import logger from "../config/logger.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import Case from "../models/Case.js";
import dimse from 'dicom-dimse-native';
import taskManager from "../utils/taskManager.js";

/**
 * Helper to map DICOM status codes to human-readable messages
 */
const getDicomErrorMessage = (status) => {
    const hex = `0x${status.toString(16).toUpperCase()}`;
    switch (status) {
        case 0xC000:
        case 0xC001:
        case 0xC002:
        case 0xC003:
            return `${hex}: Unable to Process - The PACS server doesn't recognize our AE Title or IP. Please check PACS registration.`;
        case 0xA702:
            return `${hex}: Out of Resources - The PACS server's disk might be full or database busy.`;
        case 0xA801:
            return `${hex}: Move Destination Unknown - The PACS doesn't know where to send images (Check Move Destination AE Title).`;
        case 0xA900:
            return `${hex}: Identifier Does Not Match - The study record was not found on the PACS.`;
        case 0xFE00:
            return `${hex}: Sub-operation Terminated - The transfer was canceled.`;
        default:
            return `${hex}: Unknown DICOM Failure (Status: ${hex}). Consult PACS logs.`;
    }
};

/**
 * Validate UID format before sending to PACS
 */
const isValidUID = (uid) => /^[0-2](\.[0-9]+)+$/.test(uid);

/**
 * Performs a C-ECHO (DICOM ping)
 */
export const cEcho = (site) => {
    return new Promise((resolve, reject) => {
        const client = new Client();
        const request = new CEchoRequest();
        const start = Date.now();

        request.on('response', (response) => {
            if (response.getStatus() === Status.Success) {
                const latency = `${Date.now() - start}ms`;
                logger.info(`C-ECHO success [${site.siteId}] — latency: ${latency}`);
                resolve({ success: true, latency });
            } else {
                reject(new AppError(`C-ECHO failed with status ${response.getStatus()}`, HTTP_STATUS.BAD_GATEWAY));
            }
        });

        client.on('networkError', (err) => {
            logger.error(`C-ECHO network error [${site.siteId}]: ${err.message}`);
            reject(new AppError(`C-ECHO failed: ${err.message}`, HTTP_STATUS.GATEWAY_TIMEOUT));
        });

        logger.debug(`Sending C-ECHO: Local(${site.scuAETitle}) -> Remote(${site.scpAETitle}@${site.scpIP}:${site.scpPort})`);
        client.addRequest(request);
        client.send(site.scpIP, site.scpPort, site.scuAETitle, site.scpAETitle);
    });
};

/**
 * Performs a C-FIND (Study Root Query)
 */
export const cFind = (site, query = {}) => {
    return new Promise((resolve, reject) => {
        const client = new Client();
        let isDone = false;

        // Failsafe timeout
        const timeout = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                reject(new AppError("C-FIND timeout. The PACS server did not respond in time.", HTTP_STATUS.GATEWAY_TIMEOUT));
            }
        }, 15000); // 15 second timeout

        // Match terms: DICOM uses empty string for universal matching
        const searchTags = {
            QueryRetrieveLevel: "STUDY",
            PatientID: query.patientId || "",
            PatientName: query.patientName || "",
            AccessionNumber: query.accessionNumber || "",
            StudyDate: query.studyDate || "",
            PatientBirthDate: "",
            PatientSex: "",
            ReferringPhysicianName: "",
            InstitutionName: "",
            StudyTime: "",
            ModalitiesInStudy: "",
            StudyDescription: "",
            StudyInstanceUID: "",
        };

        const studyRequest = CFindRequest.createStudyFindRequest(searchTags);
        const results = [];

        studyRequest.on('response', (response) => {
            if (response.getStatus() === Status.Pending && response.hasDataset()) {
                const ds = response.getDataset();
                const el = ds.elements || ds;

                const getVal = (...keys) => {
                    for (const key of keys) {
                        const val = el[key];
                        if (val === undefined || val === null || val === '') continue;
                        if (typeof val === 'string') return val;
                        if (typeof val === 'number') return String(val);
                        if (Array.isArray(val) && val.length > 0) {
                            const first = val[0];
                            if (typeof first === 'string') return first;
                            if (typeof first === 'object' && first.Alphabetic) return first.Alphabetic;
                            return String(first);
                        }
                        if (typeof val === 'object' && val.Alphabetic) return val.Alphabetic;
                        if (typeof val === 'object' && Array.isArray(val.Value) && val.Value.length > 0) {
                            const first = val.Value[0];
                            if (typeof first === 'string') return first;
                            if (typeof first === 'object' && first.Alphabetic) return first.Alphabetic;
                            return String(first);
                        }
                        return String(val);
                    }
                    return '';
                };

                const parsed = {
                    studyInstanceUID: getVal('StudyInstanceUID'),
                    patientName: getVal('PatientName'),
                    patientId: getVal('PatientID'),
                    accessionNumber: getVal('AccessionNumber'),
                    studyDate: getVal('StudyDate'),
                    modality: getVal('ModalitiesInStudy'),
                    studyDescription: getVal('StudyDescription'),
                    patientBirthDate: getVal('PatientBirthDate'),
                    patientSex: getVal('PatientSex'),
                    referringPhysicianName: getVal('ReferringPhysicianName'),
                    institutionName: getVal('InstitutionName'),
                    numberOfInstances: getVal('NumberOfStudyRelatedInstances'),
                };

                results.push(parsed);
            } else if (response.getStatus() === Status.Success) {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeout);
                    logger.info(`C-FIND complete [${site.siteId}] — ${results.length} result(s)`);
                    resolve(results);
                }
            }
        });

        client.on('networkError', (err) => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                logger.error(`C-FIND network error [${site.siteId}]: ${err.message}`);
                reject(new AppError(`C-FIND failed: ${err.message}`, HTTP_STATUS.GATEWAY_TIMEOUT));
            }
        });

        client.on('associationRejected', (response) => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                const result = response.getResult ? response.getResult() : 'Unknown';
                logger.error(`C-FIND rejected by ${site.siteId}: ${result}`);
                reject(new AppError(`PACS rejected association. Check AE Titles (Local: ${site.scuAETitle}, Remote: ${site.scpAETitle})`, HTTP_STATUS.UNAUTHORIZED));
            }
        });

        client.on('associationAborted', () => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                logger.error(`C-FIND aborted by ${site.siteId}. Protocol error or AE Title mismatch.`);
                reject(new AppError(`PACS aborted connection. Verify AE Titles and network permissions.`, HTTP_STATUS.UNAUTHORIZED));
            }
        });

        client.on('closed', () => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                reject(new AppError(`PACS closed connection unexpectedly during C-FIND.`, HTTP_STATUS.BAD_GATEWAY));
            }
        });

        client.addRequest(studyRequest);

        try {
            client.send(site.scpIP, site.scpPort, site.scuAETitle, site.scpAETitle);
        } catch (err) {
            clearTimeout(timeout);
            reject(new AppError(`Failed to send C-FIND: ${err.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR));
        }
    });
};

/**
 * Performs a C-MOVE
 */
export const cMove = (site, studyInstanceUID) => {
    return new Promise((resolve, reject) => {
        if (!isValidUID(studyInstanceUID)) {
            return reject(new AppError("Invalid StudyInstanceUID format", HTTP_STATUS.BAD_REQUEST));
        }

        const client = new Client();
        let isDone = false;

        const timeout = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                reject(new AppError("C-MOVE timeout. The PACS server did not respond in time.", HTTP_STATUS.GATEWAY_TIMEOUT));
            }
        }, 15000);

        const request = CMoveRequest.createStudyMoveRequest(site.scuAETitle, studyInstanceUID);

        request.on('response', (response) => {
            const status = response.getStatus();
            if (status === Status.Pending) {
                const completed = response.getCompleted() || 0;
                const remaining = response.getRemaining() || 0;
                const total = completed + remaining;

                const taskId = `IM_${studyInstanceUID}`;
                // Since this runs continuously during the move, we use it to update the global total and progress
                // It's possible dicomSCP started the task already, or we can start/update it here
                taskManager.updateTask(taskId, completed, total, `Receiving: ${completed} / ${total} files`);

                // Resolve early on first pending - this proves the PACS accepted the command
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeout);
                    logger.info(`C-MOVE initiated [${site.siteId}] for StudyUID: ${studyInstanceUID}`);
                    resolve({
                        status: "C-MOVE initiated — PACS is sending files",
                        studyInstanceUID,
                        totalFiles: total
                    });
                }

                if (completed === 1 && total > 0) {
                    Case.findOneAndUpdate(
                        { studyInstanceUID },
                        { expectedFiles: total }
                    ).catch(err => logger.error(`Failed to save expectedFiles: ${err.message}`));
                }
            } else if (status === Status.Success) {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeout);
                    logger.info(`C-MOVE complete status received [${site.siteId}] for StudyUID: ${studyInstanceUID}`);
                    resolve({
                        status: "C-MOVE complete",
                        studyInstanceUID,
                    });
                }
            } else {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeout);
                    const errorMsg = getDicomErrorMessage(status);
                    logger.warn(`C-MOVE failure status [${site.siteId}]: ${errorMsg}`);
                    reject(new AppError(errorMsg, HTTP_STATUS.BAD_GATEWAY));
                }
            }
        });

        client.on('networkError', (err) => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                logger.error(`C-MOVE network error [${site.siteId}]: ${err.message}`);
                reject(new AppError(`C-MOVE failed: ${err.message}`, HTTP_STATUS.GATEWAY_TIMEOUT));
            }
        });

        client.on('associationAborted', () => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                const msg = `PACS aborted connection (0x101). Verification failed - Check AE Titles: Local(${site.scuAETitle}), Remote(${site.scpAETitle})`;
                logger.error(`C-MOVE aborted [${site.siteId}]: ${msg}`);
                reject(new AppError(msg, HTTP_STATUS.UNAUTHORIZED));
            }
        });

        client.on('closed', () => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                reject(new AppError(`PACS closed connection unexpectedly during C-MOVE.`, HTTP_STATUS.BAD_GATEWAY));
            }
        });

        client.addRequest(request);

        try {
            client.send(site.scpIP, site.scpPort, site.scuAETitle, site.scpAETitle);
        } catch (err) {
            clearTimeout(timeout);
            reject(new AppError(`Failed to send C-MOVE: ${err.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR));
        }
    });
};

/**
 * Internal helper to send a batch of files in a single DICOM association
 */
const performCStoreAssociation = (site, files) => {
    return new Promise(async (resolve) => {
        const results = { success: [], fail: [] };
        if (!files || files.length === 0) return resolve(results);

        const client = new Client();

        // Step 1: Pre-load ALL datasets before opening association
        const requests = [];
        for (const filePath of files) {
            try {
                const buffer = await fs.promises.readFile(filePath);
                if (!buffer || buffer.length === 0) {
                    results.fail.push(filePath);
                    continue;
                }
                let dataset;
                try {
                    dataset = new Dataset(buffer);
                } catch (parseErr) {
                    logger.warn(`[C-STORE] Skipping invalid DICOM: ${path.basename(filePath)}`);
                    results.fail.push(filePath);
                    continue;
                }
                const request = new CStoreRequest(dataset);
                request.on('response', (response) => {
                    const status = response.getStatus();
                    if (status === 0x0000 || status === 0x0111) {
                        results.success.push(filePath);
                    } else {
                        logger.warn(`[C-STORE] DICOM status 0x${status.toString(16)} for ${path.basename(filePath)}`);
                        results.fail.push(filePath);
                    }
                });
                requests.push(request);
                client.addRequest(request);
            } catch (readErr) {
                logger.warn(`[C-STORE] Failed to read ${path.basename(filePath)}: ${readErr.message}`);
                results.fail.push(filePath);
            }
        }

        if (requests.length === 0) return resolve(results);

        // Step 2: Handle connection events
        client.on('networkError', (err) => {
            logger.error(`[C-STORE] Network error: ${err.message}`);
            resolve(results);
        });

        client.on('closed', () => {
            resolve(results);
        });

        // Step 3: NOW open the association with ALL requests already queued
        logger.info(`[PACS Export] Opening association: ${site.scuAETitle} -> ${site.scpAETitle} @ ${site.scpIP}:${site.scpPort} (${requests.length} files)`);
        try {
            client.send(site.scpIP, site.scpPort, site.scuAETitle, site.scpAETitle);
        } catch (err) {
            logger.error(`[C-STORE] Failed to open association: ${err.message}`);
            resolve(results);
        }
    });
};

/**
 * Internal helper to handle retries for a specific batch of files
 */
const sendBatchWithRetry = async (site, files) => {
    let pendingFiles = [...files];
    let totalSuccessfulCount = 0;
    const finalFailures = [];

    // Max 3 retries = Total 4 attempts
    for (let attempt = 1; attempt <= 4; attempt++) {
        if (pendingFiles.length === 0) break;

        if (attempt > 1) {
            const delay = Math.pow(2, attempt - 2) * 1000; // 1s, 2s, 4s
            await new Promise(r => setTimeout(r, delay));
            logger.warn(`[C-STORE] Attempt ${attempt} finished with ${pendingFiles.length} failures. Retrying failed files...`);
        }

        const results = await performCStoreAssociation(site, pendingFiles);
        totalSuccessfulCount += results.success.length;

        if (results.fail.length > 0 && attempt < 4) {
            pendingFiles = results.fail;
        } else {
            finalFailures.push(...results.fail);
            break;
        }
    }

    return { successCount: totalSuccessfulCount, failedFiles: finalFailures };
};

/**
 * Sends a single batch directory via native storeScu
 */
const sendBatchNative = (site, batchDir) => {
    return new Promise((resolve, reject) => {
        const storeOptions = {
            source: {
                aet: site.scuAETitle,
                ip: site.scuIP || "127.0.0.1",
                port: String(site.scuPort || 9999)
            },
            target: {
                aet: site.scpAETitle,
                ip: site.scpIP,
                port: String(site.scpPort)
            },
            sourcePath: batchDir
        };

        dimse.storeScu(storeOptions, (result) => {
            try {
                const parsed = JSON.parse(result);
                if (parsed.status === "success" || parsed.code === 0) {
                    resolve({ success: true, count: parsed.count || 0 });
                } else {
                    reject(new Error(parsed.message || "storeScu failed"));
                }
            } catch (e) {
                reject(new Error(`storeScu parse error: ${result}`));
            }
        });
    });
};

/**
 * Performs a C-STORE to send DICOM files directly to a PACS with per-batch progress.
 * Files are split into batches of ~50, each batch gets its own temp sub-directory
 * with hard links, enabling per-batch native storeScu calls and real progress reporting.
 *
 * @param {Object} site - Site configuration (scpIP, scpPort, scuAETitle, scpAETitle)
 * @param {string} studyDicomDir - Absolute path to directory containing DICOM files
 * @param {Object} options - { onProgress: (transmitted, total) => void }
 */
export const cStore = async (site, studyDicomDir, options = {}) => {
    const { onProgress } = options;

    // Read all DICOM files from the source directory
    const allFiles = fs.readdirSync(studyDicomDir).filter(f =>
        f.toLowerCase().endsWith('.dcm') || f.toLowerCase().endsWith('.dcm')
    );
    const totalFiles = allFiles.length;

    if (totalFiles === 0) {
        logger.warn(`[C-STORE] No DICOM files found in ${studyDicomDir}`);
        return { successCount: 0, failedFiles: [] };
    }

    logger.info(`[C-STORE] Starting batched transmission: ${totalFiles} files from ${studyDicomDir}`);

    const BATCH_SIZE = 50;
    let totalSuccess = 0;
    const failedFiles = [];

    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const batchFiles = allFiles.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);

        // Create a temp sub-directory for this batch
        const batchDir = path.join(studyDicomDir, `_batch_${batchIndex}`);
        fs.mkdirSync(batchDir, { recursive: true });

        // Hard-link files into the batch directory (instant, no copy overhead)
        for (const file of batchFiles) {
            const src = path.join(studyDicomDir, file);
            const dest = path.join(batchDir, file);
            try {
                fs.linkSync(src, dest);
            } catch (linkErr) {
                // Fallback to copy if hard link fails (e.g. cross-device)
                try {
                    fs.copyFileSync(src, dest);
                } catch (copyErr) {
                    logger.warn(`[C-STORE] Could not stage file ${file}: ${copyErr.message}`);
                    failedFiles.push(path.join(studyDicomDir, file));
                }
            }
        }

        // Send this batch via native storeScu
        try {
            logger.info(`[C-STORE] Sending batch ${batchIndex}/${totalBatches} (${batchFiles.length} files)`);
            const result = await sendBatchNative(site, batchDir);
            totalSuccess += result.count;
        } catch (err) {
            logger.error(`[C-STORE] Batch ${batchIndex} failed: ${err.message}`);
            // Mark all files in this batch as failed
            for (const file of batchFiles) {
                failedFiles.push(path.join(studyDicomDir, file));
            }
        }

        // Clean up the batch sub-directory
        try {
            fs.rmSync(batchDir, { recursive: true, force: true });
        } catch (cleanErr) {
            logger.warn(`[C-STORE] Could not clean batch dir: ${cleanErr.message}`);
        }

        // Emit progress
        if (onProgress) {
            onProgress(Math.min(i + BATCH_SIZE, totalFiles), totalFiles);
        }
    }

    logger.info(`[C-STORE] Transmission complete: ${totalSuccess} succeeded, ${failedFiles.length} failed`);
    return { successCount: totalSuccess, failedFiles };
};