import dcmjsDimse from "dcmjs-dimse";
const { Dataset, Server, Scp, Transcoding } = dcmjsDimse;
const { CEchoResponse, CStoreResponse } = dcmjsDimse.responses;
const { Status, PresentationContextResult, SopClass, StorageClass, TransferSyntax } = dcmjsDimse.constants;

import fs from "fs";
import path from "path";
import logger from "../config/logger.js";
import { getIO } from "../utils/socketSetup.js";
import taskManager from "../utils/taskManager.js";
import { processPacsStudy } from "../controllers/pacsController.js";
import Case from "../models/Case.js";
import Site from "../models/Site.js";
import User from "../models/User.js";

const INCOMING_DIR = process.env.DICOM_INCOMING_DIR || "./uploads/dicom-incoming";
const studyTracker = new Map();
const COMPLETION_DEBOUNCE_MS = 30000; // 30s lull required to mark study as finished

// Cache: callingAeTitle -> { userId, scpAETitle }
const aeTitleToUserCache = new Map();

/**
 * Resolve technician userId from callingAeTitle (with caching)
 * Looks up Site by scpAETitle, then gets assignedTechnician or createdBy
 */
async function resolveUserIdFromAeTitle(callingAeTitle) {
    if (!callingAeTitle) return null;
    const trimmed = callingAeTitle.trim();
    if (aeTitleToUserCache.has(trimmed)) {
        return aeTitleToUserCache.get(trimmed);
    }
    try {
        const escapedAe = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const site = await Site.findOne({ scpAETitle: { $regex: new RegExp(`^${escapedAe}$`, 'i') } })
            .populate('assignedTechnician')
            .populate('createdBy');
        if (site) {
            const user = site.assignedTechnician || site.createdBy;
            if (user) {
                aeTitleToUserCache.set(trimmed, user._id.toString());
                return user._id.toString();
            }
        }
        // If not found, cache null to avoid repeated lookups
        aeTitleToUserCache.set(trimmed, null);
        return null;
    } catch (err) {
        logger.error(`Error resolving userId from AE title ${trimmed}: ${err.message}`);
        return null;
    }
}

// Initialize transcoding for compressed syntaxes
await Transcoding.initializeAsync();

/**
 * Custom SCP Handler
 */
class RadiologyScp extends Scp {
    constructor(socket, opts) {
        super(socket, opts);
    }

    associationRequested(association) {
        this.association = association;
        this.callingAeTitle = association.getCallingAeTitle();
        this.calledAeTitle = association.getCalledAeTitle();

        // Capture source IP from the underlying TCP socket
        const rawIp = this.socket?.remoteAddress || null;
        // Strip IPv6-mapped prefix (::ffff:192.168.1.5 → 192.168.1.5)
        this.sourceIP = rawIp ? rawIp.replace(/^::ffff:/, '') : null;
        logger.info(`C-STORE association requested from AET: ${this.callingAeTitle} → ${this.calledAeTitle}, IP: ${this.sourceIP}`);

        // Accept common storage SOP classes and Verification
        const contexts = association.getPresentationContexts();
        contexts.forEach((c) => {
            const context = association.getPresentationContext(c.id);
            const abstractSyntax = context.getAbstractSyntaxUid();

            // Accept if it's Verification or a Storage class
            if (abstractSyntax === SopClass.Verification || abstractSyntax.startsWith("1.2.840.10008.5.1.4.1.1")) {
                const transferSyntaxes = context.getTransferSyntaxUids();
                transferSyntaxes.forEach((ts) => {
                    if (ts === TransferSyntax.ImplicitVRLittleEndian || ts === TransferSyntax.ExplicitVRLittleEndian) {
                        context.setResult(PresentationContextResult.Accept, ts);
                    }
                });
            } else {
                context.setResult(PresentationContextResult.RejectAbstractSyntaxNotSupported);
            }
        });
        this.sendAssociationAccept();
    }

    cEchoRequest(request, callback) {
        const response = CEchoResponse.fromRequest(request);
        response.setStatus(Status.Success);
        callback(response);
    }

    /**
     * Extract patient/study metadata directly from dcmjs-dimse Dataset.
     * This is more reliable than re-parsing saved files with dicom-parser,
     * especially for Implicit VR Little Endian transfer syntax files.
     */
    extractMetadataFromDataset(dataset) {
        const getStr = (tag) => {
            try {
                const val = dataset.getElement(tag);
                return val ? String(val).trim() : undefined;
            } catch { return undefined; }
        };

        const formatPatientName = (name) => {
            if (!name) return undefined;
            return name.split('^').filter(Boolean).map(part =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
        };

        const parseAge = (val) => {
            if (!val) return undefined;
            const match = val.match(/(\d+)[YMDW]/);
            if (match) return parseInt(match[1]);
            return parseInt(val) || undefined;
        };

        return {
            patientName: formatPatientName(getStr('PatientName')),
            patientId: getStr('PatientID'),
            patientAge: parseAge(getStr('PatientAge')),
            patientGender: getStr('PatientSex'),
            institution: getStr('InstitutionName'),
            sopInstanceUID: getStr('SOPInstanceUID'),
            seriesInstanceUID: getStr('SeriesInstanceUID'),
            studyInstanceUID: getStr('StudyInstanceUID'),
            modality: getStr('Modality'),
            studyDescription: getStr('StudyDescription'),
            bodyPart: getStr('BodyPartExamined'),
            accessionNumber: getStr('AccessionNumber'),
        };
    }

    cStoreRequest(request, callback) {
        const dataset = request.getDataset();
        // dcmjs-dimse 0.3.x elements are safe to convert to String then trim
        const studyUID = String(dataset.getElement("StudyInstanceUID") || "").trim();
        const sopUID = String(dataset.getElement("SOPInstanceUID") || "").trim();

        if (!studyUID) {
            logger.error("Received C-STORE without StudyInstanceUID");

            const response = CStoreResponse.fromRequest(request);
            response.setStatus(Status.ProcessingFailure);
            return callback(response);
        }

        logger.debug(`C-STORE receiving SOP: ${sopUID} for STUDY: ${studyUID}`);

        // Extract metadata from the first file of each study (dcmjs-dimse Dataset
        // handles Implicit VR correctly, unlike dicom-parser re-reading from disk)
        let firstFileMetadata = null;
        if (!studyTracker.has(studyUID)) {
            firstFileMetadata = this.extractMetadataFromDataset(dataset);
            logger.info(`[SCP] Extracted metadata from first file: PatientName=${firstFileMetadata.patientName}, PatientID=${firstFileMetadata.patientId}, Modality=${firstFileMetadata.modality}`);
        }

        try {
            const studyDir = path.join(INCOMING_DIR, studyUID);
            if (!fs.existsSync(studyDir)) fs.mkdirSync(studyDir, { recursive: true });

            const filePath = path.join(studyDir, `${sopUID}.dcm`);

            // dcmjs-dimse Dataset provides toFile() for saving to DICOM P10 format
            dataset.toFile(filePath, (err) => {
                if (err) {
                    logger.error(`Failed to write DICOM file ${sopUID}: ${err.message}`);
                } else {
                    this.trackStudy(studyUID, filePath, firstFileMetadata);
                }
            });
        } catch (err) {
            logger.error(`Failed to save DICOM: ${err.message}`);
        }

        const response = CStoreResponse.fromRequest(request);
        response.setStatus(Status.Success);
        callback(response);
    }

    trackStudy(studyUID, filePath, firstFileMetadata) {
        if (studyTracker.has(studyUID)) {
            const entry = studyTracker.get(studyUID);
            entry.files.push(filePath);
            entry.callingAeTitle = entry.callingAeTitle || this.callingAeTitle;
            entry.calledAeTitle = entry.calledAeTitle || this.calledAeTitle;
            entry.sourceIP = entry.sourceIP || this.sourceIP;

            const taskId = `IM_${studyUID}`;
            taskManager.updateTask(taskId, entry.files.length, null, `Receiving: ${entry.files.length} files`);

            clearTimeout(entry.timer);
            entry.timer = setTimeout(() => this.onComplete(studyUID, entry.files, entry.callingAeTitle, entry.scpMetadata, entry.sourceIP, entry.calledAeTitle), COMPLETION_DEBOUNCE_MS);
        } else {
            const timer = setTimeout(() => {
                const entry = studyTracker.get(studyUID);
                if (entry) this.onComplete(studyUID, entry.files, entry.callingAeTitle, entry.scpMetadata, entry.sourceIP, entry.calledAeTitle);
            }, COMPLETION_DEBOUNCE_MS);
            const entry = {
                files: [filePath],
                timer,
                callingAeTitle: this.callingAeTitle,
                calledAeTitle: this.calledAeTitle,
                sourceIP: this.sourceIP,
                scpMetadata: firstFileMetadata || null,
                userId: null,
            };
            studyTracker.set(studyUID, entry);

            const taskId = `IM_${studyUID}`;
            // Start task without userId initially; will update once resolved
            taskManager.startTask(taskId, 'PACS_PUSH', 100, { studyInstanceUID: studyUID }, "Receiving DICOM files...", null);
            taskManager.updateTask(taskId, 1, null, "Receiving files...");

            // Asynchronously resolve userId from callingAeTitle and update task
            resolveUserIdFromAeTitle(this.callingAeTitle).then(userId => {
                const currentEntry = studyTracker.get(studyUID);
                if (currentEntry) {
                    currentEntry.userId = userId;
                    if (userId) {
                        taskManager.setTaskUserId(taskId, userId);
                    }
                }
            }).catch(err => {
                logger.error(`Error resolving userId for ${studyUID}: ${err.message}`);
            });
        }
    }

    async onComplete(studyUID, files, callingAeTitle, scpMetadata, sourceIP, calledAeTitle) {
        logger.info(`Study received [SCP]: ${studyUID} — ${files.length} files — callingAeTitle: "${callingAeTitle}", calledAeTitle: "${calledAeTitle}", sourceIP: ${sourceIP}`);

        // Trim AE title (DICOM pads to 16 chars with trailing spaces)
        const trimmedAeTitle = callingAeTitle ? callingAeTitle.trim() : null;

        if (!trimmedAeTitle) {
            logger.warn(`[SCP] callingAeTitle missing for study ${studyUID} — server may have restarted mid-transfer. Defaulting to admin attribution.`);
        }

        const studyInstanceUID = studyUID;
        const caseDoc = await Case.findOne({ studyInstanceUID });
        const expected = caseDoc?.expectedFiles || 0;

        if (expected > 0 && files.length < expected) {
            const errorMsg = `Incomplete transfer: Only ${files.length} of ${expected} files received. Study auto-deleted for data integrity.`;
            logger.error(`[Integrity Failure] ${errorMsg}`);

            // 1. Delete DB Entry
            await Case.deleteOne({ studyInstanceUID });

            // 2. Delete partial files
            const studyDir = path.join(INCOMING_DIR, studyUID);
            if (fs.existsSync(studyDir)) {
                fs.rmSync(studyDir, { recursive: true, force: true });
            }

            // 3. Notify Frontend
            taskManager.failTask(`IM_${studyUID}`, "Integrity Error", { message: errorMsg, type: 'IntegrityError' });

            // 4. Clear cache
            const { clearCache } = await import("../middleware/cacheMiddleware.js");
            clearCache(`cache:*:/api/cases*`).catch(e => logger.error(`Cache clear error: ${e.message}`));

            studyTracker.delete(studyUID);
            return;
        }

        // Let the unified task manager know we're processing now
        taskManager.updateTask(`IM_${studyUID}`, files.length, expected || files.length, "Files received. Processing study...");

        // Internal Processing (Direct call, no HTTP needed)
        try {
            await processPacsStudy(studyUID, files.length, path.join(INCOMING_DIR, studyUID), trimmedAeTitle, scpMetadata, sourceIP, calledAeTitle);
            logger.info("Study processing complete");
            taskManager.completeTask(`IM_${studyUID}`, "Import Complete");
        } catch (err) {
            logger.error(`Study processing failed: ${err.message}`);
            taskManager.failTask(`IM_${studyUID}`, "Processing failed: " + err.message);
        }

        studyTracker.delete(studyUID);
    }

    associationReleaseRequested() {
        this.sendAssociationReleaseResponse();
    }
}

let dicomServer = null;

export const startDicomSCP = () => {
    const port = parseInt(process.env.DICOM_SCU_PORT || "4243", 10);
    dicomServer = new Server(RadiologyScp);

    dicomServer.on('networkError', (e) => {
        logger.error(`DICOM SCP Network Error: ${e.message}`);
    });

    logger.info(`Starting DICOM C-STORE SCP on port ${port}...`);
    try {
        dicomServer.listen(port);
        logger.info(`✅ DICOM SCP is listening on port ${port}`);
    } catch (err) {
        logger.error(`❌ Failed to start DICOM SCP: ${err.message}`);
    }
};

export const stopDicomSCP = () => {
    if (dicomServer) {
        logger.info("Closing DICOM SCP...");
        dicomServer.close();
        dicomServer = null;
    }
};

/**
 * Returns the list of studies currently being received by the SCP listener.
 * Used by GET /api/pacs/scp-status to provide live status to the frontend.
 * @param {string[]} [allowedAeTitles] - If provided, only return studies with callingAeTitle in this list
 */
export const getActiveStudies = (allowedAeTitles = null) => {
    const entries = [...studyTracker.entries()];
    const filtered = allowedAeTitles
        ? entries.filter(([uid, entry]) => {
            const aeTitle = entry.callingAeTitle ? entry.callingAeTitle.trim() : null;
            return aeTitle && allowedAeTitles.includes(aeTitle);
        })
        : entries;
    return filtered.map(([uid, entry]) => ({
        studyInstanceUID: uid,
        receivedFiles: entry.files.length,
        callingAeTitle: entry.callingAeTitle,
        userId: entry.userId || null,
    }));
}; 