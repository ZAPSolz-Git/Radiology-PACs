import express from 'express';
import {
    getOrthancStudies,
    getStudyDetails,
    deleteOrthancStudy,
    getOrthancStats
} from '../controllers/orthancController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orthanc
 *   description: Orthanc PACS monitoring and study management
 */

// All Orthanc management routes require Admin access
router.use(protect);
router.use(restrictTo('admin'));

/**
 * @swagger
 * /orthanc/studies:
 *   get:
 *     summary: List all Orthanc studies
 *     description: "[Allowed Role: admin] Retrieve all studies currently stored in the Orthanc instance."
 *     tags: [Orthanc]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of studies }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get('/studies', getOrthancStudies);

/**
 * @swagger
 * /orthanc/stats:
 *   get:
 *     summary: Get Orthanc statistics
 *     description: "[Allowed Role: admin] Disk usage and database counts from Orthanc."
 *     tags: [Orthanc]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Statistics }
 */
router.get('/stats', getOrthancStats);

/**
 * @swagger
 * /orthanc/studies/{id}:
 *   get:
 *     summary: Get Orthanc study details
 *     description: "[Allowed Role: admin] Retrieve metadata and series list from Orthanc."
 *     tags: [Orthanc]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Study details }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get('/studies/:id', getStudyDetails);

/**
 * @swagger
 * /orthanc/studies/{id}:
 *   delete:
 *     summary: Delete Orthanc study
 *     description: "[Allowed Role: admin] Remove a study from Orthanc storage."
 *     tags: [Orthanc]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/studies/:id', deleteOrthancStudy);

export default router;
