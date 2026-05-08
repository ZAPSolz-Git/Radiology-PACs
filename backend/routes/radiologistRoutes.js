import express from "express";
import multer from "multer";
import { getWorklist, saveReportDraft, submitReport, acceptCase, rejectCase } from "../controllers/radiologistController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";
import { validateViewerToolAction } from "../middleware/viewerToolMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// All routes restricted to Radiologist (and Admin)
router.use(restrictTo("radiologist", "admin"));

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for reports
});

/**
 * @swagger
 * tags:
 *   name: Radiologist
 *   description: Radiologist specific worklist and reporting
 */

/**
 * @swagger
 * /radiologist/worklist:
 *   get:
 *     summary: Get assigned worklist for the radiologist
 *     description: "[Allowed Roles: radiologist, admin] Retrieve cases currently assigned to the logged-in radiologist."
 *     tags: [Radiologist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cases
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.get("/worklist", getWorklist);

/**
 * @swagger
 * /radiologist/{id}/draft:
 *   post:
 *     summary: Save report draft
 *     description: "[Allowed Roles: radiologist, admin] Save a partial report for later completion."
 *     tags: [Radiologist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Draft saved
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
// Note: Tool validation is optional for drafts since they're incomplete, but can be added if needed
router.post("/:id/draft", upload.single('reportDoc'), saveReportDraft);

/**
 * @swagger
 * /radiologist/{id}/submit:
 *   post:
 *     summary: Submit final report for QA audit
 *     description: "[Allowed Roles: radiologist, admin] Submit the completed report for final quality review."
 *     tags: [Radiologist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report submitted
 *       400: { $ref: '#/components/responses/BadRequestError' }
 */
router.post("/:id/submit", upload.single('reportDoc'), submitReport);

/**
 * @swagger
 * /radiologist/{id}/accept:
 *   patch:
 *     summary: Accept an assigned case
 *     description: "[Allowed Roles: radiologist, admin] Confirm acceptance of an assigned case to start reporting."
 *     tags: [Radiologist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case accepted
 */
router.patch("/:id/accept", acceptCase);

/**
 * @swagger
 * /radiologist/{id}/reject:
 *   patch:
 *     summary: Reject an assigned case
 *     description: "[Allowed Roles: radiologist, admin] Decline an assigned case with a reason."
 *     tags: [Radiologist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case rejected
 */
router.patch("/:id/reject", rejectCase);

export default router;
