import express from "express";
import multer from "multer";
import { uploadCase, getCases, assignCase, getCaseById, getCaseMetadata, deleteCase, submitCase, updateCase, resolveRejection, addAttachment, exportCaseZip, getDeleteImpact, serveUploadedFile } from "../controllers/caseController.js";
import { getCaseTimeline } from "../controllers/timelineController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure Multer for Disk Storage (Prevents RAM saturation for large studies)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!req._tempDir) {
            req._tempDir = path.join('uploads', 'temp', Date.now().toString());
            fs.mkdirSync(req._tempDir, { recursive: true });
        }
        cb(null, req._tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

// Protect all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Cases
 *   description: Radiology case management
 */

// Routes
/**
 * @swagger
 * /cases:
 *   get:
 *     summary: Get all cases
 *     description: Retrieve a list of cases with optional filtering.
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by case status
 *       - in: query
 *         name: urgency
 *         schema: { type: string, enum: [Routine, STAT] }
 *     responses:
 *       200:
 *         description: List of cases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Case' } }
 */
router.route("/")
    .get(getCases);

/**
 * @swagger
 * /cases/{id}:
 *   get:
 *     summary: Get a case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Case' }
 */
router.route("/:id")
    .get(getCaseById)
    /**
     * @swagger
     * /cases/{id}:
     *   put:
     *     summary: Update case details
     *     description: "[Allowed Roles: technician, admin, qa] Update metadata or add/edit attachments for an existing case."
     *     tags: [Cases]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     requestBody:
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               attachments:
     *                 type: array
     *                 items: { type: string, format: binary }
     *               clinicalHistory: { type: string }
     *               indication: { type: string }
     *     responses:
     *       200:
     *         description: Case updated
     *         content:
     *           application/json:
     *             schema: { $ref: '#/components/schemas/Case' }
     *       401: { $ref: '#/components/responses/UnauthorizedError' }
     *       403: { $ref: '#/components/responses/ForbiddenError' }
     *       404: { $ref: '#/components/responses/NotFoundError' }
     *       500: { $ref: '#/components/responses/InternalError' }
     *   delete:
     *     summary: Delete a case
     *     description: "[Allowed Roles: technician, admin] Permanently delete a case and its associated files."
     *     tags: [Cases]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Case deleted
     *       403: { $ref: '#/components/responses/ForbiddenError' }
     */
    .put(
        restrictTo("technician", "admin", "qa"),
        upload.fields([{ name: 'attachments' }]), // Allow editing/adding attachments
        updateCase
    )
    .delete(restrictTo("technician", "admin"), deleteCase);

/**
 * @swagger
 * /cases/{id}/attachments:
 *   post:
 *     summary: Add an attachment to a case
 *     description: "[Allowed Roles: technician, admin, radiologist] Upload a single clinical document or image."
 *     tags: [Cases]
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
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Attachment added
 *       400: { $ref: '#/components/responses/BadRequestError' }
 */
router.route("/:id/attachments")
    .post(
        restrictTo("technician", "admin", "radiologist"),
        upload.single('file'),
        addAttachment
    );

/**
 * @swagger
 * /cases/{id}/timeline:
 *   get:
 *     summary: Get case timeline
 *     description: Retrieve the history of actions taken on a case.
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case timeline
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.route("/:id/timeline")
    .get(getCaseTimeline);

/**
 * @swagger
 * /cases/{id}/metadata:
 *   get:
 *     summary: Get DICOM metadata
 *     description: Retrieve cached DICOM metadata for a case.
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: DICOM metadata
 */
router.route("/:id/metadata")
    .get(cacheMiddleware(3600), getCaseMetadata); // Cache metadata for 1 hour

/**
 * @swagger
 * /cases/{id}/export:
 *   get:
 *     summary: Export case as ZIP
 *     description: "[Allowed Roles: admin, technician, radiologist, qa] Download all DICOM files and attachments as a ZIP archive."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: ZIP file stream
 */
router.route("/:id/export")
    .get(restrictTo("admin", "technician", "radiologist", "qa"), exportCaseZip);

/**
 * @swagger
 * /cases/{id}/delete-impact:
 *   get:
 *     summary: Get deletion impact
 *     description: "[Allowed Role: admin] Analyze what files and database records will be affected by deleting this case."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deletion impact analysis
 */
router.route("/:id/delete-impact")
    .get(restrictTo("admin"), getDeleteImpact);

/**
 * @swagger
 * /cases/upload:
 *   post:
 *     summary: Upload a new radiology case
 *     description: Upload DICOM files and optional attachments.
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               patientName: { type: string }
 *               patientId: { type: string }
 *               modality: { type: string }
 *               bodyPart: { type: string }
 *     responses:
 *       201:
 *         description: Case created successfully
 */
router.route("/upload")
    .post(
        restrictTo("technician", "admin"), // Technicians upload, Admin can too for testing
        upload.fields([{ name: 'files', maxCount: 1000 }, { name: 'images', maxCount: 50 }, { name: 'attachments', maxCount: 20 }]),
        uploadCase
    );

/**
 * @swagger
 * /cases/upload/pacs-callback:
 *   post:
 *     summary: PACS integration callback
 *     description: System-to-system callback for incoming PACS transfers.
 *     tags: [Cases]
 *     responses:
 *       200:
 *         description: Callback received successfully
 */
router.route("/upload/pacs-callback")
    .post(
        // This is a system-to-system call, might need different auth but using protect for now
        // Ideally uses a Site-Secret or API Key
        // restrictTo("gateway"), 
        uploadCase // We can reuse uploadCase if the gateway sends a standard multipart request
    );

/**
 * @swagger
 * /cases/{id}/assign:
 *   patch:
 *     summary: Assign radiologist to case
 *     description: "[Allowed Roles: admin, qa] Assign a specific radiologist to review this case."
 *     tags: [Cases]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               radiologistId: { type: string }
 *     responses:
 *       200:
 *         description: Case assigned
 */
router.route("/:id/assign")
    .patch(
        restrictTo("admin", "qa"),
        assignCase
    );

/**
 * @swagger
 * /cases/{id}/submit:
 *   post:
 *     summary: Submit case for QA
 *     description: "[Allowed Role: technician] Finalize preparation and submit the case for quality assurance."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case submitted
 */
router.route("/:id/submit")
    .post(
        restrictTo("technician"),
        submitCase
    );

/**
 * @swagger
 * /cases/{id}/resolve:
 *   patch:
 *     summary: Resolve rejection
 *     description: "[Allowed Roles: technician, qa] Resolve a rejected case after fixing issues."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rejection resolved
 */
router.route("/:id/resolve")
    .patch(
        restrictTo("technician", "qa"),
        resolveRejection
    );

import { validateCaseIntegrity } from "../controllers/caseController.js";
/**
 * @swagger
 * /cases/{id}/validate:
 *   post:
 *     summary: Validate case integrity
 *     description: "[Allowed Roles: technician, admin, qa] Run automated checks for DICOM integrity."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Validation complete
 */
router.route("/:id/validate")
    .post(
        restrictTo("technician", "admin", "qa"),
        validateCaseIntegrity
    );


// DICOM Management (QA Only)
import { deleteDicomFrame, replaceDicomFrame, insertDicomFrame } from "../controllers/caseController.js";

/**
 * @swagger
 * /cases/{id}/images/{sopUid}:
 *   delete:
 *     summary: Delete DICOM frame
 *     description: "[Allowed Roles: qa, admin] Remove a specific image frame from the study."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sopUid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Image deleted
 */
router.route("/:id/images/:sopUid")
    .delete(restrictTo("qa", "admin"), deleteDicomFrame);

/**
 * @swagger
 * /cases/{id}/images/{sopUid}/replace:
 *   patch:
 *     summary: Replace DICOM frame
 *     description: "[Allowed Roles: qa, admin] Swap an existing frame with a new file."
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sopUid
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Image replaced
 */
router.route("/:id/images/:sopUid/replace")
    .patch(
        restrictTo("qa", "admin"),
        upload.single('file'),
        replaceDicomFrame
    );

/**
 * @swagger
 * /cases/{id}/images/insert:
 *   post:
 *     summary: Insert new DICOM frame
 *     description: "[Allowed Roles: qa, admin] Add a new image frame into the study."
 *     tags: [Cases]
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
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Image inserted
 */
router.route("/:id/images/insert")
    .post(
        restrictTo("qa", "admin"),
        upload.single('file'),
        insertDicomFrame
    );




// Protect every file request — unauthenticated browsers get 401, not the raw file
router.use(protect);

/**
 * @swagger
 * /uploads/cases/{studyUID}/{folder}/{filename}:
 *   get:
 *     summary: Serve a protected uploaded file
 *     description: Authenticated route to stream DICOM or attachment files.
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studyUID
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: folder
 *         required: true
 *         schema: { type: string, enum: [dicom, attachments] }
 *       - in: path
 *         name: filename
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File stream
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/cases/:studyUID/:folder/:filename', serveUploadedFile);

export default router;
