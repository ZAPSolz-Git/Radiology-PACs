import mongoose from "mongoose";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import Payout from "../models/Payout.js";
import Case from "../models/Case.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import { generatePayoutPDF } from "../utils/payoutPdfUtils.js";

/**
 * @desc    Generate monthly payouts for all radiologists
 * @route   POST /api/payouts/generate
 * @access  Private (Admin)
 */
export const generatePayouts = asyncHandler(async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        throw new AppError("Month and year are required", HTTP_STATUS.BAD_REQUEST);
    }

    const periodStr = `${month.toString().padStart(2, '0')}-${year}`;

    // Use report.finalizedAt (not updatedAt) so the date filter is stable.
    // updatedAt changes whenever any field on the case is touched (e.g. when invoiceId is stamped),
    // which would silently drop cases finalized in a prior month from subsequent payout runs.
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const unbilledCases = await Case.find({
        status: "Finalized",
        "report.finalizedAt": { $gte: startDate, $lt: endDate },
        "billingInfo.payoutId": { $exists: false },
        "billingInfo.radiologistEarning": { $gt: 0 }  // exclude ₹0-locked cases (no tariff match at finalization)
    }).populate("assignedRadiologist");

    if (unbilledCases.length === 0) {
        return sendSuccess(res, HTTP_STATUS.OK, "No unbilled cases found for radiologists", []);
    }

    // Group cases by Radiologist
    const groupedByDoctor = unbilledCases.reduce((acc, kase) => {
        if (!kase.assignedRadiologist) return acc;

        const docId = kase.assignedRadiologist._id.toString();
        if (!acc[docId]) {
            acc[docId] = {
                doctor: kase.assignedRadiologist,
                cases: [],
                totalAmount: 0
            };
        }
        acc[docId].cases.push(kase);
        acc[docId].totalAmount += (kase.billingInfo?.radiologistEarning || 0);
        return acc;
    }, {});

    const generatedPayouts = [];

    // Wrap all creates + case-links in a single transaction so a mid-loop crash
    // cannot leave some doctors paid and others silently skipped.
    let session;
    try {
        session = await mongoose.startSession();
    } catch (err) {
        console.error("CRITICAL: Payout transaction attempted but sessions are not supported on this instance.", err);
        throw new AppError("CRITICAL: System cannot guarantee payout atomicity on this database configuration. Contact Administrator to enable Replica Sets.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    try {
        session.startTransaction();

        for (const docId in groupedByDoctor) {
            const group = groupedByDoctor[docId];

            const payoutCount = await Payout.countDocuments();
            const payoutId = `PAY-${year}${month.toString().padStart(2, '0')}-${(payoutCount + 1).toString().padStart(3, '0')}`;

            const [payout] = await Payout.create([{
                radiologist: docId,
                payoutId,
                period: periodStr,
                amount: group.totalAmount,
                status: "Pending",
                cases: group.cases.map(c => c._id),
                caseCount: group.cases.length,
                generatedBy: req.user._id
            }], { session });

            await Case.updateMany(
                { _id: { $in: group.cases.map(c => c._id) } },
                { $set: { "billingInfo.payoutId": payout._id } },
                { session }
            );

            generatedPayouts.push(payout);
        }

        await session.commitTransaction();
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error("[Payout] Bulk transaction failed, rolled back:", error);
        throw error;
    } finally {
        if (session) session.endSession();
    }

    return sendSuccess(res, HTTP_STATUS.CREATED, `Generated ${generatedPayouts.length} payouts`, generatedPayouts);
});

/**
 * @desc    Get all finalized cases grouped by radiologist that haven't been billed yet
 * @route   GET /api/payouts/unbilled
 * @access  Private (Admin)
 */
export const getUnbilledCases = asyncHandler(async (req, res) => {
    const unbilledByRadiologist = await Case.aggregate([
        {
            $match: {
                status: "Finalized",
                "billingInfo.payoutId": { $exists: false }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedRadiologist",
                foreignField: "_id",
                as: "radiologist"
            }
        },
        { $unwind: { path: "$radiologist", preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: "$assignedRadiologist",
                radiologist: { $first: "$radiologist" },
                cases: { $push: "$$ROOT" },
                totalAmount: { $sum: "$billingInfo.radiologistEarning" },
                caseCount: { $sum: 1 }
            }
        },
        {
            $project: {
                "radiologist.password": 0,
                "radiologist.__v": 0,
                "radiologist.tokens": 0
            }
        },
        { $sort: { "radiologist.name": 1 } }
    ]);

    return sendSuccess(res, HTTP_STATUS.OK, "Unbilled cases fetched successfully", unbilledByRadiologist);
});

/**
 * @desc    Generate payout for specifically selected cases
 * @route   POST /api/payouts/generate-selected
 * @access  Private (Admin)
 */
export const generateSelectedPayout = asyncHandler(async (req, res) => {
    const { radiologistId, caseIds, periodLabel } = req.body;

    if (!radiologistId || !caseIds || !caseIds.length) {
        throw new AppError("Radiologist and case selection are required", HTTP_STATUS.BAD_REQUEST);
    }

    // Step 1 & 2: Race condition & Ownership check
    const cases = await Case.find({ _id: { $in: caseIds } });
    
    if (cases.length !== caseIds.length) {
        throw new AppError("One or more selected cases could not be found", HTTP_STATUS.BAD_REQUEST);
    }

    const hasInvalidCases = cases.some(c => 
        c.assignedRadiologist?.toString() !== radiologistId || 
        c.billingInfo?.payoutId || 
        c.status !== "Finalized"
    );

    if (hasInvalidCases) {
        throw new AppError("Invalid selection: Some cases are already billed, assigned to another doctor, or not finalized.", HTTP_STATUS.BAD_REQUEST);
    }

    const totalAmount = cases.reduce((sum, c) => sum + (c.billingInfo?.radiologistEarning || 0), 0);

    // Step 3: Transactional Update
    let session;
    try {
        session = await mongoose.startSession();
    } catch (err) {
        // Explicitly block if transactions are not supported (e.g. standalone Mongo)
        console.error("CRITICAL: Financial Transaction attempted but sessions/transactions are not supported on this instance.", err);
        throw new AppError("CRITICAL: System cannot guarantee payment atomicity on this database configuration. Contact Administrator to enable Replica Sets.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    try {
        session.startTransaction();

        // Create payout
        const payoutCount = await Payout.countDocuments();
        const now = new Date();
        const payoutId = `PAY-SEL-${format(now, 'yyyyMMdd')}-${(payoutCount + 1).toString().padStart(3, '0')}`;

        const payoutResults = await Payout.create([{
            radiologist: radiologistId,
            payoutId,
            period: periodLabel || "Custom Payout",
            amount: totalAmount,
            status: "Pending",
            cases: caseIds,
            caseCount: caseIds.length,
            generatedBy: req.user._id
        }], { session });

        const payout = payoutResults[0];

        // Link cases to payout
        await Case.updateMany(
            { _id: { $in: caseIds } },
            { $set: { "billingInfo.payoutId": payout._id } },
            { session }
        );

        await session.commitTransaction();
        return sendSuccess(res, HTTP_STATUS.CREATED, "Selection-based payout created successfully", payout);
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error("[Payout] Transaction failed:", error);
        throw error;
    } finally {
        if (session) session.endSession();
    }
});

/**
 * @desc    Get all payouts
 * @route   GET /api/payouts
 * @access  Private (Admin)
 */
export const getAllPayouts = asyncHandler(async (req, res) => {
    const payouts = await Payout.find()
        .populate("radiologist", "name email")
        .sort({ createdAt: -1 });
    return sendSuccess(res, HTTP_STATUS.OK, "Payouts fetched successfully", payouts);
});

/**
 * @desc    Get my payouts
 * @route   GET /api/payouts/my-payouts
 * @access  Private (Radiologist)
 */
export const getMyPayouts = asyncHandler(async (req, res) => {
    const payouts = await Payout.find({ radiologist: req.user._id })
        .sort({ createdAt: -1 });
    return sendSuccess(res, HTTP_STATUS.OK, "My payouts fetched successfully", payouts);
});

/**
 * @desc    Mark Payout as Paid (with attachment)
 * @route   PATCH /api/payouts/:id/pay
 * @access  Private (Admin)
 */
export const updatePayoutStatus = asyncHandler(async (req, res) => {
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
        throw new AppError("Payout not found", HTTP_STATUS.NOT_FOUND);
    }

    // Instead of throwing if paid, we allow adding more receipts to the same payout batch
    // Update status to Paid if it isn't already
    if (payout.status !== 'Paid') {
        payout.status = 'Paid';
        payout.paidAt = new Date();
    }

    // Handle Attachment Upload and appending to the attachments array
    if (req.file) {
        const uploadDir = path.join("uploads", "payouts");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `receipt_${payout._id}_${Date.now()}${path.extname(req.file.originalname)}`;
        const filePath = path.join(uploadDir, fileName);
        
        fs.writeFileSync(filePath, req.file.buffer);

        if (!payout.attachments) payout.attachments = [];

        payout.attachments.push({
            url: `/uploads/payouts/${fileName}`,
            name: req.file.originalname,
            uploadedAt: new Date()
        });
    }

    await payout.save();

    return sendSuccess(res, HTTP_STATUS.OK, "Payout receipt added successfully", payout);
});

/**
 * @desc    Download Detailed Invoice PDF
 * @route   GET /api/payouts/:id/invoice
 * @access  Private (Admin/Radiologist)
 */
export const downloadPayoutInvoice = asyncHandler(async (req, res) => {
    const payout = await Payout.findById(req.params.id)
        .populate("radiologist", "name email institution")
        .populate({
            path: "cases",
            select: "patientName studyDate modality bodyPart urgency billingInfo",
        });

    if (!payout) {
        throw new AppError("Payout not found", HTTP_STATUS.NOT_FOUND);
    }

    // Role check
    if (req.user.role === 'radiologist' && payout.radiologist._id.toString() !== req.user._id.toString()) {
        throw new AppError("Unauthorized to download this payout invoice", HTTP_STATUS.FORBIDDEN);
    }

    const pdfBytes = await generatePayoutPDF(payout);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payout_Invoice_${payout.period}_${payout.radiologist.name.replace(/\s+/g, '_')}.pdf"`);
    res.send(Buffer.from(pdfBytes));
});
