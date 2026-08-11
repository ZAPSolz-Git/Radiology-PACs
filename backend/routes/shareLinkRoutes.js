import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    createShareLink,
    validateShareLink,
    revokeShareLink,
    getCaseShareLinks
} from '../controllers/shareLinkController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

const validateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: {
        status: 'fail',
        data: { valid: false, reason: 'rate_limit_exceeded' },
        message: 'Too many validation requests from this IP, please try again after a minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: ShareLink
 *   description: Secure sharing of study viewer links
 */

/**
 * @swagger
 * /share-links/validate:
 *   get:
 *     summary: Validate a share link token
 *     tags: [ShareLink]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Token is valid }
 *       400: { $ref: '#/components/responses/BadRequestError' }
 *       403: { description: Token is expired or revoked }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get('/validate', validateLimiter, validateShareLink);

router.use(protect);

/**
 * @swagger
 * /share-links/case/{caseId}:
 *   get:
 *     summary: Get all active share links for a case
 *     description: "[Allowed Roles: technician, radiologist, qa, admin] Retrieve non-expired, non-revoked links."
 *     tags: [ShareLink]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Success, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/ShareLink' } } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get('/case/:caseId', restrictTo('technician', 'radiologist', 'qa', 'admin'), getCaseShareLinks);

/**
 * @swagger
 * /share-links:
 *   post:
 *     summary: Create a secure share link
 *     description: "[Allowed Roles: technician, radiologist, qa, admin] Generate a new token for OHIF viewer access."
 *     tags: [ShareLink]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [caseId, role]
 *             properties:
 *               caseId: { type: string }
 *               role: { type: string, enum: [radiologist, technician, qa, user] }
 *               expiresIn: { type: string, enum: [1h, 6h, 24h, 7d], default: 24h }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/ShareLink' } } } }
 *       400: { $ref: '#/components/responses/BadRequestError' }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.post('/', restrictTo('technician', 'radiologist', 'qa', 'admin'), createShareLink);

/**
 * @swagger
 * /share-links/{token}:
 *   delete:
 *     summary: Revoke a share link
 *     description: "[Allowed Roles: technician, radiologist, qa, admin] Mark a link as revoked."
 *     tags: [ShareLink]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Revoked }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.delete('/:token', restrictTo('technician', 'radiologist', 'qa', 'admin'), revokeShareLink);

export default router;
