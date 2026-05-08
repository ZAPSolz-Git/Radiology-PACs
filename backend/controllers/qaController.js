import fs from "fs";
import path from "path";
import Case from "../models/Case.js";
import User from "../models/User.js";
import Tariff from "../models/Tariff.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import { findMatchingTariff, calculateCaseEarning } from "../utils/billingUtils.js";
import { getIO } from "../utils/socketSetup.js";

/**
 * @desc    Get QA Queue (Cases waiting for verification)
 * @route   GET /api/qa/queue
 * @access  Private (QA/Admin)
 */
export const getQAQueue = asyncHandler(async (req, res) => {
    // Fetch cases that are specifically waiting for QA action
    // Pending: Just submitted
    // QA_Review: Locked by a QA (optional logic, simplified for now)
    // QA_Audit: Report submitted by doctor, needs QA check

    const query = {
        status: { $in: ['QA_Pending', 'QA_Review', 'QA_Audit', 'Finalized'] }
    };

    // 🔒 ROLE-BASED ACCESS CONTROL: QA members can only see cases they verified
    // BUT unverified cases (QA_Pending) should be visible to all QA so they can accept new work
    if (req.user.role === 'qa') {
        query.$or = [
            { 'qaVerification.verifiedBy': req.user._id },  // Cases I verified
            { 'qaVerification.verifiedBy': { $exists: false } },  // Unverified cases
            { 'qaVerification.verifiedBy': null }  // Explicitly null
        ];
    }
    // Admins can see ALL cases (no additional filtering)

    const queue = await Case.find(query)
        .populate('uploadedBy', 'name')
        .populate('assignedRadiologist', 'name')
        .populate('qaVerification.verifiedBy', 'name')
        .sort({ urgency: -1, createdAt: 1 }); // Oldest urgent cases first

    return sendSuccess(res, HTTP_STATUS.OK, "QA Queue retrieved", queue);
});

/**
 * @desc    Verify Patient & Image Data
 * @route   POST /api/qa/:id/verify
 * @access  Private (QA)
 */
export const verifyCase = asyncHandler(async (req, res) => {
    const { identityMatch, imageQuality, notes, protocolValid, contrastCheck } = req.body;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    // Update QA Verification Checkpoints
    kase.qaVerification = {
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
        identityMatch,
        imageQuality,
        protocolValid,
        contrastCheck,
        notes
    };

    // If QA starts verifying, move to 'QA_Review' if not already
    if (kase.status === 'QA_Pending') {
        kase.status = 'QA_Review';
        // Add to timeline
        kase.addTimelineEntry(
            'QA Review Started',
            req.user,
            'QA started verifying patient and image data'
        );
    }

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    return sendSuccess(res, HTTP_STATUS.OK, "Verification data saved", kase);
});

/**
 * @desc    Reject Case (Send back to Technician)
 * @route   POST /api/qa/:id/reject
 * @access  Private (QA)
 */
export const rejectCase = asyncHandler(async (req, res) => {
    const { reason, notes } = req.body;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    kase.status = 'Rejected';
    kase.rejectionReason = reason;

    // Add to timeline
    const isAuditFail = reason === 'QA_Audit_Failed';
    kase.addTimelineEntry(
        isAuditFail ? 'Correction Requested' : 'Case Rejected',
        req.user,
        isAuditFail ? `Report Correction: ${notes || ''}` : `Rejected: ${reason}. ${notes || ''}`,
        { reason, type: isAuditFail ? 'Audit' : 'Study' }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    console.log(`[QA Reject] Case ${kase._id} rejected by ${req.user.name}`);
    return sendSuccess(res, HTTP_STATUS.OK, "Case rejected", kase);
});

/**
 * @desc    Dispatch Case (Assign to Doctor)
 * @route   POST /api/qa/:id/dispatch
 * @access  Private (QA)
 */
export const dispatchCase = asyncHandler(async (req, res) => {
    const { doctorId, priority } = req.body;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    // Verify Doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'radiologist') {
        throw new AppError("Invalid doctor ID", HTTP_STATUS.BAD_REQUEST);
    }

    kase.assignedRadiologist = doctorId;
    kase.status = 'Assigned';
    if (priority) kase.urgency = priority;

    // Add to timeline
    kase.addTimelineEntry(
        'Case Assigned',
        req.user,
        `QA ${req.user.name} assigned this case to Dr. ${doctor.name}`,
        { 
            doctorId, 
            doctorName: doctor.name, 
            qaName: req.user.name,
            priority: priority || kase.urgency 
        }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    console.log(`[QA Dispatch] Case ${kase._id} assigned to ${doctor.name} by ${req.user.name}`);

    // TODO: Trigger Notification Service (WhatsApp/In-App)

    return sendSuccess(res, HTTP_STATUS.OK, "Case dispatched successfully", kase);
});

/**
 * @desc    Update Report (Edit by QA)
 * @route   PATCH /api/qa/:id/report
 * @access  Private (QA)
 */
export const updateReport = asyncHandler(async (req, res) => {
    const { findings, impression, jsonContent, banner } = req.body;
    const reportDoc = req.file;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (!kase.report) {
        throw new AppError("Report not found for this case", HTTP_STATUS.NOT_FOUND);
    }

    let docxUrl = kase.report.docxUrl;
    let docxPath = kase.report.docxPath;

    // Handle DOCX upload
    if (reportDoc) {
        const studyDir = kase.studyDirectory || path.join("uploads", "cases", kase.studyInstanceUID);
        const reportDir = path.join(studyDir, "reports");
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        const fileName = reportDoc.originalname || `report_qa_draft_${Date.now()}.docx`;
        const filePath = path.join(reportDir, fileName);
        fs.writeFileSync(filePath, reportDoc.buffer);

        docxPath = filePath;
        docxUrl = `/uploads/cases/${kase.studyInstanceUID}/reports/${fileName}`;
    }

    // Update findings and impression
    kase.report.findings = findings || kase.report.findings;
    kase.report.impression = impression || kase.report.impression;
    kase.report.docxUrl = docxUrl;
    kase.report.docxPath = docxPath;
    kase.report.jsonContent = jsonContent || kase.report.jsonContent;
    kase.report.banner = (banner && banner !== 'undefined' && banner !== 'null') ? banner : kase.report.banner;
    kase.report.version = (kase.report.version || 0) + 1;

    // Add to timeline
    kase.addTimelineEntry(
        'Report Updated',
        req.user,
        `Report updated by QA (Version ${kase.report.version})`,
        { version: kase.report.version }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    return sendSuccess(res, HTTP_STATUS.OK, "Report updated by QA", kase);
});

/**
 * @desc    Finalize Report (Lock by QA)
 * @route   POST /api/qa/:id/finalize
 * @access  Private (QA)
 */
export const finalizeReport = asyncHandler(async (req, res) => {
    const { findings, impression, jsonContent, banner } = req.body;
    const reportDoc = req.file;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (!kase.report) {
        throw new AppError("Report not found for this case", HTTP_STATUS.NOT_FOUND);
    }

    let docxUrl = kase.report.docxUrl;
    let docxPath = kase.report.docxPath;

    // Handle DOCX upload
    if (reportDoc) {
        const studyDir = kase.studyDirectory || path.join("uploads", "cases", kase.studyInstanceUID);
        const reportDir = path.join(studyDir, "reports");
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        const fileName = reportDoc.originalname || `report_final_${Date.now()}.docx`;
        const filePath = path.join(reportDir, fileName);
        fs.writeFileSync(filePath, reportDoc.buffer);

        docxPath = filePath;
        docxUrl = `/uploads/cases/${kase.studyInstanceUID}/reports/${fileName}`;
    }

    kase.status = 'Finalized';
    kase.report.status = 'Final';
    kase.report.finalizedAt = new Date();
    kase.report.findings = findings || kase.report.findings;
    kase.report.impression = impression || kase.report.impression;
    kase.report.jsonContent = jsonContent || kase.report.jsonContent;
    kase.report.banner = (banner && banner !== 'undefined' && banner !== 'null') ? banner : kase.report.banner;
    kase.report.docxUrl = docxUrl;
    kase.report.docxPath = docxPath;

    // --- Financial Lock: Snapshot Pricing ---
    try {
        const tariffs = await Tariff.find({ isActive: true }).lean();
        const matchedTariff = findMatchingTariff(tariffs, kase.modality, kase.bodyPart, kase.institution, kase.assignedRadiologist);

        if (matchedTariff) {
            const earnings = calculateCaseEarning(kase, matchedTariff);
            kase.billingInfo = {
                basePrice: earnings.basePrice,
                emergencySurcharge: earnings.emergencySurcharge,
                nightHolidaySurcharge: earnings.nightHolidaySurcharge,
                total: earnings.total,
                radiologistEarning: earnings.radiologistEarning,
                tariffId: matchedTariff._id,
                lockedAt: new Date()
            };
            console.log(`[Billing Snapshot] ✓ Price locked at ₹${earnings.total} (Doctor Cut: ₹${earnings.radiologistEarning}) for Case ${kase._id}`);
        } else {
            // Even if no tariff is found, we lock it at 0 to prevent future changes from affecting this historical record
            // unless manually corrected by an admin.
            kase.billingInfo = {
                basePrice: 0,
                emergencySurcharge: 0,
                nightHolidaySurcharge: 0,
                total: 0,
                radiologistEarning: 0,
                lockedAt: new Date(),
                notes: "No matching tariff found during finalization"
            };
            console.warn(`[Billing Warning] ✗ No matching tariff found for Case ${kase._id}. Locked at ₹0.`);
        }
    } catch (billingErr) {
        console.error(`[Billing Error] Failed to snapshot price for Case ${kase._id}:`, billingErr);
    }

    // Add to timeline
    kase.addTimelineEntry(
        'Case Finalized',
        req.user,
        'Report Finalized and Case Locked',
        { billingTotal: kase.billingInfo?.total }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    console.log(`[QA Finalize] Case ${kase._id} finalized by ${req.user.name}`);
    return sendSuccess(res, HTTP_STATUS.OK, "Report finalized successfully", kase);
});
