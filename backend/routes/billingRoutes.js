import express from "express";
import * as billingController from "../controllers/billingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All billing routes require authentication
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Financial management, tariffs, and invoices
 */

// --- TARIFF MANAGEMENT (Admin Only) ---
/**
 * @swagger
 * /billing/tariffs:
 *   get:
 *     summary: List all tariffs
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tariffs
 */
router.route("/tariffs")
    /**
     * @swagger
     * /billing/tariffs:
     *   get:
     *     summary: List all tariffs
     *     description: "[Allowed Role: admin] Retrieve all configured billing tariffs."
     *     tags: [Billing]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of tariffs
     *   post:
     *     summary: Create a new tariff
     *     description: "[Allowed Role: admin] Manually create a new billing tariff."
     *     tags: [Billing]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       content:
     *         application/json:
     *           schema: { type: object }
     *     responses:
     *       201:
     *         description: Tariff created
     */
    .get(restrictTo("admin"), billingController.getTariffs)
    .post(restrictTo("admin"), billingController.createTariff);

/**
 * @swagger
 * /billing/tariffs/bulk:
 *   post:
 *     summary: Bulk create tariffs
 *     description: "[Allowed Role: admin] Upload multiple tariffs at once."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tariffs created
 */
router.post("/tariffs/bulk", restrictTo("admin"), billingController.bulkCreateTariffs);

/**
 * @swagger
 * /billing/tariffs/test-match:
 *   post:
 *     summary: Test tariff matching logic
 *     description: "[Allowed Role: admin] Test which tariff matches a set of case parameters."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Matching result
 */
router.post("/tariffs/test-match", restrictTo("admin"), billingController.testTariffMatch);

router.route("/tariffs/:id")
    /**
     * @swagger
     * /billing/tariffs/{id}:
     *   patch:
     *     summary: Update a tariff
     *     description: "[Allowed Role: admin] Modify an existing tariff configuration."
     *     tags: [Billing]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Tariff updated
     *   delete:
     *     summary: Delete a tariff
     *     description: "[Allowed Role: admin] Remove a tariff from the system."
     *     tags: [Billing]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Tariff deleted
     */
    .patch(restrictTo("admin"), billingController.updateTariff)
    .delete(restrictTo("admin"), billingController.deleteTariff);

// --- INVOICE MANAGEMENT ---

/**
 * @swagger
 * /billing/invoices:
 *   get:
 *     summary: List all invoices (Admin)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices
 */
/**
 * @swagger
 * /billing/invoices/generate:
 *   post:
 *     summary: Generate monthly invoices
 *     description: "[Allowed Role: admin] Trigger the creation of monthly invoices for all institutions."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoices generated
 */
router.post("/invoices/generate", restrictTo("admin"), billingController.generateInvoices);

/**
 * @swagger
 * /billing/invoices:
 *   get:
 *     summary: List all invoices
 *     description: "[Allowed Role: admin] Retrieve all invoices across the system."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Invoice' } }
 */
router.get("/invoices", restrictTo("admin"), billingController.getAllInvoices);

/**
 * @swagger
 * /billing/invoices/{id}/details:
 *   get:
 *     summary: Get invoice details
 *     description: "[Allowed Role: admin] Retrieve detailed breakdown of an invoice."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invoice details
 */
router.get("/invoices/:id/details", restrictTo("admin"), billingController.getInvoiceDetails);

/**
 * @swagger
 * /billing/invoices/{id}/status:
 *   patch:
 *     summary: Update invoice status
 *     description: "[Allowed Role: admin] Mark an invoice as paid or partially paid."
 *     tags: [Billing]
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
 *               status: { type: string, enum: [pending, paid, partial] }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/invoices/:id/status", restrictTo("admin"), billingController.updateInvoiceStatus);

// Technician: View my own invoices
/**
 * @swagger
 * /billing/my-invoices:
 *   get:
 *     summary: Get technician's own invoices
 *     description: "[Allowed Role: technician] Retrieve invoices specific to the logged-in technician/institution."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of technician invoices
 */
router.get("/my-invoices", restrictTo("technician"), billingController.getMyInvoices);

/**
 * @swagger
 * /billing/invoices/{id}/download:
 *   get:
 *     summary: Download invoice PDF
 *     description: "[Allowed Roles: admin, technician] Generate and download a PDF version of the invoice."
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file stream
 */
router.get("/invoices/:id/download", restrictTo("admin", "technician"), billingController.downloadInvoice);

export default router;
