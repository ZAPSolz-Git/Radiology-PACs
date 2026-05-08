import express from "express";
import {
    getSites,
    createSite,
    updateSite,
    deleteSite,
    testConnection,
    searchPACS,
    importFromPACS,
    importStudyFromPACS,
    getServerInfo,
    exportToPACS,
    getPacsReceived,
    getScpStatus,
} from "../controllers/pacsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Generate temp dir once per request so all files land in the same folder
        if (!req._pacsExportTempDir) {
            req._pacsExportTempDir = path.join('uploads', 'temp', `pacs_export_${Date.now()}`);
        }
        const tempDir = req._pacsExportTempDir;
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

/**
 * @swagger
 * tags:
 *   name: PACS
 *   description: Digital Imaging and Communications in Medicine (DICOM) system integration
 */

// All PACS routes require authentication
router.use(protect);

// ─── Site Management (Admin only) ─────────────────────────────────────────────
/**
 * @swagger
 * /pacs/sites:
 *   get:
 *     summary: Get all hospital sites
 *     description: "[Allowed Roles: technician, admin, qa] List all configured PACS sites."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Success, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Site' } } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 *   post:
 *     summary: Create a new hospital site
 *     description: "[Allowed Roles: technician, admin] Configure a new PACS connection."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Site' } } }
 *     responses:
 *       201: { description: Site created }
 */
router.get("/sites", restrictTo("technician", "admin", "qa"), getSites);
router.post("/sites", restrictTo("technician", "admin"), createSite);

/**
 * @swagger
 * /pacs/sites/{siteId}:
 *   put:
 *     summary: Update a site
 *     description: "[Allowed Roles: technician, admin] Update PACS connectivity settings."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     summary: Delete a site
 *     description: "[Allowed Roles: technician, admin] Remove a PACS configuration."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.put("/sites/:siteId", restrictTo("technician", "admin"), updateSite);
router.delete("/sites/:siteId", restrictTo("technician", "admin"), deleteSite);

// ─── Connectivity Test ────────────────────────────────────────────────────────
/**
 * @swagger
 * /pacs/test-connection:
 *   post:
 *     summary: Test PACS connectivity
 *     description: "[Allowed Roles: technician, admin] Perform a C-ECHO or Ping test to a site."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Connection successful }
 */
router.post("/test-connection", restrictTo("technician", "admin"), testConnection);

// ─── DICOM Operations ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /pacs/search:
 *   get:
 *     summary: Search remote PACS
 *     description: "[Allowed Roles: technician, admin] Perform a C-FIND query on a selected site."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: patientName
 *         schema: { type: string }
 *     responses:
 *       200: { description: Search results }
 */
router.get("/search", restrictTo("technician", "admin"), searchPACS);

/**
 * @swagger
 * /pacs/import:
 *   post:
 *     summary: Import study from PACS
 *     description: "[Allowed Roles: technician, admin] Trigger a C-MOVE / C-STORE operation."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Import started }
 */
router.post("/import", restrictTo("technician", "admin"), importFromPACS);
router.post("/import-study", restrictTo("technician", "admin"), importStudyFromPACS);

// ─── PACS Export ──────────────────────────────────────────────────────────────
/**
 * @swagger
 * /pacs/export:
 *   post:
 *     summary: Export to PACS
 *     description: "[Allowed Roles: technician, admin] Push DICOM files to a remote destination."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Export complete }
 */
router.post("/export", restrictTo("technician", "admin"), upload.array('dicomFiles'), exportToPACS);

// ─── System Information ──────────────────────────────────────────────────────
/**
 * @swagger
 * /pacs/server-info:
 *   get:
 *     summary: Get local PACS server info
 *     description: "[Allowed Roles: technician, admin] Retrieve local AE Title and IP settings."
 *     tags: [PACS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Server info }
 */
router.get("/server-info", restrictTo("technician", "admin"), getServerInfo);

// ─── PACS Received ────────────────────────────────────────────────────────────
router.get("/received", restrictTo("technician", "admin"), getPacsReceived);
router.get("/scp-status", restrictTo("technician", "admin"), getScpStatus);

export default router;