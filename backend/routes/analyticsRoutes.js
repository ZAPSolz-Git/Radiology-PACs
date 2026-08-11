import express from 'express';
import { getRevenueAnalytics } from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Business intelligence and revenue metrics
 */

// Only admin can access revenue analytics
router.use(protect, restrictTo('admin'));

/**
 * @swagger
 * /analytics/revenue:
 *   get:
 *     summary: Get revenue analytics data
 *     description: "[Allowed Role: admin] Aggregate financial data filtered by date range and site."
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Revenue data }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get('/revenue', getRevenueAnalytics);

export default router;
