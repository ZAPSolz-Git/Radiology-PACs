import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    getMacros,
    createMacro,
    updateMacro,
    deleteMacro
} from "../controllers/macroController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Macros
 *   description: Radiologist personal rapid-text expansions
 */

router.use(protect);

router.route("/")
    /**
     * @swagger
     * /macros:
     *   get:
     *     summary: Get all personal macros
     *     description: "[Allowed Role: all authenticated] Retrieve rapid-text expansions for the current user."
     *     tags: [Macros]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: List of macros, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Macro' } } } } }
     *   post:
     *     summary: Create a new macro
     *     description: "[Allowed Role: all authenticated] Define a new shortcut key and its expansion."
     *     tags: [Macros]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content: { application/json: { schema: { $ref: '#/components/schemas/Macro' } } }
     *     responses:
     *       201: { description: Macro created }
     */
    .get(getMacros)
    .post(createMacro);

router.route("/:id")
    /**
     * @swagger
     * /macros/{id}:
     *   put:
     *     summary: Update a macro
     *     description: "[Allowed Role: all authenticated] Modify an existing macro."
     *     tags: [Macros]
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
     *     summary: Delete a macro
     *     description: "[Allowed Role: all authenticated] Remove a macro."
     *     tags: [Macros]
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
    .put(updateMacro)
    .delete(deleteMacro);

export default router;
