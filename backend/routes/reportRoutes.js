import express from 'express';
import { downloadReport } from '../controllers/radiologistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Final clinical report generation and export
 */

/**
 * @swagger
 * /reports/{caseId}/download:
 *   get:
 *     summary: Download finalized report
 *     description: "[Allowed Role: authenticated] Export the clinical report in PDF or DOCX format."
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [pdf, docx], default: pdf }
 *     responses:
 *       200: { description: Finalized report file stream }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get('/:caseId/download', protect, downloadReport);

export default router;
