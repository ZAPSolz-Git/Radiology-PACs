import express from "express";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getMe,
  getRadiologists,
  logoutAllDevices,
  updateUserSignature,
} from "../controllers/authControllers.js";
import { validate } from "../middleware/validationMiddleware.js";
import { registerSchema, loginSchema } from "../schemas/authSchemas.js";
import { protect } from "../middleware/authMiddleware.js";
import { getViewerRestrictions } from "../controllers/securityControllers.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [technician, qa, radiologist, admin] }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { $ref: '#/components/responses/BadRequestError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.post("/register", validate(registerSchema), registerUser);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.post("/login", validate(loginSchema), loginUser);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token generated
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.post("/refresh", refreshAccessToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", protect, logoutUser);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 */
router.post("/logout-all", protect, logoutAllDevices);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.get("/me", protect, getMe);

/**
 * @swagger
 * /auth/radiologists:
 *   get:
 *     summary: Get list of all radiologists
 *     description: Retrieve all users with the 'radiologist' role for assignment purposes.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of radiologists
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.get("/radiologists", protect, getRadiologists);

/**
 * @swagger
 * /auth/signature:
 *   post:
 *     summary: Update radiologist signature
 *     description: "[Allowed Role: radiologist] Upload or change the digital signature used on reports."
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signature: { type: string, description: "Base64 or image URL" }
 *     responses:
 *       200:
 *         description: Signature updated
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       500: { $ref: '#/components/responses/InternalError' }
 */
router.post("/signature", protect, updateUserSignature);

/**
 * @swagger
 * /auth/viewer-restrictions:
 *   get:
 *     summary: Get viewer tool restrictions
 *     description: Retrieve tool restrictions configuration to apply in OHIF viewer.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Viewer tool restrictions configuration
 */
router.get("/viewer-restrictions", protect, getViewerRestrictions);

export default router;