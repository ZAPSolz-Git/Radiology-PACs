import express from "express";
import multer from "multer";
import { getBanners, getAllBanners, createBanner, updateBanner, deleteBanner } from "../controllers/bannerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for banners
});

/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: System-wide announcement and marketing banners
 */

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get active banners
 *     description: "[Allowed Role: all authenticated] Retrieve all currently active banners for display."
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of active banners, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Banner' } } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *   post:
 *     summary: Create a new banner
 *     description: "[Allowed Roles: admin, qa] Upload an image and create a new banner."
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               isActive: { type: boolean }
 *               bannerImage: { type: string, format: binary }
 *     responses:
 *       201: { description: Banner created }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get("/", getBanners);

/**
 * @swagger
 * /banners/all:
 *   get:
 *     summary: List all banners (Admin/QA)
 *     description: "[Allowed Roles: admin, qa] Retrieve all banners, including inactive ones."
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of all banners }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get("/all", restrictTo("admin", "qa"), getAllBanners);

router.post("/", restrictTo("admin", "qa"), upload.single('bannerImage'), createBanner);

/**
 * @swagger
 * /banners/{id}:
 *   patch:
 *     summary: Update a banner
 *     description: "[Allowed Roles: admin, qa] Modify an existing banner and optional image replacement."
 *     tags: [Banners]
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
 *               title: { type: string }
 *               description: { type: string }
 *               isActive: { type: boolean }
 *               bannerImage: { type: string, format: binary }
 *     responses:
 *       200: { description: Updated }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *   delete:
 *     summary: Delete a banner
 *     description: "[Allowed Roles: admin, qa] Permanently remove a banner."
 *     tags: [Banners]
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
router.patch("/:id", restrictTo("admin", "qa"), upload.single('bannerImage'), updateBanner);
router.delete("/:id", restrictTo("admin", "qa"), deleteBanner);

export default router;
