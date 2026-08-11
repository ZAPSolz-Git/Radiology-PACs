import Case from "../models/Case.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";
import { getIO } from "../utils/socketSetup.js";
import fs from "fs";
import path from "path";

/**
 * Parse a YYYY-MM-DD date string as the END of that calendar day (UTC).
 * e.g. "2026-01-15" → 2026-01-15T23:59:59.999Z
 * Without this, new Date("2026-01-15") resolves to midnight *start* of the day,
 * which excludes every case created on Jan 15 itself.
 */
const endOfDay = (dateStr) => {
    const d = new Date(dateStr);
    d.setUTCHours(23, 59, 59, 999);
    return d;
};

/**
 * @desc    Get all cases assigned to the external partner
 * @route   GET /api/v1/external/cases
 * @access  External (API Key + read:cases scope)
 */
export const getAssignedCases = asyncHandler(async (req, res) => {
    const { dateFrom, dateTo, status } = req.query;

    // Only return cases assigned to this partner
    const query = { assignedPartner: req.apiPartner.id };

    if (status) {
        query.status = status;
    }

    // Optional date range filter
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        // Use end-of-day so cases created anywhere on the dateTo date are included.
        if (dateTo) query.createdAt.$lte = endOfDay(dateTo);
    }

    const cases = await Case.find(query)
        .populate("patient", "name age gender phone email")
        .select(
            "patientName patientId age gender modality bodyPart " +
            "clinicalHistory indication referringDoctor contrast " +
            "accessionNumber institution studyInstanceUID studyDate " +
            "urgency isEmergency status expectedFiles createdAt"
        )
        .sort({ createdAt: -1 })
        .lean();

    // Transform to 5C-friendly format
    const transformed = cases.map((c) => ({
        caseId: c._id,
        patientId: c.patientId,
        patientName: c.patientName,
        age: c.age,
        gender: c.gender,
        modality: c.modality,
        study: c.bodyPart,
        clinicalHistory: c.clinicalHistory || "",
        clinicalQuery: c.indication || "",
        referringPhysician: c.referringDoctor || "",
        contrast: c.contrast?.isGiven ? "Yes" : "No",
        accessionNumber: c.accessionNumber || "",
        institution: c.institution || "",
        studyInstanceUID: c.studyInstanceUID,
        studyDate: c.studyDate,
        urgency: c.urgency,
        isEmergency: c.isEmergency,
        status: c.status,
        expectedFiles: c.expectedFiles || 0,
        createdAt: c.createdAt,
    }));

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "Fetch Assigned Cases",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Partner "${req.apiPartner.partnerName}" fetched ${transformed.length} assigned cases`,
        metadata: { caseCount: transformed.length },
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Cases retrieved", transformed);
});

/**
 * @desc    Get all cases for a given Patient ID (MRN)
 * @route   GET /api/v1/external/cases/:patientId
 * @access  External (API Key + read:cases scope)
 */
export const getCasesByPatientId = asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Only return cases assigned to this partner
    const query = { patientId, assignedPartner: req.apiPartner.id };

    // Optional date range filter
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        // Use end-of-day so cases created anywhere on the dateTo date are included.
        if (dateTo) query.createdAt.$lte = endOfDay(dateTo);
    }

    const cases = await Case.find(query)
        .populate("patient", "name age gender phone email")
        .select(
            "patientName patientId age gender modality bodyPart " +
            "clinicalHistory indication referringDoctor contrast " +
            "accessionNumber institution studyInstanceUID studyDate " +
            "urgency isEmergency status expectedFiles createdAt"
        )
        .sort({ createdAt: -1 })
        .lean();

    // Transform to 5C-friendly format
    const transformed = cases.map((c) => ({
        caseId: c._id,
        patientId: c.patientId,
        patientName: c.patientName,
        age: c.age,
        gender: c.gender,
        modality: c.modality,
        study: c.bodyPart,
        clinicalHistory: c.clinicalHistory || "",
        clinicalQuery: c.indication || "",
        referringPhysician: c.referringDoctor || "",
        contrast: c.contrast?.isGiven ? "Yes" : "No",
        accessionNumber: c.accessionNumber || "",
        institution: c.institution || "",
        studyInstanceUID: c.studyInstanceUID,
        studyDate: c.studyDate,
        urgency: c.urgency,
        isEmergency: c.isEmergency,
        status: c.status,
        expectedFiles: c.expectedFiles || 0,
        createdAt: c.createdAt,
    }));

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "Fetch Cases by Patient ID",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Partner "${req.apiPartner.partnerName}" fetched ${transformed.length} cases for patient ${patientId}`,
        metadata: { patientId, caseCount: transformed.length },
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Cases retrieved", transformed);
});

/**
 * @desc    Get a single case's full detail
 * @route   GET /api/v1/external/cases/:patientId/:caseId
 * @access  External (API Key + read:cases scope)
 */
export const getCaseDetail = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const kase = await Case.findById(caseId)
        .populate("patient", "name age gender phone email")
        .select(
            "patientName patientId age gender modality bodyPart " +
            "clinicalHistory indication referringDoctor contrast " +
            "accessionNumber institution studyInstanceUID studyDate " +
            "urgency isEmergency status expectedFiles dicomFiles attachments report.status " +
            "report.findings report.impression createdAt assignedPartner"
        )
        .lean();

    if (!kase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    // Verify case is assigned to this partner
    if (kase.assignedPartner?.toString() !== req.apiPartner.id) {
        throw new AppError("Case not found or not assigned to your organization", HTTP_STATUS.NOT_FOUND);
    }

    // Enforce the URL contract: patientId in path must match the case record.
    // Prevents silent success when caller passes a wrong patient ID.
    if (kase.patientId !== req.params.patientId) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    const detail = {
        caseId: kase._id,
        patientId: kase.patientId,
        patientName: kase.patientName,
        age: kase.age,
        gender: kase.gender,
        modality: kase.modality,
        study: kase.bodyPart,
        clinicalHistory: kase.clinicalHistory || "",
        clinicalQuery: kase.indication || "",
        referringPhysician: kase.referringDoctor || "",
        contrast: kase.contrast?.isGiven ? "Yes" : "No",
        accessionNumber: kase.accessionNumber || "",
        institution: kase.institution || "",
        studyInstanceUID: kase.studyInstanceUID,
        studyDate: kase.studyDate,
        urgency: kase.urgency,
        isEmergency: kase.isEmergency,
        status: kase.status,
        expectedFiles: kase.expectedFiles || 0,
        reportStatus: kase.report?.status || null,
        attachments: (kase.attachments || []).map((a) => ({
            name: a.name,
            fileType: a.fileType,
            category: a.category,
        })),
        dicomFiles: (kase.dicomFiles || []).map((d) => ({
            name: d.name,
            sopInstanceUID: d.sopInstanceUID,
            seriesInstanceUID: d.seriesInstanceUID,
            seriesNumber: d.seriesNumber,
            instanceNumber: d.instanceNumber,
            seriesDescription: d.seriesDescription,
            modality: d.modality,
            sliceThickness: d.sliceThickness,
            path: d.path // useful if they need to map files
        })),
        createdAt: kase.createdAt,
    };

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "Fetch Case Detail",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Partner "${req.apiPartner.partnerName}" fetched case ${caseId}`,
        resourceType: "Case",
        resourceId: caseId,
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Case retrieved", detail);
});

/**
 * @desc    Receive a finalized report from external partner
 * @route   PUT /api/v1/external/cases/:caseId/report
 * @access  External (API Key + write:reports scope)
 * 
 * Accepts: multipart/form-data with a `reportFile` field (PDF/DOCX)
 *          + JSON fields: findings, impression
 */
export const receiveReport = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const kase = await Case.findById(caseId);
    if (!kase) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    // Verify case is assigned to this partner
    if (kase.assignedPartner?.toString() !== req.apiPartner.id) {
        throw new AppError("Case not found or not assigned to your organization", HTTP_STATUS.NOT_FOUND);
    }

    // Status guard: only accept reports for cases in these workflow stages
    const allowedStatuses = ["Uploaded", "QA_Pending", "Assigned", "In_Progress"];
    if (!allowedStatuses.includes(kase.status)) {
        throw new AppError(
            `Cannot receive report for case in "${kase.status}" status. ` +
            `Report upload is only allowed when the case is in one of: ${allowedStatuses.join(", ")}.`,
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const { findings, impression } = req.body;
    const reportFile = req.file; // single file from multer

    if (!reportFile && !findings && !impression) {
        throw new AppError(
            "At least one of reportFile, findings, or impression is required",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Save the uploaded report file if present
    let savedReportPath = null;
    if (reportFile) {
        const studyDir = kase.studyDirectory || path.join("uploads", "cases", kase.studyInstanceUID);
        const reportsDir = path.join(studyDir, "reports");
        fs.mkdirSync(reportsDir, { recursive: true });

        const fileName = `external_${Date.now()}_${reportFile.originalname}`;
        const destPath = path.join(reportsDir, fileName);

        // Move from multer temp to final destination
        try {
            await fs.promises.rename(reportFile.path, destPath);
        } catch {
            await fs.promises.copyFile(reportFile.path, destPath);
            await fs.promises.unlink(reportFile.path).catch(() => { });
        }

        savedReportPath = `/uploads/cases/${kase.studyInstanceUID}/reports/${fileName}`;

        // Save the report path (schema stores both PDF and DOCX under docxUrl/docxPath)
        kase.report.docxUrl = savedReportPath;
        kase.report.docxPath = destPath;
    }

    // Update report fields
    if (findings) kase.report.findings = findings;
    if (impression) kase.report.impression = impression;
    kase.report.status = "Submitted";
    kase.report.submittedAt = new Date();

    // Transition case to QA_Audit so internal QA reviews the external report
    kase.status = "QA_Audit";

    // Add timeline entry using the existing helper
    kase.timeline.push({
        action: "External Report Received",
        status: kase.status,
        userName: req.apiPartner.partnerName,
        role: "external_partner",
        timestamp: new Date(),
        details: `Report submitted by external partner "${req.apiPartner.partnerName}" via API`,
        metadata: {
            partnerId: req.apiPartner.id,
            partnerName: req.apiPartner.partnerName,
            hasFile: !!reportFile,
            fileName: reportFile?.originalname || null,
        },
    });

    await kase.save();

    // Notify internal users (QA team) in real-time so the new case appears
    // in their dashboard immediately without a manual refresh.
    try {
        const io = getIO();
        if (io) io.emit('case_updated', kase._id.toString());
    } catch (e) { /* non-critical — save already succeeded */ }

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "External Report Received",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.MEDIUM,
        details: `Partner "${req.apiPartner.partnerName}" submitted report for case ${caseId}`,
        resourceType: "Case",
        resourceId: caseId,
        metadata: {
            hasFile: !!reportFile,
            findings: !!findings,
            impression: !!impression,
        },
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Report received successfully", {
        caseId: kase._id,
        newStatus: kase.status,
        reportStatus: kase.report.status,
        reportPath: savedReportPath,
    });
});
