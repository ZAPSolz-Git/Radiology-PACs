import express from "express";
import multer from "multer";
import os from "os";
import { apiKeyAuth, requireScope } from "../middleware/apiKeyAuth.js";
import { getAssignedCases, getCasesByPatientId, getCaseDetail, receiveReport } from "../controllers/webhookController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Per-key rate limiter using req.apiPartner.id as the key generator
const externalRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req) => req.apiPartner?.rateLimit || 100,
    keyGenerator: (req) => req.apiPartner?.id || "unknown_partner",
    message: {
        success: false,
        message: "Rate limit exceeded for this API key. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting until after apiKeyAuth populates req.apiPartner
    skip: (req) => !req.apiPartner,
    validate: { keyGeneratorIpFallback: false },
});

// Multer for report file uploads (temp dir, single file)
const reportUpload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for report files
    fileFilter: (req, file, cb) => {
        const allowed = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|doc)$/i)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF and Word documents are accepted"), false);
        }
    },
});

/**
 * @swagger
 * tags:
 *   name: External
 *   description: External partner API (API-Key authenticated)
 */

// All routes require API key auth first, then per-key rate limiting
router.use(apiKeyAuth);
router.use(externalRateLimiter);

/**
 * @swagger
 * /v1/external/cases:
 *   get:
 *     summary: Get all assigned cases
 *     description: Returns all cases assigned to the authenticated external partner. Supports optional date range and status filtering.
 *     tags: [External]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter cases by status (e.g., Assigned, QA_Audit)
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Filter cases created on or after this date
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: Filter cases created on or before this date
 *     responses:
 *       200: { description: List of assigned cases }
 *       401: { description: Invalid or missing API key }
 */
router.get("/cases", requireScope("read:cases"), getAssignedCases);

/**
 * @swagger
 * /v1/external/cases/{patientId}:
 *   get:
 *     summary: Get cases by Patient ID
 *     description: Returns all cases matching the given Patient ID (MRN). Supports optional date range filtering.
 *     tags: [External]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: List of cases }
 *       401: { description: Invalid or missing API key }
 */
router.get("/cases/:patientId", requireScope("read:cases"), getCasesByPatientId);

/**
 * @swagger
 * /v1/external/cases/{patientId}/{caseId}:
 *   get:
 *     summary: Get specific case detail
 *     description: Returns full detail for a specific case.
 *     tags: [External]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Case detail }
 *       404: { description: Case not found }
 */
router.get("/cases/:patientId/:caseId", requireScope("read:cases"), getCaseDetail);

/**
 * @swagger
 * /v1/external/cases/{caseId}/report:
 *   put:
 *     summary: Upload external report
 *     description: Push a finalized report (PDF/DOCX + findings/impression) for a case. Case transitions to QA_Audit.
 *     tags: [External]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               reportFile: { type: string, format: binary }
 *               findings: { type: string }
 *               impression: { type: string }
 *     responses:
 *       200: { description: Report received }
 *       400: { description: Invalid case status or missing data }
 *       404: { description: Case not found }
 */
router.put(
    "/cases/:caseId/report",
    requireScope("write:reports"),
    reportUpload.single("reportFile"),
    receiveReport
);

export default router;
