import express from "express";
import { getRadiologistStats } from "../controllers/performanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Performance
 *   description: Radiologist turnaround time (TAT) and productivity tracking
 */

router.use(protect);

/**
 * @swagger
 * /performance/stats:
 *   get:
 *     summary: Get radiologist performance stats
 *     description: "[Allowed Role: radiologist] Retrieve personal TAT metrics and case counts."
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Performance statistics }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get("/stats", restrictTo("radiologist"), getRadiologistStats);

export default router;
