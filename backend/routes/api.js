import express from "express";
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: System
 *   description: Core system health and versioning
 */

/**
 * @swagger
 * /hello:
 *   get:
 *     summary: API health check
 *     description: Simple endpoint to verify backend connectivity.
 *     tags: [System]
 *     responses:
 *       200: { description: Success }
 */
router.get("/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

export default router;
