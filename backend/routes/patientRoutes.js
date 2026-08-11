import express from "express";
import { getPatients, createOrUpdatePatient } from "../controllers/patientController.js";
import { protect } from "../middleware/authMiddleware.js";

import { validate } from "../middleware/validationMiddleware.js";
import { createPatientSchema } from "../schemas/patientSchemas.js";

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Patient information management
 */

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: Get all patients
 *     description: Retrieve a list of all registered patients.
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Patient' } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.get("/", getPatients);

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Create or update a patient
 *     description: "[Allowed Roles: technician, admin] Create a new patient record or update an existing one based on Patient ID."
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Patient' }
 *     responses:
 *       200:
 *         description: Patient record created or updated
 *       400: { $ref: '#/components/responses/BadRequestError' }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.post("/", validate(createPatientSchema), createOrUpdatePatient);

export default router;
