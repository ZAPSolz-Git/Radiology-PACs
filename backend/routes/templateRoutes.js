import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
} from "../controllers/templateController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Structured reporting templates for different modalities
 */

router.use(protect);

router.route("/")
    /**
     * @swagger
     * /templates:
     *   get:
     *     summary: Get all accessible templates
     *     description: "[Allowed Role: all authenticated] Retrieve personal and public reporting templates."
     *     tags: [Templates]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: List of templates, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Template' } } } } }
     *   post:
     *     summary: Create a new template
     *     description: "[Allowed Roles: radiologist, admin] Define a new report template."
     *     tags: [Templates]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content: { application/json: { schema: { $ref: '#/components/schemas/Template' } } }
     *     responses:
     *       201: { description: Template created }
     */
    .get(getTemplates)
    .post(createTemplate);

router.route("/:id")
    /**
     * @swagger
     * /templates/{id}:
     *   put:
     *     summary: Update a template
     *     description: "[Allowed Role: radiologist, admin] Modify an existing template."
     *     tags: [Templates]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200: { description: Updated }
     *   delete:
     *     summary: Delete a template
     *     description: "[Allowed Role: radiologist, admin] Remove a template."
     *     tags: [Templates]
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
    .put(updateTemplate)
    .delete(deleteTemplate);

export default router;
