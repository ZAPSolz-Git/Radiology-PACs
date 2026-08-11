import express from "express";
import { handleAIResults } from "../controllers/caseController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Internal
 *   description: System-to-system webhooks and internal integrations
 */

/**
 * @swagger
 * /internal/integrity/results:
 *   post:
 *     summary: AI result webhook
 *     description: Receives automated image analysis results from external AI services.
 *     tags: [Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Results processed }
 *       400: { $ref: '#/components/responses/BadRequestError' }
 */
router.post("/integrity/results", handleAIResults);

export default router;
