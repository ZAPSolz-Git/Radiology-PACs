import fs from "fs";
import path from "path";
import Case from "../models/Case.js";
import Patient from "../models/Patient.js";
import Comment from "../models/Comment.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import ApiKey from "../models/ApiKey.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../config/logger.js";
import { extractDicomMetadata } from "../utils/dicomHelper.js";
import StudyIntegrityService from "../services/StudyIntegrityService.js";
import { orthancSyncService } from "../services/OrthancSyncService.js";
import { getIO } from "../utils/socketSetup.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";
import { clearCache } from "../middleware/cacheMiddleware.js";
/**
 * @desc    Upload a new Case (Files + Metadata)
 * @route   POST /api/cases/upload
 * @access  Private (Technician only)
 */
export const uploadCase = asyncHandler(async (req, res) => {
    // req.files is now an object: { files: [...], attachments: [...] }
    const dicomFiles = req.files['files'] || [];
    const imageFiles = req.files['images'] || [];
    const attachmentFiles = req.files['attachments'] || [];

    try {

        console.log("[Upload Debug] Request Body:", JSON.stringify(req.body, null, 2));
        console.log("[Upload Debug] Request Files:", Object.keys(req.files || {}));

        // [HOTFIX] Try headers/query if body is not yet parsed or missing for some reason
        const uploadMode = req.body.uploadMode || req.query.uploadMode || req.headers['x-upload-mode'] || 'folder';

        if (dicomFiles.length === 0 && imageFiles.length === 0 && uploadMode !== 'pacs') {
            logger.error(`Upload failed: No files and mode is ${uploadMode}`);
            throw new AppError("No DICOM or image files uploaded", HTTP_STATUS.BAD_REQUEST);
        }

        const {
            patientName, patientId, age, gender, accessionNumber, institution,
            clinicalHistory, referringDoctor, indication,
            modality, bodyPart, studyInstanceUID, contrast, urgency,
            checklist, isEmergency
        } = req.body;

        // 0. Check if Case already exists for this study (For Multi-batch Append)
        let existingCase = null;
        if (studyInstanceUID && studyInstanceUID !== "undefined" && studyInstanceUID !== "null") {
            existingCase = await Case.findOne({ studyInstanceUID });
        }

        // 0.1 Ensure Patient record exists (Create or Update snapshot)
        // ONLY required if this is a NEW case
        let patient = null;
        if (!existingCase) {
            if (!patientId || !patientId.trim()) {
                throw new AppError("Patient ID is missing in request body.", HTTP_STATUS.BAD_REQUEST);
            }
            patient = await Patient.findOne({ patientId });
            if (!patient) {
                patient = await Patient.create({
                    patientId,
                    name: patientName,
                    age: Number(age),
                    gender,
                    uploadedBy: req.user._id
                });
            } else {
                // Update demographics if they changed
                patient.name = patientName;
                patient.age = Number(age);
                patient.gender = gender;
                await patient.save();
            }
        } else {
            // For appending, we use the patient already linked to the existing case
            patient = await Patient.findById(existingCase.patient);
        }

        console.log("[Upload Debug] Resolved Patient:", patient ? `ID=${patient._id} Name=${patient.name}` : "NULL");

        // 1. Save Files Locally
        let finalStudyInstanceUID;

        // Strict validation to prevent "undefined" or "null" folders
        if (studyInstanceUID &&
            studyInstanceUID !== "undefined" &&
            studyInstanceUID !== "null" &&
            studyInstanceUID.trim() !== "") {
            finalStudyInstanceUID = studyInstanceUID;
        } else {
            finalStudyInstanceUID = `1.2.826.0.1.3680043.8.498.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
        }

        console.log(`[Upload Debug] Resolved StudyInstanceUID: '${finalStudyInstanceUID}' (Original: '${studyInstanceUID}')`);

        console.log(`[Upload] Saving ${dicomFiles.length} DICOMs and ${imageFiles.length} Images locally for Study: ${finalStudyInstanceUID}`);

        const studyDir = path.join("uploads", "cases", finalStudyInstanceUID);
        const dicomDir = path.join(studyDir, "dicom");
        const imagesDir = path.join(studyDir, "images");
        const attachmentsDir = path.join(studyDir, "attachments");

        // Ensure directories exist
        fs.mkdirSync(dicomDir, { recursive: true });
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.mkdirSync(attachmentsDir, { recursive: true });

        const savedDicomFiles = [];
        const CONCURRENCY = 5;
        const batchId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        const processFile = async (file, index) => {
            const safeFileName = `${batchId}_${index}_${file.originalname}`;
            const destPath = path.join(dicomDir, safeFileName);

            // STEP 1: Read the buffer FIRST while the file is still in its temp location.
            // This MUST complete before we move/rename the file.
            let buffer = await fs.promises.readFile(file.path);

            // STEP 2: Move the file to its final destination.
            // Use try/catch because rename() fails across different filesystems/mount points (common in Docker).
            try {
                await fs.promises.rename(file.path, destPath);
            } catch (renameErr) {
                // Fallback: copy + delete (works across filesystems)
                await fs.promises.copyFile(file.path, destPath);
                await fs.promises.unlink(file.path).catch(() => { }); // Best-effort cleanup
            }

            // STEP 3: Extract metadata from the already-captured buffer
            const metadata = extractDicomMetadata(buffer);

            // Release buffer from memory BEFORE network request to avoid OOM
            buffer = null;

            // STEP 4: Upload to Orthanc (Stream from disk to prevent OOM)
            try {
                await orthancSyncService.uploadStream(destPath, file.originalname);
            } catch (orthancErr) {
                logger.warn(`[Upload] Orthanc upload failed for ${file.originalname}: ${orthancErr.message}. File saved locally.`);
            }

            savedDicomFiles.push(metadata ? {
                name: file.originalname,
                path: `/uploads/cases/${finalStudyInstanceUID}/dicom/${safeFileName}`,
                size: file.size,
                ...metadata
            } : {
                name: file.originalname,
                path: `/uploads/cases/${finalStudyInstanceUID}/dicom/${safeFileName}`,
                size: file.size,
                sopInstanceUID: `1.2.826.0.1.3680043.8.498.${Date.now()}.1.${index}`,
                seriesInstanceUID: `1.2.826.0.1.3680043.8.498.${Date.now()}.2`,
                instanceNumber: index + 1
            });
        };

        // Process in chunks to avoid overwhelming disk + Orthanc
        for (let i = 0; i < dicomFiles.length; i += CONCURRENCY) {
            const chunk = dicomFiles.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map((file, j) => processFile(file, i + j)));
            console.log(`[Upload Progress] Processed ${Math.min(i + CONCURRENCY, dicomFiles.length)}/${dicomFiles.length} files...`);
        }

        console.log(`[Upload] All ${dicomFiles.length} DICOM files saved and streamed to Orthanc.`);

        // 1.5 Process Image Files (JPG/PNG)
        // Find Orthanc Study ID first if possible
        const orthancStudyId = await orthancSyncService.getStudyIdByUID(finalStudyInstanceUID);

        const patientTags = {
            patientName,
            patientId,
            studyDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
            patientSex: gender,
            studyInstanceUID: finalStudyInstanceUID
        };

        const savedImageAttachments = await Promise.all(imageFiles.map(async (file, index) => {
            const fileName = `${Date.now()}-${index}-${file.originalname}`;
            const destPath = path.join(imagesDir, fileName);

            // Move to final destination
            await fs.promises.rename(file.path, destPath);

            // Dicomize and upload to Orthanc
            try {
                const orthancInstanceId = await orthancSyncService.dicomizeImage(destPath, patientTags, orthancStudyId);

                // Fetch the resulting DICOM back from Orthanc to store it locally in the /dicom/ folder
                // This ensures OHIF and other system components can see it as a native DICOM
                if (orthancInstanceId) {
                    const dicomBuffer = await orthancSyncService.getInstanceFile(orthancInstanceId);
                    const dicomFileName = `clinical_${Date.now()}_${index}.dcm`;
                    const dicomPath = path.join(dicomDir, dicomFileName);

                    await fs.promises.writeFile(dicomPath, dicomBuffer);

                    const dicomMetadata = extractDicomMetadata(dicomBuffer);

                    // Add to savedDicomFiles so it's included in the Case record
                    savedDicomFiles.push(dicomMetadata ? {
                        name: dicomFileName,
                        path: `/uploads/cases/${finalStudyInstanceUID}/dicom/${dicomFileName}`,
                        size: dicomBuffer.length,
                        ...dicomMetadata
                    } : {
                        name: dicomFileName,
                        path: `/uploads/cases/${finalStudyInstanceUID}/dicom/${dicomFileName}`,
                        size: dicomBuffer.length,
                        sopInstanceUID: `1.2.826.0.1.3680043.8.498.99.${Date.now()}.${index}`,
                        seriesInstanceUID: `1.2.826.0.1.3680043.8.498.99.${Date.now()}.1`,
                        instanceNumber: index + 1,
                        modality: 'SC'
                    });
                }
            } catch (err) {
                logger.warn(`[Upload] Failed to dicomize image ${file.originalname}: ${err.message}`);
            }

            return {
                name: file.originalname,
                url: `/uploads/cases/${finalStudyInstanceUID}/images/${fileName}`,
                path: `/uploads/cases/${finalStudyInstanceUID}/images/${fileName}`,
                fileType: file.mimetype,
                category: 'ClinicalImage',
                uploadedAt: new Date()
            };
        }));

        // 2. Process Standard Attachments in Parallel
        const savedStandardAttachments = await Promise.all(attachmentFiles.map(async (file) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            const filePath = path.join(attachmentsDir, fileName);

            // Move the file from temp to final destination
            await fs.promises.rename(file.path, filePath);

            return {
                name: file.originalname,
                url: `/uploads/cases/${finalStudyInstanceUID}/attachments/${fileName}`,
                path: `/uploads/cases/${finalStudyInstanceUID}/attachments/${fileName}`,
                fileType: file.mimetype,
                category: file.mimetype === 'application/pdf' ? 'OldReport' : 'OldImage',
                uploadedAt: new Date()
            };
        }));

        const savedAttachments = [...savedImageAttachments, ...savedStandardAttachments];

        const now = new Date();
        let deadline = new Date(now);
        if (urgency === 'STAT') {
            deadline.setHours(deadline.getHours() + 1);
        } else {
            deadline.setHours(deadline.getHours() + 24);
        }

        // 4. Update Existing Case OR Create New Case
        if (existingCase) {
            console.log(`[Upload] Appending ${savedDicomFiles.length} files to existing StudyUID: ${finalStudyInstanceUID}`);

            // Use atomic $push to avoid race conditions with concurrent batch uploads
            const updateOps = {
                $push: {
                    dicomFiles: { $each: savedDicomFiles },
                },
                $set: { status: 'Uploaded' }
            };

            if (savedAttachments.length > 0) {
                updateOps.$push.attachments = { $each: savedAttachments };
            }

            const updatedCase = await Case.findByIdAndUpdate(
                existingCase._id,
                updateOps,
                { new: true }
            );

            console.log(`[Upload] Append complete. Total DICOM files now: ${updatedCase.dicomFiles.length}`);
            return sendSuccess(res, HTTP_STATUS.OK, "Files appended successfully", updatedCase);
        }

        // 5. Create New Case in MongoDB
        console.log("[Upload Debug] Attempting to create Case...");
        console.log(`[Upload Debug] Patient ID Ref: ${patient ? patient._id : 'UNDEFINED'}`);
        console.log(`[Upload Debug] Study Instance UID: ${finalStudyInstanceUID}`);

        if (!patient || !patient._id) {
            console.error("[CRITICAL] Patient object is invalid right before Case creation!", patient);
            // CLEANUP: If patient check fails (theoretical), clean up files
            try {
                console.log(`[Cleanup] Removing orphaned study directory: ${studyDir}`);
                fs.rmSync(studyDir, { recursive: true, force: true });
            } catch (e) {
                console.error("[Cleanup Error] Failed to remove directory:", e);
            }
            throw new AppError("Internal Error: Patient linkage failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }

        const newCase = await Case.create({
            uploadedBy: req.user._id,
            patient: patient._id.toString(), // Force string representation
            studyInstanceUID: finalStudyInstanceUID,
            studyDirectory: studyDir,
            patientName, patientId, age: Number(age), gender,
            accessionNumber, institution,
            clinicalHistory, referringDoctor, indication,
            modality, bodyPart,
            contrast: contrast ? JSON.parse(contrast) : undefined,
            urgency: urgency || 'Routine',
            isEmergency: isEmergency === 'true' || isEmergency === true,
            deadline: deadline,
            checklist: checklist ? JSON.parse(checklist) : undefined,
            status: 'Uploaded',
            dicomFiles: savedDicomFiles,
            attachments: savedAttachments,
            orthancStudyId: orthancStudyId // Save internal ID if found
        });


        // Add timeline entry for case upload
        newCase.addTimelineEntry(
            'Case Uploaded',
            req.user,
            `${modality} study uploaded with ${savedDicomFiles.length} DICOM files`,
            {
                modality,
                bodyPart,
                dicomCount: savedDicomFiles.length,
                attachmentCount: savedAttachments.length,
                urgency
            }
        );
        await newCase.save();

        // 5.1 Run Automated Integrity Check (Phase 1)
        // We run this asynchronously so it doesn't block the upload response
        StudyIntegrityService.runValidation(newCase._id).catch(err => {
            logger.error(`[Integrity Trigger Error] ${err.message}`);
        });

        // 5.2 Mirror to Orthanc (Now handled via Streaming Proxy above)
        // Legacy syncStudy call removed to prevent redundant work

        // 6. Emergency Notification (Mock WhatsApp/Email)
        if (newCase.isEmergency) {
            console.log(`[ALERT] EMERGENCY CASE CREATED: ${newCase.patientName} (MRN: ${newCase.patientId})`);
            console.log(`[WHATSAPP] Sending priority notification to QA Team and Radiologist pool...`);
        } else {
            console.log(`[NOTIFY] New case uploaded: ${newCase.patientName}`);
            console.log(`[WHATSAPP] Sending notification to Quality Team...`);
        }

        // Log Audit
        logAudit({
            category: AUDIT_CATEGORIES.CASE_WORKFLOW,
            action: 'Case Uploaded',
            resourceType: 'Case',
            resourceId: newCase._id,
            req,
            status: AUDIT_STATUS.SUCCESS,
            severity: AUDIT_SEVERITY.LOW,
            details: `New ${modality} case uploaded for patient ${patientName} (${patientId})`,
            metadata: {
                modality,
                urgency,
                isEmergency: newCase.isEmergency,
                dicomCount: savedDicomFiles.length
            }
        });

        // Clear cache for cases list and metadata
        clearCache(`cache:*:*`).catch(err => logger.error(`Cache clear error: ${err.message}`));

        const io = getIO();
        io.emit("case_updated", newCase._id);

        return sendSuccess(res, HTTP_STATUS.CREATED, "Case uploaded successfully", newCase);

    } catch (err) {
        console.error("[Upload Error] Processing failed. Cleaning up...");
        throw err;
    } finally {
        // CLEANUP: Always remove the temporary upload directory created by multer.diskStorage
        if (req._tempDir && fs.existsSync(req._tempDir)) {
            try {
                console.log(`[Cleanup] Removing temporary upload directory: ${req._tempDir}`);
                fs.rmSync(req._tempDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error("[Cleanup Error] Failed to delete temp directory:", cleanupErr);
            }
        }
    }
});


// ... (Rest of the controller remains the same: getCases, assignCase, comments)
export const getCases = asyncHandler(async (req, res) => {
    const { status, search, modality, dateRange, studyInstanceUID } = req.query;
    const query = {};

    if (studyInstanceUID) query.studyInstanceUID = studyInstanceUID;

    // 🔒 ROLE-BASED ACCESS CONTROL: Technicians can only see cases they uploaded
    if (req.user.role === 'technician') {
        query.uploadedBy = req.user._id;
    }
    // QA, Radiologists, and Admins can see ALL cases

    if (status && status !== 'All') query.status = status;
    if (modality && modality !== 'All') query.modality = modality;

    if (dateRange && dateRange !== 'All') {
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));

        if (dateRange === 'Today') {
            query.createdAt = { $gte: startOfToday };
        } else if (dateRange === 'Yesterday') {
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            query.createdAt = {
                $gte: yesterday,
                $lt: startOfToday
            };
        } else if (dateRange === 'Week') {
            const weekAgo = new Date(startOfToday);
            weekAgo.setDate(weekAgo.getDate() - 7);
            query.createdAt = { $gte: weekAgo };
        }
    }

    if (search) {
        query.$or = [
            { patientName: { $regex: search, $options: 'i' } },
            { patientId: { $regex: search, $options: 'i' } }
        ];
    }

    const cases = await Case.find(query)
        .populate('uploadedBy', 'name email')
        .populate('assignedRadiologist', 'name email')
        .sort({ urgency: -1, createdAt: -1 });

    return sendSuccess(res, HTTP_STATUS.OK, "Cases retrieved successfully", cases);
});

/**
 * @desc    Submit a case to QA (Technician Hand-off)
 * @route   POST /api/cases/:id/submit
 * @access  Private (Technician)
 */
export const submitCase = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (!['Uploaded', 'Draft', 'Rejected'].includes(kase.status)) {
        throw new AppError(`Cannot submit case in ${kase.status} status. Only Uploaded, Draft or Rejected cases can be submitted.`, HTTP_STATUS.BAD_REQUEST);
    }

    // Update status to Pending QA
    kase.status = 'QA_Pending';

    // Add to timeline
    kase.addTimelineEntry(
        'Case Submitted',
        req.user,
        "Case submitted to QA for verification"
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    console.log(`[Submission] Case ${kase._id} submitted to QA by ${req.user.name}`);

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.CASE_WORKFLOW,
        action: 'Case Submitted to QA',
        resourceType: 'Case',
        resourceId: kase._id,
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Case ${kase.patientName} submitted by technician for QA verification`
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Case submitted to QA successfully", kase);
});

/**
 * @desc    Update Case Details (Demographics/History)
 * @route   PUT /api/cases/:id
 * @access  Private (Technician/Admin)
 */
export const updateCase = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    // Allow updates only if not finalized/locked (or if Admin)
    if (kase.status === 'Finalized' && req.user.role !== 'admin') {
        throw new AppError("Cannot edit finalized case", HTTP_STATUS.FORBIDDEN);
    }

    const {
        patientName, age, gender, accessionNumber, institution,
        clinicalHistory, indication,
        modality, bodyPart, urgency,
        checklist
    } = req.body;

    // Handle existing attachments update (allows deletion)
    if (req.body.attachments) {
        try {
            const updatedAttachments = typeof req.body.attachments === 'string'
                ? JSON.parse(req.body.attachments)
                : req.body.attachments;
            kase.attachments = updatedAttachments;
        } catch (e) {
            console.error("Failed to parse attachments JSON in updateCase:", e);
        }
    }

    // Handle new attachments if provided
    if (req.files && req.files['attachments'] && req.files['attachments'].length > 0) {
        const studyDir = path.join("uploads", "cases", kase.studyInstanceUID);
        const attachmentsDir = path.join(studyDir, "attachments");

        // Ensure directory exists
        if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir, { recursive: true });
        }

        const newAttachments = await Promise.all(req.files['attachments'].map(async (file) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            const filePath = path.join(attachmentsDir, fileName);

            // Move from temp to final
            await fs.promises.rename(file.path, filePath);

            return {
                name: file.originalname,
                url: `/uploads/cases/${kase.studyInstanceUID}/attachments/${fileName}`,
                path: `/uploads/cases/${kase.studyInstanceUID}/attachments/${fileName}`,
                fileType: file.mimetype,
                category: file.mimetype === 'application/pdf' ? 'OldReport' : 'OldImage',
                uploadedAt: new Date()
            };
        }));

        // Add to existing attachments
        if (!kase.attachments) kase.attachments = [];
        kase.attachments.push(...newAttachments);
    }

    // Update fields if provided
    if (patientName) kase.patientName = patientName;
    if (age) kase.age = Number(age);
    if (gender) kase.gender = gender;
    if (accessionNumber) kase.accessionNumber = accessionNumber;
    if (institution) kase.institution = institution;
    if (clinicalHistory !== undefined) kase.clinicalHistory = clinicalHistory;
    if (indication) kase.indication = indication;
    if (modality) kase.modality = modality;
    if (bodyPart) kase.bodyPart = bodyPart;
    if (urgency) {
        kase.urgency = urgency;
        // Recalculate deadline if urgency changes
        const now = new Date();
        const deadline = new Date(now);
        if (urgency === 'STAT') {
            deadline.setHours(deadline.getHours() + 1);
        } else {
            deadline.setHours(deadline.getHours() + 24);
        }
        kase.deadline = deadline;
    }

    if (req.body.isEmergency !== undefined) {
        kase.isEmergency = req.body.isEmergency === 'true' || req.body.isEmergency === true;

        // If it's an emergency, force STAT urgency and 1h deadline
        if (kase.isEmergency) {
            kase.urgency = 'STAT';
            const now = new Date();
            const deadline = new Date(now);
            deadline.setHours(deadline.getHours() + 1);
            kase.deadline = deadline;
        }
    }
    if (checklist) {
        let parsedChecklist = checklist;
        if (typeof checklist === 'string') {
            try {
                parsedChecklist = JSON.parse(checklist);
            } catch (e) {
                console.error("Failed to parse checklist JSON:", e);
            }
        }
        kase.checklist = { ...kase.checklist, ...parsedChecklist };
    }

    // Prepare for diff tracking
    const beforeUpdate = kase.toObject();

    // Record edit in timeline
    kase.addTimelineEntry(
        'Case Updated',
        req.user,
        "Case details/attachments updated"
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    // Clear cache for cases list and this specific case metadata
    clearCache(`cache:*:/api/cases*`).catch(err => logger.error(`Cache clear error: ${err.message}`));

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.CASE_WORKFLOW,
        action: 'Update Case Details',
        resourceType: 'Case',
        resourceId: kase._id,
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Updated metadata for case: ${kase.patientName}`,
        diff: {
            before: beforeUpdate,
            after: kase.toObject()
        }
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Case updated successfully", kase);
});

/**
 * @desc    Resolve Case Rejection (Move from Rejected to Assigned)
 * @route   PATCH /api/cases/:id/resolve
 * @access  Private (Technician)
 */
export const resolveRejection = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (!['Rejected', 'Rep_Correction'].includes(kase.status)) {
        throw new AppError(`Cannot resolve case in ${kase.status} status. Only Rejected or Rep_Correction cases can be resolved.`, HTTP_STATUS.BAD_REQUEST);
    }

    if (kase.status === 'Rep_Correction') {
        // If it was rejected by Doctor (Rep_Correction), send it back to Assigned (Doctor)
        kase.status = 'Assigned';
        console.log(`[Resolution] Case ${kase._id} fixed by QA. Returned to Doctor (Assigned).`);
    } else {
        // If it was rejected by QA (Rejected), send it back to QA Queue (QA_Pending)
        kase.status = 'QA_Pending';
        console.log(`[Resolution] Case ${kase._id} fixed by Technician. Returned to QA Queue.`);
    }

    // Add timeline entry
    kase.addTimelineEntry(
        'Case Fixed',
        req.user,
        `${req.user.role === 'qa' ? 'QA' : 'Technician'} resolved the rejection/correction request`
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    return sendSuccess(res, HTTP_STATUS.OK, "Case resolved successfully", kase);
});

export const assignCase = asyncHandler(async (req, res) => {
    const { radiologistId, partnerId } = req.body;
    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    // Case 1: Assign to Radiologist
    if (radiologistId) {
        const doctor = await User.findById(radiologistId);
        if (!doctor || doctor.role !== 'radiologist') {
            throw new AppError("Invalid doctor ID or user is not a radiologist", HTTP_STATUS.BAD_REQUEST);
        }

        // Detect re-assignment: case already had a different doctor
        const previousDoctorId = kase.assignedRadiologist?.toString();
        const isReassignment = !!previousDoctorId && previousDoctorId !== radiologistId.toString();

        kase.assignedRadiologist = radiologistId;
        kase.assignedPartner = null; // Clear any existing partner assignment
        kase.status = 'Assigned';

        if (isReassignment) {
            const prevDoctor = await User.findById(previousDoctorId).select('name').lean();
            kase.addTimelineEntry(
                'Case Re-assigned',
                req.user,
                `QA ${req.user.name} re-assigned this case from Dr. ${prevDoctor?.name || 'Unknown'} to Dr. ${doctor.name}`,
                {
                    previousDoctorId,
                    previousDoctorName: prevDoctor?.name || 'Unknown',
                    newDoctorId: radiologistId,
                    newDoctorName: doctor.name,
                    qaName: req.user.name
                }
            );
        } else {
            kase.addTimelineEntry(
                'Case Assigned',
                req.user,
                `QA ${req.user.name} assigned this case to Dr. ${doctor.name}`,
                {
                    doctorId: radiologistId,
                    doctorName: doctor.name,
                    qaName: req.user.name
                }
            );
        }
    }
    // Case 2: Assign to External Partner
    else if (partnerId) {
        const partner = await ApiKey.findById(partnerId);
        if (!partner || !partner.isActive) {
            throw new AppError("Invalid partner ID or partner is inactive", HTTP_STATUS.BAD_REQUEST);
        }

        // Check required scopes for assignment
        const hasRequiredScopes = ['read:cases', 'write:reports'].every(scope =>
            partner.scopes.includes(scope)
        );
        if (!hasRequiredScopes) {
            throw new AppError("Partner must have 'read:cases' and 'write:reports' scopes to be assigned cases", HTTP_STATUS.FORBIDDEN);
        }

        const isReassignment = !!kase.assignedPartner &&
            kase.assignedPartner.toString() !== partnerId.toString();

        kase.assignedPartner = partnerId;
        kase.assignedRadiologist = null; // Clear any existing radiologist assignment
        kase.status = 'Assigned';

        kase.addTimelineEntry(
            isReassignment ? 'Case Re-assigned to Partner' : 'Case Assigned to Partner',
            req.user,
            `QA ${req.user.name} ${isReassignment ? 're-assigned' : 'assigned'} this case to partner "${partner.partnerName}"`,
            {
                partnerId: partnerId,
                partnerName: partner.partnerName,
                qaName: req.user.name
            }
        );
    }
    else {
        throw new AppError("Either radiologistId or partnerId is required", HTTP_STATUS.BAD_REQUEST);
    }

    await kase.save();

    // Emit real-time update so the timeline refreshes automatically
    const io = getIO();
    if (io) {
        io.emit("case_updated", kase._id);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Case assigned successfully", kase);
});

// Import ApiKey at the top of the file - add this near other imports
// (Need to add the import statement for ApiKey)

export const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { id } = req.params;

    const kase = await Case.findById(id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    const comment = await Comment.create({
        caseId: id,
        userId: req.user._id,
        content: content
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, "Comment added", comment);
});

export const getComments = asyncHandler(async (req, res) => {
    const comments = await Comment.find({ caseId: req.params.id })
        .populate('userId', 'name role')
        .sort({ createdAt: 1 });

    return sendSuccess(res, HTTP_STATUS.OK, "Comments retrieved", comments);
});

/**
 * @desc    Get a single case by ID
 * @route   GET /api/cases/:id
 * @access  Private
 */
export const getCaseById = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id)
        .populate('uploadedBy', 'name email')
        .populate('assignedRadiologist', 'name email')
        .populate('assignedPartner', 'partnerName')
        .populate('patient');

    if (!kase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    console.log(`[getCaseById] Case ${kase._id} - Report Status: ${kase.report?.status}, Has JSON: ${!!kase.report?.jsonContent}, JsonLength: ${kase.report?.jsonContent?.length || 0}`);

    return sendSuccess(res, HTTP_STATUS.OK, "Case retrieved successfully", kase);
});

/**
 * @desc    Delete a Case and all its files
 * @route   DELETE /api/cases/:id
 * @access  Private (Technician/Admin)
 */
export const deleteCase = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id);

    if (!kase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    // 🚨 CRITICAL: Prevent deletion of finalized cases — EXCEPT for admin
    const isAdmin = req.user?.role === 'admin';

    if (kase.status === 'Finalized' && !isAdmin) {
        throw new AppError(
            "Cannot delete finalized cases. Finalized cases contain locked billing data and must be preserved for financial audit compliance.",
            HTTP_STATUS.FORBIDDEN
        );
    }

    // [SECURITY] Prevent technicians from deleting cases already in the reporting workflow
    if (kase.assignedRadiologist && !isAdmin) {
        throw new AppError(
            "Cannot delete a study that has already been assigned to a radiologist. Please contact QA or an Admin to unassign it first.",
            HTTP_STATUS.FORBIDDEN
        );
    }

    // Additional safeguard for non-admin users
    if (kase.billingInfo && kase.billingInfo.total > 0 && !isAdmin) {
        throw new AppError(
            "Cannot delete cases with locked billing information. This case has earnings data that must be preserved.",
            HTTP_STATUS.FORBIDDEN
        );
    }

    // 1. Delete Files from Filesystem
    const localStudyDir = path.join("uploads", "cases", kase.studyInstanceUID);
    try {
        // Ensure we are only deleting inside the uploads folder for safety
        const safePath = path.resolve(localStudyDir);
        if (safePath.includes("uploads")) {
            console.log(`[Delete] Removing directory: ${safePath}`);
            if (fs.existsSync(safePath)) {
                fs.rmSync(safePath, { recursive: true, force: true });
            }
        } else {
            console.error(`[Delete Security Warning] Attempted to delete path outside uploads: ${safePath}`);
        }
    } catch (err) {
        console.error(`[Delete Error] Failed to delete files for case ${kase._id}:`, err);
        // Proceed to delete DB record anyway? Maybe better to warn but usually yes.
    }

    // 2. Cascade Delete: Remove all related records
    const caseIdStr = kase._id.toString();
    const [commentResult, messageResult, notificationResult] = await Promise.all([
        Comment.deleteMany({ caseId: kase._id }),
        Message.deleteMany({ caseId: caseIdStr }),
        Notification.deleteMany({ relatedId: caseIdStr })
    ]);
    console.log(`[Cascade Delete] Case ${caseIdStr}: Comments=${commentResult.deletedCount}, Messages=${messageResult.deletedCount}, Notifications=${notificationResult.deletedCount}`);

    // 3. Delete the Case DB Record
    await kase.deleteOne();

    // Clear cache
    clearCache(`cache:*:/api/cases*`).catch(err => logger.error(`Cache clear error: ${err.message}`));

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.CASE_WORKFLOW,
        action: 'Delete Case',
        resourceType: 'Case',
        resourceId: req.params.id,
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.CRITICAL,
        details: `Permanently deleted case and files for patient: ${kase.patientName}`
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Case and files deleted successfully");
});

/**
 * @desc    Preview the impact of deleting a case (what data will be lost)
 * @route   GET /api/cases/:id/delete-impact
 * @access  Private (admin)
 */
export const getDeleteImpact = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id)
        .select('patientName patientId modality studyDate status studyInstanceUID studyDirectory dicomFiles attachments billingInfo report timeline')
        .lean();

    if (!kase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    const caseIdStr = kase._id.toString();
    const uploadsDir = path.resolve('uploads', 'cases');

    // Count all related records
    const [commentCount, messageCount, notificationCount] = await Promise.all([
        Comment.countDocuments({ caseId: kase._id }),
        Message.countDocuments({ caseId: caseIdStr }),
        Notification.countDocuments({ relatedId: caseIdStr })
    ]);

    // Calculate disk usage
    const caseDir = path.join(uploadsDir, kase.studyInstanceUID);
    let diskUsage = 0;
    try {
        if (fs.existsSync(path.resolve(caseDir))) {
            const getDirSize = (dir) => {
                let size = 0;
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const full = path.join(dir, entry.name);
                        if (entry.isDirectory()) size += getDirSize(full);
                        else try { size += fs.statSync(full).size; } catch { }
                    }
                } catch { }
                return size;
            };
            diskUsage = getDirSize(path.resolve(caseDir));
        }
    } catch { }

    // Build impact summary
    const impact = {
        case: {
            patientName: kase.patientName,
            patientId: kase.patientId,
            modality: kase.modality,
            studyDate: kase.studyDate,
            status: kase.status
        },
        files: {
            dicomFiles: kase.dicomFiles?.length || 0,
            attachments: kase.attachments?.length || 0,
            diskUsage
        },
        relatedRecords: {
            comments: commentCount,
            messages: messageCount,
            notifications: notificationCount,
            timelineEntries: kase.timeline?.length || 0
        },
        billing: kase.billingInfo && kase.billingInfo.total > 0 ? {
            total: kase.billingInfo.total,
            basePrice: kase.billingInfo.basePrice,
            radiologistEarning: kase.billingInfo.radiologistEarning,
            invoiceId: kase.billingInfo.invoiceId || null,
            payoutId: kase.billingInfo.payoutId || null,
            tariffId: kase.billingInfo.tariffId || null
        } : null,
        report: kase.report && kase.report.status ? {
            status: kase.report.status,
            version: kase.report.version,
            hasDocx: !!kase.report.docxUrl,
            submittedAt: kase.report.submittedAt,
            finalizedAt: kase.report.finalizedAt
        } : null,
        isFinalized: kase.status === 'Finalized',
        hasBilling: !!(kase.billingInfo && kase.billingInfo.total > 0)
    };

    return sendSuccess(res, HTTP_STATUS.OK, "Delete impact preview", impact);
});

/**
 * @desc    Export a case as a ZIP archive (streams to client)
 * @route   GET /api/cases/:id/export
 * @access  Private (admin)
 */
import archiver from 'archiver';
import User from "../models/User.js";

export const exportCaseZip = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id).select('patientName studyInstanceUID studyDirectory modality').lean();
    if (!kase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    const studyDir = path.join('uploads', 'cases', kase.studyInstanceUID);
    const safePath = path.resolve(studyDir);

    if (!safePath.includes('uploads') || !fs.existsSync(safePath)) {
        throw new AppError("Case files not found on disk", HTTP_STATUS.NOT_FOUND);
    }

    // Build a safe filename
    const safeName = kase.patientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const zipFilename = `${safeName}_${kase.modality}_${kase.studyInstanceUID.substring(0, 8)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', { zlib: { level: 5 } });

    archive.on('error', (err) => {
        logger.error(`[Export ZIP] Archive error: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to create ZIP archive' });
        }
    });

    archive.pipe(res);
    archive.directory(safePath, false);
    await archive.finalize();
});
/**
 * @desc    Get Full Metadata for a Case (Study -> Series -> Instances)
 * @route   GET /api/cases/:id/metadata
 * @access  Private
 */
export const getCaseMetadata = asyncHandler(async (req, res) => {
    const requestedCase = await Case.findById(req.params.id);
    if (!requestedCase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    // Find all cases for this patient to support "multiple studies" view
    const allCasesForPatient = await Case.find({ patientId: requestedCase.patientId });

    const studiesMetadata = allCasesForPatient.map(kase => {
        // Transform flat file list into hierarchical metadata
        // Structure: Study -> Series -> Instances
        const seriesMap = {};

        kase.dicomFiles.forEach(file => {
            const seriesUID = file.seriesInstanceUID || 'UNKNOWN_SERIES';

            if (!seriesMap[seriesUID]) {
                seriesMap[seriesUID] = {
                    seriesInstanceUID: seriesUID,
                    seriesNumber: file.seriesNumber,
                    modality: file.modality || kase.modality,
                    seriesDescription: file.seriesDescription,
                    instances: []
                };
            }

            seriesMap[seriesUID].instances.push({
                sopInstanceUID: file.sopInstanceUID,
                instanceNumber: file.instanceNumber,
                seriesNumber: file.seriesNumber,
                seriesDescription: file.seriesDescription,
                modality: file.modality,
                imagePositionPatient: file.imagePositionPatient,
                imageOrientationPatient: file.imageOrientationPatient,
                pixelSpacing: file.pixelSpacing,
                rows: file.rows,
                columns: file.columns,
                sliceThickness: file.sliceThickness,
                spacingBetweenSlices: file.spacingBetweenSlices,
                windowCenter: file.windowCenter,
                windowWidth: file.windowWidth,
                photometricInterpretation: file.photometricInterpretation,
                bitsAllocated: file.bitsAllocated,
                bitsStored: file.bitsStored,
                highBit: file.highBit,
                pixelRepresentation: file.pixelRepresentation,
                samplesPerPixel: file.samplesPerPixel,
                rescaleIntercept: file.rescaleIntercept,
                rescaleSlope: file.rescaleSlope,
                transferSyntax: file.transferSyntax,
                // Construct accessible URL
                url: file.path ? `${process.env.BASE_URL || ''}${file.path}` : null,
                // Helper for specific loaders
                imageId: `wadouri:${process.env.BASE_URL || ''}${file.path}`
            });
        });

        // Sort instances within series
        Object.values(seriesMap).forEach(series => {
            series.instances.sort((a, b) => (a.instanceNumber || 0) - (b.instanceNumber || 0));
        });

        return {
            studyInstanceUID: kase.studyInstanceUID,
            patientName: kase.patientName,
            patientId: kase.patientId,
            studyDate: kase.studyDate || kase.createdAt,
            studyDescription: kase.indication || kase.bodyPart,
            numInstances: kase.dicomFiles.length,
            // [NEW] Hybrid Path: Point to Orthanc for high-performance DICOMWeb access
            orthancStudyUrl: `${process.env.ORTHANC_URL || 'http://localhost:8042'}/dicom-web/studies/${kase.studyInstanceUID}`,
            series: Object.values(seriesMap)
        };
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Metadata retrieved successfully", studiesMetadata);
});

/**
 * @desc    Handle callback from AI microservice with image quality results
 * @route   POST /api/internal/integrity/results
 * @access  Internal
 */
export const handleAIResults = asyncHandler(async (req, res) => {
    const { caseId, findings, aiScore } = req.body;

    logger.info(`[Integrity Callback] Received AI results for case: ${caseId}`);

    const kase = await Case.findById(caseId);
    if (!kase) throw new AppError("Case not found for AI callback", HTTP_STATUS.NOT_FOUND);

    // Merge AI findings with existing metadata/structural findings
    if (!kase.integrityResults) {
        kase.integrityResults = { findings: [], score: 100, status: 'Pending' };
    }

    // Replace or append AI-level findings
    const otherFindings = (kase.integrityResults.findings || []).filter(f => f.level !== 'AI');
    kase.integrityResults.findings = [...otherFindings, ...findings];

    // Recalculate total score (weighted)
    // Metadata 30%, Structure 40%, AI 30%
    const metaScore = kase.integrityResults.metadataHealth || 100;
    const structScore = kase.integrityResults.structuralHealth || 100;
    const currentAIScore = aiScore !== undefined ? aiScore : 100;

    const finalScore = Math.round((metaScore * 0.3) + (structScore * 0.4) + (currentAIScore * 0.3));

    kase.integrityResults.score = finalScore;
    kase.integrityResults.structuralHealth = structScore; // Maintain original
    kase.integrityResults.metadataHealth = metaScore; // Maintain original
    kase.integrityResults.lastRun = new Date();

    // Update overall status
    if (finalScore < 70) kase.integrityResults.status = 'Fail';
    else if (finalScore < 90 || kase.integrityResults.findings.some(f => f.type === 'Warning' || f.type === 'Error')) {
        kase.integrityResults.status = 'Warning';
    } else {
        kase.integrityResults.status = 'Pass';
    }

    await kase.save();

    // Notify connected clients via Socket.io
    try {
        const io = getIO();
        const roomId = caseId.toString();
        io.to(roomId).emit('integrity-update', {
            caseId: roomId,
            integrityResults: kase.integrityResults
        });
    } catch (ioErr) {
        logger.warn(`[AI Callback Socket Warning] ${ioErr.message}`);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "AI results processed");
});

/**
 * @desc    Manually trigger automated integrity validation
 * @route   POST /api/cases/:id/validate
 * @access  Private (Technician/Admin)
 */
export const validateCaseIntegrity = asyncHandler(async (req, res) => {
    console.log(`[Integrity Debug] Request to validate case: ${req.params.id}`);
    const kase = await Case.findById(req.params.id);
    if (!kase) {
        console.error(`[Integrity Debug] Case NOT FOUND in controller: ${req.params.id}`);
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    console.log(`[Integrity Debug] Found case: ${kase.patientName}. Current status: ${kase.integrityResults?.status}`);

    // Update status to Pending to show scanning state in UI
    if (!kase.integrityResults) {
        kase.integrityResults = { findings: [], score: 0, status: 'Pending' };
    } else {
        kase.integrityResults.status = 'Pending';
    }
    await kase.save();
    console.log(`[Integrity Debug] Case saved as Pending. Starting async validation...`);

    // Trigger validation asynchronously
    StudyIntegrityService.runValidation(kase._id, true).catch(err => {
        console.error(`[Integrity Debug] runValidation failed: ${err.message}`);
        logger.error(`[Manual Integrity Error] ${err.message}`);
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Integrity validation started", {
        status: 'Pending'
    });
});


/**
 * Helper to ensure sequential instance numbers within a series
 */
const reindexSeries = (dicomFiles) => {
    // Sort all files by their current instance number (or current array position if missing)
    dicomFiles.sort((a, b) => (a.instanceNumber || 0) - (b.instanceNumber || 0));

    // Assign new sequential numbers
    dicomFiles.forEach((file, index) => {
        file.instanceNumber = index + 1;
    });
};

/**
 * @desc    Delete a specific DICOM frame
 * @route   DELETE /api/cases/:id/images/:sopUid
 * @access  Private (QA Only)
 */
export const deleteDicomFrame = asyncHandler(async (req, res) => {
    const { id, sopUid } = req.params;
    const kase = await Case.findById(id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    const frameIndex = kase.dicomFiles.findIndex(f => f.sopInstanceUID === sopUid);
    if (frameIndex === -1) throw new AppError("Frame not found in study", HTTP_STATUS.NOT_FOUND);

    const frame = kase.dicomFiles[frameIndex];
    const absolutePath = path.join(process.cwd(), frame.path);

    // 1. Physical Delete
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
    }

    // 2. Remove from DB
    kase.dicomFiles.splice(frameIndex, 1);

    // 3. Re-index to ensure sequential order
    reindexSeries(kase.dicomFiles);

    kase.addTimelineEntry("Frame Deleted", req.user, `QA deleted frame: ${sopUid}`);
    await kase.save();

    // Trigger Re-validation
    StudyIntegrityService.runValidation(kase._id, true).catch(err => logger.error(`[Post-Delete Validation] ${err.message}`));

    return sendSuccess(res, HTTP_STATUS.OK, "Frame deleted successfully");
});

/**
 * @desc    Replace a specific DICOM frame
 * @route   PATCH /api/cases/:id/images/:sopUid/replace
 * @access  Private (QA Only)
 */
export const replaceDicomFrame = asyncHandler(async (req, res) => {
    const { id, sopUid } = req.params;
    const file = req.file;

    if (!file) throw new AppError("No file provided for replacement", HTTP_STATUS.BAD_REQUEST);

    const kase = await Case.findById(id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    const frameIndex = kase.dicomFiles.findIndex(f => f.sopInstanceUID === sopUid);
    if (frameIndex === -1) throw new AppError("Frame not found", HTTP_STATUS.NOT_FOUND);

    const oldFrame = kase.dicomFiles[frameIndex];
    const oldAbsolutePath = path.join(process.cwd(), oldFrame.path);

    // 1. Delete old file
    if (fs.existsSync(oldAbsolutePath)) {
        fs.unlinkSync(oldAbsolutePath);
    }

    // 2. Save new file (maintain same relative path structure)
    const buffer = await fs.promises.readFile(file.path);
    const newMetadata = extractDicomMetadata(buffer);
    await fs.promises.rename(file.path, oldAbsolutePath);

    // 3. Update DB Entry
    kase.dicomFiles[frameIndex] = {
        ...kase.dicomFiles[frameIndex].toObject(),
        ...newMetadata,
        size: file.size,
        name: file.originalname
    };

    kase.addTimelineEntry("Frame Replaced", req.user, `QA replaced frame ${sopUid} with ${file.originalname}`);
    await kase.save();

    // Trigger Re-validation
    StudyIntegrityService.runValidation(kase._id, true).catch(err => logger.error(`[Post-Replace Validation] ${err.message}`));

    return sendSuccess(res, HTTP_STATUS.OK, "Frame replaced successfully");
});

/**
 * @desc    Insert a new DICOM frame at a specific position
 * @route   POST /api/cases/:id/images/insert
 * @access  Private (QA Only)
 */
export const insertDicomFrame = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetIndex } = req.body; // 0-indexed position
    const file = req.file;

    if (!file) throw new AppError("No file provided", HTTP_STATUS.BAD_REQUEST);

    const kase = await Case.findById(id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    // 1. Extract Metadata
    const buffer = await fs.promises.readFile(file.path);
    const metadata = extractDicomMetadata(buffer);
    if (!metadata) throw new AppError("Invalid DICOM file", HTTP_STATUS.BAD_REQUEST);

    // 2. Save Physical File
    const dicomDir = path.join(process.cwd(), "uploads", "cases", kase.studyInstanceUID, "dicom");
    const safeFileName = `MANUAL_${Date.now()}_${file.originalname}`;
    const filePath = path.join(dicomDir, safeFileName);
    await fs.promises.rename(file.path, filePath);

    const newFrame = {
        name: file.originalname,
        path: `/uploads/cases/${kase.studyInstanceUID}/dicom/${safeFileName}`,
        size: file.size,
        ...metadata
    };

    // 3. Insert into Array at specific position
    const insertPos = targetIndex !== undefined ? parseInt(targetIndex) : kase.dicomFiles.length;

    // Before inserting, we manually set a temporary instanceNumber for sorting
    // If targetIndex is 0, we'll set it to 0.5 to put it at start
    // If targetIndex is 5 (between 5 and 6), we'll set it to 5.5
    newFrame.instanceNumber = insertPos === 0 ? 0.5 : insertPos + 0.5;

    kase.dicomFiles.splice(insertPos, 0, newFrame);

    // 4. Re-index to lock in integers
    reindexSeries(kase.dicomFiles);

    kase.addTimelineEntry("Frame Inserted", req.user, `QA inserted frame at position ${insertPos}`);
    await kase.save();

    // Trigger Re-validation
    StudyIntegrityService.runValidation(kase._id, true).catch(err => logger.error(`[Post-Insert Validation] ${err.message}`));

    return sendSuccess(res, HTTP_STATUS.OK, "Frame inserted successfully", newFrame);
});

/**
 * @desc    Serve a protected uploaded file (DICOM, attachment, etc.)
 * @route   GET /uploads/cases/:studyUID/:folder/:filename
 * @access  Private
 */
export const serveUploadedFile = asyncHandler(async (req, res) => {
    const { studyUID, folder, filename } = req.params;

    const ALLOWED_FOLDERS = ['dicom', 'attachments'];
    if (!ALLOWED_FOLDERS.includes(folder)) {
        throw new AppError("Invalid folder", HTTP_STATUS.BAD_REQUEST);
    }

    // Use process.cwd() explicitly — path.resolve() alone can behave
    // differently depending on how/where the server process was started
    const absolutePath = path.resolve(process.cwd(), 'uploads', 'cases', studyUID, folder, filename);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');

    // Debug — remove once confirmed working
    console.log(`[ServeFile] CWD       : ${process.cwd()}`);
    console.log(`[ServeFile] Looking at: ${absolutePath}`);
    console.log(`[ServeFile] Exists    : ${fs.existsSync(absolutePath)}`);

    if (!absolutePath.startsWith(uploadsRoot)) {
        throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN);
    }

    if (!fs.existsSync(absolutePath)) {
        throw new AppError("File not found", HTTP_STATUS.NOT_FOUND);
    }

    if (folder === 'dicom') {
        const allowedRoles = ['radiologist', 'qa', 'admin', 'technician'];
        if (!allowedRoles.includes(req.user?.role)) {
            throw new AppError("You do not have permission to access DICOM files", HTTP_STATUS.FORBIDDEN);
        }
    }

    const stat = fs.statSync(absolutePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(absolutePath).pipe(res);
});

/**
 * @desc    Add attachment to existing case (e.g. Snapshot)
 * @route   POST /api/cases/:id/attachments
 * @access  Private (Radiologist, Technician, Admin)
 */
export const addAttachment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
        throw new AppError("No file uploaded", HTTP_STATUS.BAD_REQUEST);
    }

    const caseDoc = await Case.findById(id);
    if (!caseDoc) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    // Determine save path: ALWAYS use a local relative path based on UID
    // This avoids issues when using a production DB dump with absolute paths locally.
    const studyInstanceUID = caseDoc.studyInstanceUID || `LOCAL_${Date.now()}`;
    const attachmentsDir = path.join("uploads", "cases", studyInstanceUID, "attachments");

    if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(attachmentsDir, fileName);

    await fs.promises.rename(file.path, filePath);

    // Construct public URL
    // Assumes attachmentsDir is relative to root or inside uploads
    // We need to ensure the path is relative to the 'uploads' public root
    // If studyDirectory is 'uploads/cases/UID', then URL is '/uploads/cases/UID/attachments/file'

    // Calculate relative path from CWD
    const relativePath = path.relative(process.cwd(), filePath);
    // Ensure forward slashes and leading slash
    const publicUrl = "/" + relativePath.split(path.sep).join("/");

    const newAttachment = {
        name: file.originalname,
        url: publicUrl,
        path: publicUrl,
        fileType: file.mimetype,
        category: 'Snapshot',
        uploadedAt: new Date(),
        uploadedBy: req.user._id
    };

    caseDoc.attachments.push(newAttachment);

    // Add timeline entry
    caseDoc.addTimelineEntry(
        'Attachment Added',
        req.user,
        `Added attachment: ${file.originalname}`,
        { fileName: file.originalname }
    );

    await caseDoc.save();

    return sendSuccess(res, HTTP_STATUS.OK, "Attachment added successfully", {
        url: publicUrl,
        attachment: newAttachment
    });
});
