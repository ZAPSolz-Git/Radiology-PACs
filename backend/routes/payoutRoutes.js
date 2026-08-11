import express from 'express';
import { 
    generatePayouts, 
    getAllPayouts, 
    getMyPayouts, 
    updatePayoutStatus, 
    downloadPayoutInvoice,
    getUnbilledCases,
    generateSelectedPayout
} from '../controllers/payoutController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import multer from 'multer';

const router = express.Router();

// Setup multer for memory storage for Payout receipts
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * @swagger
 * tags:
 *   name: Payouts
 *   description: Financial distributions for radiologists
 */

// Radiologist Route
/**
 * @swagger
 * /payouts/my-payouts:
 *   get:
 *     summary: Get radiologist's own payouts
 *     description: "[Allowed Role: radiologist] Retrieve payout history for the logged-in radiologist."
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of payouts, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Payout' } } } } }
 */
router.get('/my-payouts', protect, restrictTo('radiologist'), getMyPayouts);

// Shared Route
/**
 * @swagger
 * /payouts/{id}/invoice:
 *   get:
 *     summary: Download payout invoice
 *     description: "[Allowed Roles: admin, radiologist] Download the PDF invoice for a payout."
 *     tags: [Payouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: PDF file }
 */
router.get('/:id/invoice', protect, restrictTo('admin', 'radiologist'), downloadPayoutInvoice);

// Admin Routes
router.use(protect, restrictTo('admin'));

/**
 * @swagger
 * /payouts:
 *   get:
 *     summary: List all payouts
 *     description: "[Allowed Role: admin] Global view of all payouts."
 *     tags: [Payouts]
 *     responses:
 *       200: { description: List of payouts }
 */
router.get('/', getAllPayouts);

router.post('/generate', generatePayouts);

/**
 * @swagger
 * /payouts/unbilled:
 *   get:
 *     summary: Get all unbilled finalized cases grouped by doctor
 *     description: "[Allowed Role: admin] Aggregates cases that were finalized but haven't been assigned to a payout batch yet."
 *     tags: [Payouts]
 *     responses:
 *       200: { description: List of unbilled cases }
 */
router.get('/unbilled', getUnbilledCases);

/**
 * @swagger
 * /payouts/generate-selected:
 *   post:
 *     summary: Generate payout for a specific selection of cases
 *     description: "[Allowed Role: admin] Create a payout statement for an explicit list of Case IDs for a single radiologist."
 *     tags: [Payouts]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [radiologistId, caseIds]
 *             properties:
 *               radiologistId: { type: string }
 *               caseIds: { type: array, items: { type: string } }
 *               periodLabel: { type: string }
 *     responses:
 *       201: { description: Payout statement created }
 */
router.post('/generate-selected', generateSelectedPayout);

/**
 * @swagger
 * /payouts/{id}/pay:
 *   patch:
 *     summary: Update payout status and upload receipt
 *     description: "[Allowed Role: admin] Mark a payout as 'Paid' and attach a payment confirmation."
 *     tags: [Payouts]
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
 *               receipt: { type: string, format: binary }
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/:id/pay', upload.single('receipt'), updatePayoutStatus);

export default router;
