import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";
import {
    createApiKey,
    listApiKeys,
    updateApiKey,
    revokeApiKey,
} from "../controllers/apiKeyController.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(restrictTo("admin"));

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: Admin management of external partner API keys
 */

/**
 * @swagger
 * /admin/api-keys:
 *   post:
 *     summary: Create a new API key
 *     description: "[Admin only] Generates a new API key for an external partner. The raw key is returned once and never stored."
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerName]
 *             properties:
 *               partnerName: { type: string }
 *               scopes: { type: array, items: { type: string, enum: [read:cases, write:reports] } }
 *               expiresAt: { type: string, format: date-time }
 *               ipWhitelist: { type: string, description: "Comma-separated IPs" }
 *               rateLimit: { type: number, default: 100 }
 *     responses:
 *       201: { description: API key created with raw key (one-time) }
 *       400: { $ref: '#/components/responses/BadRequestError' }
 */
router.post("/", createApiKey);

/**
 * @swagger
 * /admin/api-keys:
 *   get:
 *     summary: List all API keys
 *     description: "[Admin only] Returns all API keys with metadata. Never returns the raw key."
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of API keys }
 */
router.get("/", listApiKeys);

/**
 * @swagger
 * /admin/api-keys/{id}:
 *   patch:
 *     summary: Update an API key
 *     description: "[Admin only] Update scopes, IP whitelist, rate limit, or active status."
 *     tags: [API Keys]
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
 *               scopes: { type: array, items: { type: string } }
 *               ipWhitelist: { type: string }
 *               rateLimit: { type: number }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: API key updated }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.patch("/:id", updateApiKey);

/**
 * @swagger
 * /admin/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     description: "[Admin only] Permanently deletes an API key. The partner loses access immediately."
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: API key revoked }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.delete("/:id", revokeApiKey);

export default router;
