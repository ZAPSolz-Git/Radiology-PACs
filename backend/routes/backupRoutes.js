import express from "express";
import {
    getAllBackups,
    getBackupStats,
    triggerManualBackup,
    downloadBackup,
    deleteBackup,
    getComplianceStats,
} from "../controllers/backupController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Database backups and system compliance
 */

// All routes require admin access
router.use(protect, restrictTo("admin"));

/**
 * @swagger
 * /backups:
 *   get:
 *     summary: List all system backups
 *     description: "[Allowed Role: admin] Retrieve history of automated and manual backups."
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of backups, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Backup' } } } } }
 */
router.get("/", getAllBackups);

/**
 * @swagger
 * /backups/stats:
 *   get:
 *     summary: Get backup storage statistics
 *     description: "[Allowed Role: admin] Total backup size and success rates."
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Stats }
 */
router.get("/stats", getBackupStats);

/**
 * @swagger
 * /backups/compliance:
 *   get:
 *     summary: Get data retention compliance stats
 *     description: "[Allowed Role: admin] Verify if current backups meet regulatory standards."
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Compliance data }
 */
router.get("/compliance", getComplianceStats);

/**
 * @swagger
 * /backups/trigger:
 *   post:
 *     summary: Trigger manual backup
 *     description: "[Allowed Role: admin] Start an immediate database dump and cloud upload."
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Backup started }
 */
router.post("/trigger", triggerManualBackup);

/**
 * @swagger
 * /backups/{id}/download:
 *   get:
 *     summary: Download backup archive
 *     description: "[Allowed Role: admin] Retrieve a specific ZIP/TAR backup file."
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Backup file stream }
 */
router.get("/:id/download", downloadBackup);

/**
 * @swagger
 * /backups/{id}:
 *   delete:
 *     summary: Delete a backup
 *     description: "[Allowed Role: admin] Permanently remove a backup record and storage file."
 *     tags: [Maintenance]
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
router.delete("/:id", deleteBackup);

export default router;
