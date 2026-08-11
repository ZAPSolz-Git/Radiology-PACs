import express from "express";
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    getOverviewStats,
    getStorageStats,
    getStorageCases
} from "../controllers/adminControllers.js";
import { protect, restrictTo, verifyDBRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and restricted to admin
import {
    getSecuritySettings,
    updateSecuritySettings,
    getSecurityLogs,
    getLoginActivity,
    getViewerRestrictions,
    updateViewerRestrictions
} from '../controllers/securityControllers.js';
import {
    getWorkflowAnalytics,
    getSLAMonitoring,
    getSystemAlerts
} from '../controllers/workflowControllers.js';

router.use(protect);
router.use(verifyDBRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative dashboard and user management
 */

/**
 * @swagger
 * /admin/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview stats
 */
router.get('/overview', getOverviewStats);

// Storage Management
/**
 * @swagger
 * /admin/storage-stats:
 *   get:
 *     summary: Get disk storage statistics
 *     description: "[Allowed Role: admin] Overview of storage usage across different cases and temporary directories."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage statistics
 */
router.get('/storage-stats', getStorageStats);

/**
 * @swagger
 * /admin/storage-cases:
 *   get:
 *     summary: List cases by storage size
 *     description: "[Allowed Role: admin] List cases ordered by their disk footprint."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Case storage list
 */
router.get('/storage-cases', getStorageCases);

/**
 * @swagger
 * /admin/workflow/analytics:
 *   get:
 *     summary: Get workflow performance analytics
 *     description: "[Allowed Role: admin] Metrics on turnaround times, case volumes, and throughput."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workflow analytics
 */
router.get('/workflow/analytics', getWorkflowAnalytics);

/**
 * @swagger
 * /admin/workflow/sla:
 *   get:
 *     summary: Monitor SLA compliance
 *     description: "[Allowed Role: admin] Real-time tracking of cases nearing or exceeding SLA deadlines."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA monitoring data
 */
router.get('/workflow/sla', getSLAMonitoring);

/**
 * @swagger
 * /admin/workflow/alerts:
 *   get:
 *     summary: Get system workflow alerts
 *     description: "[Allowed Role: admin] List of active alerts regarding stuck cases or system issues."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System alerts
 */
router.get('/workflow/alerts', getSystemAlerts);

// Login Activity
/**
 * @swagger
 * /admin/login-activity:
 *   get:
 *     summary: Get login activity logs
 *     description: "[Allowed Role: admin] Track recent user logins and login failures."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Login activity data
 */
router.get('/login-activity', getLoginActivity);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *   post:
 *     summary: Create a new user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 */
router.route('/users')
    .get(getUsers)
    .post(createUser);

router.route('/users/:id')
    /**
     * @swagger
     * /admin/users/{id}:
     *   patch:
     *     summary: Update user details
     *     description: "[Allowed Role: admin] Update name, email, role, or status of a user."
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     requestBody:
     *       content:
     *         application/json:
     *           schema: { $ref: '#/components/schemas/User' }
     *     responses:
     *       200:
     *         description: User updated
     *   delete:
     *     summary: Delete a user
     *     description: "[Allowed Role: admin] Permanently remove a user from the system."
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: User deleted
     */
    .patch(updateUser)
    .delete(deleteUser);

/**
 * @swagger
 * /admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: "[Allowed Role: admin] Administratively reset a user's password."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/users/:id/reset-password', resetPassword);

/**
 * @swagger
 * /admin/security/settings:
 *   get:
 *     summary: Get system security settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security settings
 */
router.route('/security/settings')
    .get(getSecuritySettings)
    .patch(updateSecuritySettings);

/**
 * @swagger
 * /admin/security/logs:
 *   get:
 *     summary: Get system security logs
 *     description: "[Allowed Role: admin] Detailed logs of sensitive system operations and access."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security logs
 */
router.get('/security/logs', getSecurityLogs);

/**
 * @swagger
 * /admin/viewer/restrictions:
 *   get:
 *     summary: Get all viewer tool restrictions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Viewer tool restrictions
 *   post:
 *     summary: Update viewer tool restrictions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string }
 *               allowedTools: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Tool restrictions updated
 */
router.route('/viewer/restrictions')
    .get(getViewerRestrictions)
    .post(updateViewerRestrictions);

export default router;
