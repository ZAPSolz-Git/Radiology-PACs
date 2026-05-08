import express from "express";
import multer from "multer";
import { getQAQueue, verifyCase, rejectCase, dispatchCase, updateReport, finalizeReport } from "../controllers/qaController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";
import { getPartnersForAssignment } from "../controllers/apiKeyController.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// All routes restricted to QA and Admin
router.use(restrictTo("qa", "admin"));

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for reports
});

/**
 * @swagger
 * tags:
 *   name: QA
 *   description: Quality Assurance workflow management
 */

/**
 * @swagger
 * /qa/queue:
 *   get:
 *     summary: Get cases in the QA queue
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending QA cases
 */
router.get("/queue", getQAQueue);

/**
 * @swagger
 * /qa/{id}/verify:
 *   post:
 *     summary: Mark a case as verified by QA
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case verified
 */
router.post("/:id/verify", verifyCase);

/**
 * @swagger
 * /qa/{id}/reject:
 *   post:
 *     summary: Reject a case back to technician
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Case rejected
 */
router.post("/:id/reject", rejectCase);

/**
 * @swagger
 * /qa/{id}/dispatch:
 *   post:
 *     summary: Dispatch case to assigned radiologist
 *     description: "[Allowed Roles: qa, admin] Move the case from QA queue to the assigned radiologist's worklist."
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case dispatched
 *       400: { $ref: '#/components/responses/BadRequestError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.post("/:id/dispatch", dispatchCase);

/**
 * @swagger
 * /qa/{id}/report:
 *   patch:
 *     summary: Update case report
 *     description: "[Allowed Roles: qa, admin] Manually update the report document for a case."
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               reportDoc: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Report updated
 */
router.patch("/:id/report", upload.single('reportDoc'), updateReport);

/**
 * @swagger
 * /qa/{id}/finalize:
 *   post:
 *     summary: Finalize a case report
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Case finalized
 */
router.post("/:id/finalize", upload.single('reportDoc'), finalizeReport);

/**
 * @swagger
 * /qa/partners:
 *   get:
 *     summary: Get partners available for case assignment
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of partners with workload }
 */
router.get("/partners", getPartnersForAssignment);

export default router;
