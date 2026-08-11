import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import Site from "../models/Site.js";
import { cFind, cMove, cEcho, cStore } from "../services/dicomService.js";
import logger from "../config/logger.js";
import fs from "fs";
import path from "path";
import Case from "../models/Case.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import { extractDicomMetadata } from "../utils/dicomHelper.js";
import { orthancSyncService } from "../services/OrthancSyncService.js";
import os from "os";
import StudyIntegrityService from "../services/StudyIntegrityService.js";
import { getIO } from "../utils/socketSetup.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";
import { clearCache } from "../middleware/cacheMiddleware.js";

// Imported taskManager for background tasks
import taskManager from "../utils/taskManager.js";

// ─── GET /api/pacs/server-info ──────────────────────────────────────────────

/**
 * @desc    Get the server's local IP address and DICOM SCU port
 * @route   GET /api/pacs/server-info
 * @access  Private (Admin/Technician)
 */

export const getServerInfo = asyncHandler(async (req, res) => {
    const interfaces = os.networkInterfaces();

    let wifiIp = null;
    let fallbackIp = null;

    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();

        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {

                // 🎯 Priority: WiFi / Wireless adapters
                if (
                    lowerName.includes("wi-fi") ||
                    lowerName.includes("wifi") ||
                    lowerName.includes("wireless") ||
                    lowerName.includes("wlan")
                ) {
                    wifiIp = iface.address;
                }

                // 🪫 Fallback (first valid IPv4)
                if (!fallbackIp) {
                    fallbackIp = iface.address;
                }
            }
        }
    }

    const finalIp = wifiIp || fallbackIp || "127.0.0.1";

    sendSuccess(res, HTTP_STATUS.OK, "Server information retrieved", {
        localIp: finalIp,
        scuPort: process.env.DICOM_SCU_PORT || "4243"
    });
});

// ─── GET /api/pacs/sites ──────────────────────────────────────────────────────

/**
 * @desc    Get all active hospital sites
 * @route   GET /api/pacs/sites
 * @access  Private (Technician/Admin/QA)
 */
export const getSites = asyncHandler(async (req, res) => {
    const filter = { isActive: true };

    // If the user is a technician, only show sites assigned to them or created by them
    if (req.user.role === 'technician') {
        filter.$or = [
            { assignedTechnician: req.user._id },
            { createdBy: req.user._id }
        ];
    }

    const sites = await Site.find(filter).select(
        "name siteId scpAETitle scpIP scpPort scuAETitle scuIP scuPort lastPing assignedTechnician"
    );
    sendSuccess(res, HTTP_STATUS.OK, "Sites retrieved successfully", sites);
});

// ─── POST /api/pacs/sites ─────────────────────────────────────────────────────

/**
 * @desc    Create a new hospital site
 * @route   POST /api/pacs/sites
 * @access  Private (Admin only)
 */
export const createSite = asyncHandler(async (req, res) => {
    const {
        name, siteId,
        scpAETitle, scpIP, scpPort,
        scuAETitle, scuIP, scuPort,
    } = req.body;

    // Required field check
    const missing = [];
    if (!name) missing.push("name");
    if (!siteId) missing.push("siteId");
    if (!scpAETitle) missing.push("scpAETitle");
    if (!scpIP) missing.push("scpIP");
    if (!scpPort) missing.push("scpPort");
    if (!scuAETitle) missing.push("scuAETitle");
    if (!scuIP) missing.push("scuIP");
    if (!scuPort) missing.push("scuPort");

    if (missing.length > 0) {
        throw new AppError(
            `Missing required fields: ${missing.join(", ")}`,
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const site = await Site.create({
        name: name.trim(),
        siteId: siteId.trim().toUpperCase(),
        scpAETitle: scpAETitle.trim(),
        scpIP: scpIP.trim(),
        scpPort: Number(scpPort),
        scuAETitle: scuAETitle.trim(),
        scuIP: scuIP.trim(),
        scuPort: Number(scuPort),
        createdBy: req.user?._id,
        assignedTechnician: req.user?._id || null,
    });

    logger.info(`Site created: ${site.siteId} by user ${req.user?._id}`);
    sendSuccess(res, HTTP_STATUS.CREATED, "Site created successfully", site);
});

// ─── PUT /api/pacs/sites/:siteId ──────────────────────────────────────────────

/**
 * @desc    Update a hospital site's credentials
 * @route   PUT /api/pacs/sites/:siteId
 * @access  Private (Admin only)
 */
export const updateSite = asyncHandler(async (req, res) => {
    const { siteId } = req.params;

    const allowed = ["name", "scpAETitle", "scpIP", "scpPort", "scuAETitle", "scuIP", "scuPort", "isActive", "assignedTechnician"];
    const updates = {};

    allowed.forEach((field) => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    // Trim AE Titles if provided (preserve original casing for case-sensitive DICOM matching)
    if (updates.scpAETitle) updates.scpAETitle = updates.scpAETitle.trim();
    if (updates.scuAETitle) updates.scuAETitle = updates.scuAETitle.trim();

    const site = await Site.findOneAndUpdate(
        { siteId },
        updates,
        { new: true, runValidators: true }
    );

    if (!site) {
        throw new AppError("Site not found", HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`Site updated: ${siteId} by user ${req.user?._id}`);
    sendSuccess(res, HTTP_STATUS.OK, "Site updated successfully", site);
});

// ─── DELETE /api/pacs/sites/:siteId ──────────────────────────────────────────

/**
 * @desc    Soft-delete (deactivate) a hospital site
 * @route   DELETE /api/pacs/sites/:siteId
 * @access  Private (Admin only)
 */
export const deleteSite = asyncHandler(async (req, res) => {
    const { siteId } = req.params;

    const site = await Site.findOneAndUpdate(
        { siteId },
        { isActive: false },
        { new: true }
    );

    if (!site) {
        throw new AppError("Site not found", HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`Site deactivated: ${siteId} by user ${req.user?._id}`);
    sendSuccess(res, HTTP_STATUS.OK, "Site deactivated successfully", { siteId });
});

// ─── POST /api/pacs/test-connection ──────────────────────────────────────────

/**
 * @desc    Test DICOM connectivity using C-ECHO (DICOM ping)
 * @route   POST /api/pacs/test-connection
 * @access  Private (Admin)
 *
 * Can be used BEFORE saving a site (pass raw credentials)
 * or AFTER (pass siteId to load from DB)
 */
export const testConnection = asyncHandler(async (req, res) => {
    let siteConfig;

    if (req.body.siteId) {
        // Load from DB
        const site = await Site.findOne({ siteId: req.body.siteId });
        if (!site) {
            throw new AppError("Site not found", HTTP_STATUS.NOT_FOUND);
        }
        siteConfig = site;
    } else {
        // Raw credentials (testing before saving)
        const { scpAETitle, scpIP, scpPort, scuAETitle, scuIP } = req.body;
        if (!scpAETitle || !scpIP || !scpPort || !scuAETitle || !scuIP) {
            throw new AppError(
                "Provide either siteId or all of: scpAETitle, scpIP, scpPort, scuAETitle, scuIP",
                HTTP_STATUS.BAD_REQUEST
            );
        }
        siteConfig = {
            siteId: "TEST",
            scpAETitle: scpAETitle.trim(),
            scpIP: scpIP.trim(),
            scpPort: Number(scpPort),
            scuAETitle: scuAETitle.trim(),
            scuIP: scuIP.trim(),
        };
    }

    const result = await cEcho(siteConfig);

    // Update lastPing if it came from DB
    if (req.body.siteId) {
        await Site.findOneAndUpdate({ siteId: req.body.siteId }, { lastPing: new Date() });
    }

    sendSuccess(res, HTTP_STATUS.OK, "C-ECHO successful — PACS is reachable", result);
});

// ─── GET /api/pacs/search ─────────────────────────────────────────────────────

/**
 * @desc    Search studies on PACS using C-FIND
 * @route   GET /api/pacs/search
 * @access  Private (Technician/Admin)
 *
 * Query params: siteId, patientId, patientName, accessionNumber, studyDate
 */
export const searchPACS = asyncHandler(async (req, res) => {
    const { siteId, patientId, accessionNumber, patientName, studyDate } = req.query;

    if (!siteId) {
        throw new AppError("Site ID is required for PACS search", HTTP_STATUS.BAD_REQUEST);
    }

    // At least one search parameter must be provided, or we default to PatientName=* for "all"
    const queryParams = { patientId, patientName, accessionNumber, studyDate };
    const hasParams = Object.values(queryParams).some(v => !!v);

    const searchFilter = hasParams ? queryParams : { patientName: '' };

    const site = await Site.findOne({ siteId, isActive: true });
    if (!site) {
        throw new AppError("Site not found or inactive", HTTP_STATUS.NOT_FOUND);
    }

    if (!site.scpAETitle || !site.scpIP || !site.scpPort) {
        throw new AppError(
            "Site is missing DICOM configuration (scpAETitle, scpIP, scpPort). Please update the site.",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const results = await cFind(site, searchFilter);

    sendSuccess(res, HTTP_STATUS.OK, `C-FIND complete — ${results.length} study(s) found`, results);
});

// ─── POST /api/pacs/import-study ──────────────────────────────────────────────

/**
 * @desc    Create a placeholder case from UI wizard and trigger C-MOVE
 * @route   POST /api/pacs/import-study
 * @access  Private (Technician)
 */
export const importStudyFromPACS = asyncHandler(async (req, res) => {
    const {
        siteId, studyInstanceUID, patientName, patientId, age, gender,
        accessionNumber, institution, clinicalHistory, referringDoctor,
        indication, modality, bodyPart, urgency, isEmergency, checklist
    } = req.body;

    if (!siteId || !studyInstanceUID) {
        throw new AppError("siteId and studyInstanceUID are required", HTTP_STATUS.BAD_REQUEST);
    }

    const site = await Site.findOne({ siteId, isActive: true });
    if (!site) {
        throw new AppError("Site not found or inactive", HTTP_STATUS.NOT_FOUND);
    }

    if (!site.scpAETitle || !site.scpIP || !site.scpPort || !site.scuAETitle) {
        throw new AppError(
            "Site is missing DICOM configuration. Please configure all AE Titles, IPs, and ports.",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // 1. Resolve Patient
    let patient = await Patient.findOne({ patientId });
    if (patient) {
        patient.name = patientName || patient.name;
        patient.age = age ? Number(age) : patient.age;
        patient.gender = gender || patient.gender;
        await patient.save();
    } else {
        patient = await Patient.create({
            patientId,
            name: patientName || 'ANONYMOUS',
            age: age ? Number(age) : 0,
            gender: gender || 'O',
            uploadedBy: req.user._id
        });
    }

    // 2. Create placeholder Case document
    const finalStudyDir = path.join(process.cwd(), 'uploads', 'cases', studyInstanceUID);
    const uploadedBy = req.user ? req.user._id : (await User.findOne({ role: 'admin' }))._id;

    let existingCase = await Case.findOne({ studyInstanceUID });
    if (existingCase) {
        throw new AppError("A case for this study already exists or is downloading.", HTTP_STATUS.CONFLICT);
    }

    const newCase = await Case.create({
        uploadedBy,
        patient: patient._id.toString(),
        studyInstanceUID,
        studyDirectory: finalStudyDir,
        patientName: patient.name,
        patientId: patient.patientId,
        age: patient.age,
        gender: patient.gender,
        accessionNumber: accessionNumber || '',
        institution: institution || '',
        modality: modality || 'UNKNOWN',
        bodyPart: bodyPart || 'UNKNOWN',
        clinicalHistory: clinicalHistory || '',
        referringDoctor: referringDoctor || '',
        indication: indication || '',
        urgency: urgency || 'Routine',
        isEmergency: isEmergency || false,
        checklist: checklist || { detailsVerified: true, correctStudy: true, historyAdded: true, allSeriesUploaded: false },
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'Uploaded',
        source: 'PACS_IMPORT',
        dicomFiles: [],
        attachments: []
    });

    newCase.addTimelineEntry(
        'PACS C-MOVE Triggered',
        req.user || await User.findOne({ role: 'admin' }),
        `Placeholder case created. Triggered C-MOVE from remote PACS for study ${studyInstanceUID}.`,
        {}
    );
    await newCase.save();

    // 3. Trigger C-MOVE
    try {
        await cMove(site, studyInstanceUID);
        // Successful initiation - response is already sent below
    } catch (err) {
        logger.error(`PACS C-MOVE Failed for ${studyInstanceUID}: ${err.message}`);

        // Immediate Cleanup: Delete the placeholder case and directory
        await Case.deleteOne({ _id: newCase._id });
        if (fs.existsSync(finalStudyDir)) {
            fs.rmSync(finalStudyDir, { recursive: true, force: true });
        }

        // Clear cache so the dashboard removes the entry
        clearCache(`cache:*:/api/cases*`).catch(e => logger.error(`Cache clear error: ${e.message}`));

        throw new AppError(err.message || "PACS Connection Failed", HTTP_STATUS.BAD_GATEWAY);
    }

    // Clear cache initially so the dashboard shows the "Receiving" status
    clearCache(`cache:*:/api/cases*`).catch(err => logger.error(`Cache clear error: ${err.message}`));

    sendSuccess(res, HTTP_STATUS.CREATED, "PACS ingestion started", newCase);
});

// ─── POST /api/pacs/import ────────────────────────────────────────────────────

/**
 * @desc    Retrieve a study from PACS using C-MOVE
 * @route   POST /api/pacs/import
 * @access  Private (Technician)
 *
 * Body: { siteId, studyInstanceUID }
 * PACS will push files to our C-STORE SCP listener on scuPort
 */
export const importFromPACS = asyncHandler(async (req, res) => {
    logger.debug(`[PACS Import] Request Body: ${JSON.stringify(req.body)}`);
    logger.debug(`[PACS Import] Query Params: ${JSON.stringify(req.query)}`);

    const siteId = req.body.siteId || req.query.siteId;
    const studyInstanceUID = req.body.studyInstanceUID || req.query.studyInstanceUID;

    if (!siteId || !studyInstanceUID) {
        throw new AppError("siteId and studyInstanceUID are required", HTTP_STATUS.BAD_REQUEST);
    }

    const site = await Site.findOne({ siteId, isActive: true });
    if (!site) {
        throw new AppError("Site not found or inactive", HTTP_STATUS.NOT_FOUND);
    }

    if (!site.scpAETitle || !site.scpIP || !site.scpPort || !site.scuAETitle) {
        throw new AppError(
            "Site is missing DICOM configuration. Please configure all AE Titles, IPs, and ports.",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const result = await cMove(site, studyInstanceUID);

    // C-MOVE is async — PACS will now push files to our C-STORE SCP listener
    // The actual files arrive via the SCP and trigger a "study:received" socket event

    // Clear cache just in case a placeholder already exists or was updated
    clearCache(`cache:*:/api/cases*`).catch(err => logger.error(`Cache clear error: ${err.message}`));

    sendSuccess(res, HTTP_STATUS.ACCEPTED, result.status, {
        studyInstanceUID: result.studyInstanceUID,
        note: "Files will be received by the C-STORE listener. Listen to socket event 'study:received'.",
    });
});

/**
 * @desc    Process a study once fully received by the SCP listener
 * @param   {string} studyInstanceUID
 * @param   {number} expectedFileCount
 * @param   {string} directory
 * @param   {string} callingAeTitle
 */
export const processPacsStudy = async (studyInstanceUID, expectedFileCount, directory, callingAeTitle, scpMetadata = null, sourceIP = null, calledAeTitle = null) => {
    if (!studyInstanceUID || !directory) {
        throw new AppError("studyInstanceUID and directory are required", HTTP_STATUS.BAD_REQUEST);
    }

    // Trim AE title (DICOM protocol pads AE titles with trailing spaces)
    const trimmedAeTitle = callingAeTitle ? callingAeTitle.trim() : null;
    const trimmedCalledAe = calledAeTitle ? calledAeTitle.trim() : null;

    logger.info(`PACS Processing started for study: ${studyInstanceUID} (Expected: ${expectedFileCount} files, callingAeTitle: "${trimmedAeTitle}", calledAeTitle: "${trimmedCalledAe}")`);

    // Step 1: Check if case already exists (Placeholder created by tech)
    let existingCase = await Case.findOne({ studyInstanceUID }).populate('uploadedBy');

    if (existingCase && existingCase.dicomFiles && existingCase.dicomFiles.length > 0) {
        logger.warn(`PACS Ingestion: Case already exists for StudyUID and has files: ${studyInstanceUID}`);
        return;
    }

    if (!fs.existsSync(directory)) {
        throw new AppError("Temporary directory does not exist", HTTP_STATUS.NOT_FOUND);
    }

    const dicomFiles = fs.readdirSync(directory).filter(f => f.endsWith('.dcm'));
    if (dicomFiles.length === 0) {
        throw new AppError("No DICOM files found in directory", HTTP_STATUS.BAD_REQUEST);
    }

    // Step 2: Use SCP-extracted metadata (from dcmjs-dimse Dataset) as primary source.
    // Fall back to dicom-parser only if SCP metadata is unavailable.
    // dcmjs-dimse handles Implicit VR Little Endian correctly, while dicom-parser
    // often fails to parse the dataset portion of Implicit VR files.
    let metadata = null;
    if (scpMetadata && (scpMetadata.patientId || scpMetadata.patientName)) {
        metadata = scpMetadata;
        logger.info(`[PACS] Using SCP-extracted metadata: PatientName=${metadata.patientName}, PatientID=${metadata.patientId}, Modality=${metadata.modality}`);
    } else {
        logger.info(`[PACS] SCP metadata unavailable, falling back to dicom-parser...`);
        let firstValidBuffer = null;
        for (const fileName of dicomFiles) {
            const filePath = path.join(directory, fileName);
            const buffer = fs.readFileSync(filePath);
            const parsed = extractDicomMetadata(buffer);
            if (parsed && parsed.patientId && parsed.patientId !== 'UNKNOWN') {
                metadata = parsed;
                firstValidBuffer = buffer;
                break;
            }
        }
    }

    if (!metadata) {
        // Last resort: create minimal metadata with fallback values
        logger.warn(`PACS Ingestion: Could not extract metadata for StudyUID: ${studyInstanceUID}. Using fallback values.`);
        metadata = {
            patientId: `PACS_${Date.now()}`,
            patientName: 'ANONYMOUS',
            patientAge: 0,
            patientGender: 'O',
            modality: 'UNKNOWN',
            studyDescription: '',
            bodyPart: 'UNKNOWN',
            accessionNumber: '',
            institution: '',
        };
    }

    // Step 2.5: Resolve attributed technician early (needed for Patient.uploadedBy)
    let systemAdmin = await User.findOne({ role: 'admin' });
    if (!systemAdmin) {
        throw new AppError("No admin user found to attribute PACS ingestion", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    let attributedTechnician = systemAdmin;
    if (trimmedAeTitle) {
        // Stage 1: Match by BOTH callingAeTitle (scpAETitle) AND calledAeTitle (scuAETitle)
        // This handles cases where multiple Sites share the same Calling AE (e.g., Worklist_SCP)
        // but target different server identities (e.g., NIVA09 vs ArmorRay09)
        logger.info(`[PACS Routing] Looking up Site with scpAETitle: "${trimmedAeTitle}", calledAeTitle: "${trimmedCalledAe}" (source IP: ${sourceIP || 'unknown'})`);
        const escapedAeTitle = trimmedAeTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let matchedSite = null;

        // Stage 1a: Precise match — both Calling AE + Called AE
        if (trimmedCalledAe) {
            const escapedCalledAe = trimmedCalledAe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            matchedSite = await Site.findOne({
                scpAETitle: { $regex: new RegExp(`^${escapedAeTitle}$`, 'i') },
                scuAETitle: { $regex: new RegExp(`^${escapedCalledAe}$`, 'i') }
            })
                .populate('assignedTechnician')
                .populate('createdBy');
            if (matchedSite) {
                logger.info(`[PACS Routing] \u2705 Precise match (Calling+Called): Site "${matchedSite.name}"`);
            }
        }

        // Stage 1b: Fallback — Calling AE only (single-site setups)
        if (!matchedSite) {
            matchedSite = await Site.findOne({ scpAETitle: { $regex: new RegExp(`^${escapedAeTitle}$`, 'i') } })
                .populate('assignedTechnician')
                .populate('createdBy');
        }

        // Stage 2: IP fallback if AE Title didn't match
        if (!matchedSite && sourceIP) {
            logger.info(`[PACS Routing] AE Title "${trimmedAeTitle}" not found. Trying IP fallback: ${sourceIP}`);
            matchedSite = await Site.findOne({ scpIP: sourceIP })
                .populate('assignedTechnician')
                .populate('createdBy');
            if (matchedSite) {
                logger.info(`[PACS Routing] ✅ Matched by IP: ${sourceIP} → Site: ${matchedSite.name}`);
            }
        }

        if (matchedSite) {
            // Priority: explicit assignment → creator → admin
            const resolvedTech =
                matchedSite.assignedTechnician ||   // explicitly assigned
                matchedSite.createdBy ||            // whoever set up this AE title
                systemAdmin;                         // last resort

            attributedTechnician = resolvedTech;

            logger.info(
                `[PACS Routing] ✅ Resolved via: ${matchedSite.assignedTechnician ? 'assignedTechnician' :
                    matchedSite.createdBy ? 'createdBy' : 'admin fallback'
                } → ${attributedTechnician.name || attributedTechnician._id}`
            );
        } else {
            logger.warn(`[PACS Routing] ⚠️ UNKNOWN SOURCE — AE: "${trimmedAeTitle}", IP: ${sourceIP}. Defaulting to admin.`);

            // Notify admins via Socket.IO
            try {
                const io = getIO();
                if (io) {
                    io.to('admin_room').emit('pacs:unknownSource', {
                        callingAeTitle: trimmedAeTitle,
                        sourceIP,
                        studyInstanceUID,
                        timestamp: new Date().toISOString(),
                        message: `Unknown PACS source connected. AE Title: "${trimmedAeTitle}", IP: ${sourceIP}. Study was attributed to admin.`,
                    });
                }
            } catch (notifyErr) {
                logger.error(`[PACS Routing] Failed to send admin notification: ${notifyErr.message}`);
            }
        }
    } else {
        logger.warn(`[PACS Routing] ⚠️ callingAeTitle is empty — falling back to admin`);
    }

    // Step 3: Patient Resolution
    let patient = await Patient.findOne({ patientId: metadata.patientId });
    if (patient) {
        patient.name = metadata.patientName || patient.name;
        patient.age = metadata.patientAge || patient.age;
        patient.gender = metadata.patientGender || patient.gender;
        await patient.save();
    } else {
        patient = await Patient.create({
            patientId: metadata.patientId,
            name: metadata.patientName || 'ANONYMOUS',
            age: metadata.patientAge || 0,
            gender: metadata.patientGender || 'O',
            uploadedBy: attributedTechnician._id,
        });
    }

    // Step 4: Move Files to Permanent Storage
    const finalStudyDir = path.join(process.cwd(), 'uploads', 'cases', studyInstanceUID);
    const finalDicomDir = path.join(finalStudyDir, 'dicom');
    await fs.promises.mkdir(finalDicomDir, { recursive: true });

    const savedDicomFiles = [];
    const CONCURRENCY = 10;

    const processFile = async (fileName, index) => {
        const srcPath = path.join(directory, fileName);
        const safeFileName = `${index}_${fileName}`;
        const destPath = path.join(finalDicomDir, safeFileName);

        const buffer = await fs.promises.readFile(srcPath);
        let fileMeta = extractDicomMetadata(buffer);

        await fs.promises.rename(srcPath, destPath);

        savedDicomFiles[index] = fileMeta ? {
            name: fileName,
            path: `/uploads/cases/${studyInstanceUID}/dicom/${safeFileName}`,
            size: buffer.length,
            ...fileMeta
        } : {
            name: fileName,
            path: `/uploads/cases/${studyInstanceUID}/dicom/${safeFileName}`,
            size: buffer.length,
            sopInstanceUID: `FALLBACK_${Date.now()}_${index}`,
            seriesInstanceUID: metadata.seriesInstanceUID || `FALLBACK_SERIES`,
            instanceNumber: index + 1
        };
    };

    for (let i = 0; i < dicomFiles.length; i += CONCURRENCY) {
        const chunk = dicomFiles.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map((f, j) => processFile(f, i + j)));
    }

    // Cleanup temporary incoming directory
    try {
        fs.rmSync(directory, { recursive: true, force: true });
    } catch (e) {
        logger.error(`PACS Cleanup Error: Failed to remove directory: ${directory}`);
    }

    // Step 5: Mirror to Orthanc
    try {
        logger.info(`PACS Ingestion: Syncing study ${studyInstanceUID} to Orthanc`);
        await orthancSyncService.syncStudy(finalStudyDir);
    } catch (orthancErr) {
        logger.error(`PACS Orthanc Sync Error: ${orthancErr.message}`);
    }

    // attributedTechnician and systemAdmin already resolved in Step 2.5 above

    let newCase;

    // Step 6: Create or Update the Case Document
    if (existingCase) {
        // We found a placeholder case created by the UI wizard!
        existingCase.dicomFiles = savedDicomFiles;
        // Preserve existing source — if the tech manually initiated a C-MOVE it stays PACS_IMPORT.
        // Only fall back to PACS_PUSH if for some reason source was never set.
        existingCase.source = existingCase.source || 'PACS_PUSH';

        // Use user-requested null-safe fallback
        existingCase.uploadedBy = existingCase.uploadedBy || attributedTechnician._id;

        // Attribution: Use the technician who started the move, or fallback to attributed
        const attributionUser = existingCase.uploadedBy || attributedTechnician;

        existingCase.addTimelineEntry(
            'PACS Download Complete',
            attributionUser,
            `Successfully downloaded ${savedDicomFiles.length} files from PACS.`,
            { dicomCount: savedDicomFiles.length, importMode: 'DIMSE' }
        );
        await existingCase.save();
        newCase = existingCase;
    } else {
        // Create new external push Case (attributing to scoped technician or admin)
        newCase = await Case.create({
            uploadedBy: attributedTechnician._id,
            patient: patient._id.toString(),
            studyInstanceUID: studyInstanceUID,
            studyDirectory: finalStudyDir,
            patientName: patient.name,
            patientId: patient.patientId,
            age: patient.age,
            gender: patient.gender,
            accessionNumber: metadata.accessionNumber || '',
            institution: metadata.institution || '',
            modality: metadata.modality || 'UNKNOWN',
            bodyPart: metadata.studyDescription || metadata.bodyPart || 'UNKNOWN',
            urgency: 'Routine',
            isEmergency: false,
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: 'Uploaded',
            source: 'PACS_PUSH',
            dicomFiles: savedDicomFiles,
            attachments: []
        });

        // Add timeline entry
        newCase.addTimelineEntry(
            'Case Ingested via PACS',
            attributedTechnician,
            `${metadata.modality || 'DICOM'} study imported from remote PACS with ${savedDicomFiles.length} files. (Automatic/Direct Push)`,
            { dicomCount: savedDicomFiles.length, importMode: 'DIMSE' }
        );
        await newCase.save();
    }

    // Step 7: Background Tasks & Notifications
    StudyIntegrityService.runValidation(newCase._id).catch(err => {
        logger.error(`[PACS Integrity Trigger Error] ${err.message}`);
    });

    logAudit({
        category: AUDIT_CATEGORIES.CASE_WORKFLOW,
        action: 'Case Ingested from PACS',
        resourceType: 'Case',
        resourceId: newCase._id,
        user: systemAdmin,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Study ${studyInstanceUID} fully downloaded via DIMSE C-MOVE`,
        metadata: {
            studyInstanceUID,
            dicomCount: savedDicomFiles.length
        }
    });

    clearCache(`cache:*:*`).catch(err => logger.error(`Cache clear error: ${err.message}`));

    const io = getIO();
    if (io) {
        io.emit('study:ingested', {
            studyInstanceUID,
            caseId: newCase._id,
            patientName: newCase.patientName
        });
    }
};

/**
 * @desc    Callback called internally (or by SCP) when a study is fully received
 * @route   POST /api/pacs/callback
 * @access  Internal
 */
export const pacsCallback = asyncHandler(async (req, res) => {
    const { studyInstanceUID, fileCount, directory } = req.body;
    await processPacsStudy(studyInstanceUID, fileCount, directory);
    return sendSuccess(res, HTTP_STATUS.CREATED, "PACS Study fully ingested and processed");
});
// ─── POST /api/pacs/export ────────────────────────────────────────────────────

/**
 * @desc    Export DICOM files to a remote PACS server
 * @route   POST /api/pacs/export
 * @access  Private (Technician/Admin)
 *
 * Sequence:
 * 1. Parse StudyInstanceUID from first DICOM file
 * 2. Check Orthanc POST /tools/find for existing study
 * 3. Upload files to Orthanc via POST /instances (if not found in step 2)
 * 4. Dynamically register modality: PUT /modalities/{siteId}
 * 5. Trigger push: POST /modalities/{siteId}/store
 * 6. Poll GET /jobs/{jobId} until Success/Failure
 * 7. Cleanup via DELETE /modalities/{siteId}
 */
export const exportToPACS = asyncHandler(async (req, res) => {
    const { siteId, studyInstanceUID: existingStudyUID } = req.body;
    const files = req.files;

    if (!siteId) throw new AppError("siteId is required", HTTP_STATUS.BAD_REQUEST);
    if ((!files || files.length === 0) && !existingStudyUID) {
        throw new AppError("No files uploaded and no existing study selected", HTTP_STATUS.BAD_REQUEST);
    }

    const site = await Site.findOne({ siteId, isActive: true });
    if (!site) throw new AppError("Site not found or inactive", HTTP_STATUS.NOT_FOUND);
    if (!site.scpAETitle || !site.scpIP || !site.scpPort) {
        throw new AppError("Site is missing DICOM configuration (scpAETitle, scpIP, scpPort)", HTTP_STATUS.BAD_REQUEST);
    }

    let studyInstanceUID = existingStudyUID;

    // Phase 1: Parse StudyInstanceUID from uploaded DICOM files (only if not provided)
    if (!studyInstanceUID) {
        try {
            // Search through uploaded files for the first valid DICOM to identify the study
            for (const file of files) {
                const buffer = fs.readFileSync(file.path);
                const metadata = extractDicomMetadata(buffer);
                if (metadata && metadata.studyInstanceUID) {
                    studyInstanceUID = metadata.studyInstanceUID;
                    logger.info(`[PACS Export] Identified study from ${file.originalname}: ${studyInstanceUID}`);
                    break;
                }
            }

            if (!studyInstanceUID) {
                throw new Error("Could not find a valid DICOM file with a StudyInstanceUID in the uploaded set.");
            }
        } catch (e) {
            logger.error(`[PACS Export] Metadata identification failed: ${e.message}`);
            throw new AppError(e.message, HTTP_STATUS.UNPROCESSABLE_ENTITY);
        }
    }

    logger.info(`[PACS Export] Initiating export. Site: ${siteId}, StudyUID: ${studyInstanceUID}, Files: ${files.length}`);

    let studyDicomDir = "";
    let totalFilesCount = 0;

    if (files && files.length > 0) {
        // If files were uploaded dynamically, pass the containing directory (must be absolute)
        studyDicomDir = path.resolve(path.dirname(files[0].path));
        totalFilesCount = files.length;
    } else {
        studyDicomDir = path.join(process.cwd(), 'uploads', 'cases', studyInstanceUID, 'dicom');
        if (!fs.existsSync(studyDicomDir)) {
            throw new AppError("Study files not found on server for re-ingestion", HTTP_STATUS.NOT_FOUND);
        }
        totalFilesCount = fs.readdirSync(studyDicomDir).filter(f => f.endsWith('.dcm')).length;
    }

    if (totalFilesCount === 0) {
        throw new AppError("No files found to export", HTTP_STATUS.BAD_REQUEST);
    }

    // Immediately return accepted
    sendSuccess(res, HTTP_STATUS.ACCEPTED, "PACS Export started", { studyInstanceUID, totalFiles: totalFilesCount });

    // Execute export in background
    (async () => {
        try {
            logger.info(`[PACS Export] Site object: ${JSON.stringify({
                scuAETitle: site.scuAETitle,
                scuIP: site.scuIP,
                scuPort: site.scuPort,
                scpAETitle: site.scpAETitle,
                scpIP: site.scpIP,
                scpPort: site.scpPort
            })}`);
            logger.info(`[PACS Export] sourcePath: ${studyDicomDir}, files in dir: ${fs.readdirSync(studyDicomDir).length}`);

            // Mark export as active using Unified Task Manager
            const taskId = `EX_${studyInstanceUID}`;
            taskManager.startTask(taskId, 'PACS_EXPORT', totalFilesCount, {
                studyInstanceUID,
                siteId,
                patientName: "Exporting Study"
            }, "Transmitting DICOM files...", req.user?._id?.toString() || null);

            const result = await cStore(site, studyDicomDir, {
                onProgress: (transmitted, total) => {
                    // Update global task manager
                    taskManager.updateTask(taskId, transmitted, total, `Transmitting: ${transmitted} / ${total} files`);
                }
            });

            if (result.failedFiles.length === 0) {
                logger.info(`[PACS Export] Successfully exported ${result.successCount} files for ${studyInstanceUID}`);
                taskManager.completeTask(taskId, "Export Complete");
            } else {
                const errorMsg = `${result.failedFiles.length} files failed to transmit after all retries.`;
                logger.error(`[PACS Export] Failed export for ${studyInstanceUID}: ${errorMsg}`);
                taskManager.failTask(taskId, "Export Failed", { failedFiles: result.failedFiles.slice(0, 10).map(f => path.basename(f)) });
            }
        } catch (globalError) {
            logger.error(`[PACS Export] Background task failed: ${globalError.message}`);
            taskManager.failTask(`EX_${studyInstanceUID}`, "Background export failed: " + globalError.message);
        } finally {
            // Cleanup local temp directories if they exist
            try {
                if (files && files.length > 0 && files[0].destination) {
                    fs.rmSync(files[0].destination, { recursive: true, force: true });
                    logger.info(`[PACS Export] Cleaned up temporary upload directory: ${files[0].destination}`);
                }
            } catch (cleanupErr) {
                logger.error(`[PACS Export] Temp cleanup failed: ${cleanupErr.message}`);
            }
        }
    })();
});

// ─── GET /api/pacs/received ───────────────────────────────────────────────────

/**
 * @desc    Get all cases that arrived via direct PACS push (source = PACS_PUSH)
 * @route   GET /api/pacs/received
 * @access  Private (Technician/Admin)
 *
 * Returns full Case documents so the "Enrich & Submit" action can pass them
 * directly to the existing edit modal without missing fields.
 */
export const getPacsReceived = asyncHandler(async (req, res) => {
    const filter = { source: 'PACS_PUSH' };
    if (req.user.role === 'technician') {
        filter.uploadedBy = req.user._id;
    }

    const cases = await Case.find(filter)
        .populate('uploadedBy', 'name')
        .populate('assignedRadiologist', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    sendSuccess(res, HTTP_STATUS.OK, `${cases.length} PACS-received case(s) found`, cases);
});

// ─── GET /api/pacs/scp-status ─────────────────────────────────────────────────

/**
 * @desc    Return DICOM SCP listener status and live incoming transmissions
 * @route   GET /api/pacs/scp-status
 * @access  Private (Technician/Admin)
 */
export const getScpStatus = asyncHandler(async (req, res) => {
    let activeStudies = [];
    try {
        // Dynamic import to avoid circular module dependency:
        // dicomSCP.js already imports processPacsStudy from pacsController.js.
        // A static import the other way would create a circular dep at load time.
        const { getActiveStudies } = await import('../config/dicomSCP.js');

        // If technician, only show studies from their assigned AE titles
        if (req.user.role === 'technician') {
            const Site = (await import('../models/Site.js')).default;
            const sites = await Site.find({
                $or: [
                    { assignedTechnician: req.user._id },
                    { createdBy: req.user._id }
                ]
            }).select('scpAETitle');
            const allowedAeTitles = sites
                .map(s => s.scpAETitle?.trim())
                .filter(Boolean);
            activeStudies = getActiveStudies(allowedAeTitles);
        } else {
            activeStudies = getActiveStudies();
        }
    } catch (e) {
        logger.warn(`[SCP Status] Could not read active studies: ${e.message}`);
    }

    sendSuccess(res, HTTP_STATUS.OK, 'SCP listener status', {
        isRunning: true,
        port: process.env.DICOM_SCU_PORT || '4243',
        activeStudies,
    });
});
