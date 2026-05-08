import Tariff from "../models/Tariff.js";
import Invoice from "../models/Invoice.js";
import Case from "../models/Case.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import { HTTP_STATUS } from "../constants/index.js";
import { findMatchingTariff, calculateCaseEarning } from "../utils/billingUtils.js";
import { generateInvoicePDF } from "../utils/invoicePdfUtils.js";

/**
 * @desc    Get all tariff rules
 * @route   GET /api/billing/tariffs
 * @access  Private (Admin)
 */
export const getTariffs = asyncHandler(async (req, res) => {
    const tariffs = await Tariff.find().sort({ modality: 1, studyType: 1 });
    return sendSuccess(res, HTTP_STATUS.OK, "Tariffs fetched successfully", tariffs);
});

/**
 * @desc    Create a new tariff rule
 * @route   POST /api/billing/tariffs
 * @access  Private (Admin)
 */
export const createTariff = asyncHandler(async (req, res) => {
    const { modality, studyType, basePrice, emergencySurcharge, nightHolidaySurcharge, targetHospitalId, targetRadiologistId, isActive } = req.body;

    // Check if a rule already exists for this combination
    const existingRule = await Tariff.findOne({
        modality,
        studyType,
        targetHospitalId: targetHospitalId || null,
        targetRadiologistId: targetRadiologistId || null
    });
    if (existingRule) {
        throw new AppError("A pricing rule already exists for this combination of modality, study type, hospital, and radiologist", HTTP_STATUS.BAD_REQUEST);
    }

    const tariff = await Tariff.create({
        modality,
        studyType,
        basePrice,
        emergencySurcharge: emergencySurcharge || 0,
        nightHolidaySurcharge: nightHolidaySurcharge || 0,
        targetHospitalId: targetHospitalId || null,
        targetRadiologistId: targetRadiologistId || null,
        isActive: isActive !== false
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, "Tariff rule created successfully", tariff);
});

/**
 * @desc    Update a tariff rule
 * @route   PATCH /api/billing/tariffs/:id
 * @access  Private (Admin)
 */
export const updateTariff = asyncHandler(async (req, res) => {
    const tariff = await Tariff.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!tariff) {
        throw new AppError("Tariff rule not found", HTTP_STATUS.NOT_FOUND);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Tariff rule updated successfully", tariff);
});

/**
 * @desc    Delete a tariff rule
 * @route   DELETE /api/billing/tariffs/:id
 * @access  Private (Admin)
 */
export const deleteTariff = asyncHandler(async (req, res) => {
    const tariff = await Tariff.findByIdAndDelete(req.params.id);

    if (!tariff) {
        throw new AppError("Tariff rule not found", HTTP_STATUS.NOT_FOUND);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Tariff rule deleted successfully", null);
});

/**
 * @desc    Bulk create/update tariff rules
 * @route   POST /api/billing/tariffs/bulk
 * @access  Private (Admin)
 */
export const bulkCreateTariffs = asyncHandler(async (req, res) => {
    const { tariffs } = req.body;

    if (!Array.isArray(tariffs)) {
        throw new AppError("Tariffs must be an array", HTTP_STATUS.BAD_REQUEST);
    }

    const operations = tariffs.map(t => ({
        updateOne: {
            filter: {
                modality: t.modality,
                studyType: t.studyType,
                targetHospitalId: t.targetHospitalId || null,
                targetRadiologistId: t.targetRadiologistId || null
            },
            update: { $set: t },
            upsert: true
        }
    }));

    await Tariff.bulkWrite(operations);

    return sendSuccess(res, HTTP_STATUS.OK, `Successfully processed ${tariffs.length} tariff rules`, null);
});

/**
 * @desc    Test tariff matching logic (Simulator)
 * @route   POST /api/billing/tariffs/test-match
 * @access  Private (Admin)
 */
export const testTariffMatch = asyncHandler(async (req, res) => {
    const { modality, studyType, hospitalId, radiologistId, urgency } = req.body;

    const allTariffs = await Tariff.find();
    const match = findMatchingTariff(allTariffs, modality, studyType, hospitalId, radiologistId);

    if (!match) {
        return sendSuccess(res, HTTP_STATUS.OK, "No matching tariff found", {
            matched: false,
            parameters: { modality, studyType, hospitalId }
        });
    }

    const earnings = calculateCaseEarning({ urgency }, match);

    return sendSuccess(res, HTTP_STATUS.OK, "Tariff match found", {
        matched: true,
        rule: match,
        calculations: earnings
    });
});

/**
 * @desc    Generate monthly invoices for all technicians
 * @route   POST /api/billing/invoices/generate
 * @access  Private (Admin)
 */
export const generateInvoices = asyncHandler(async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        throw new AppError("Month and year are required", HTTP_STATUS.BAD_REQUEST);
    }

    // 1. Find all finalized cases that haven't been invoiced yet
    const unbilledCases = await Case.find({
        status: "Finalized",
        "billingInfo.invoiceId": { $exists: false }
    }).populate("uploadedBy");

    if (unbilledCases.length === 0) {
        return sendSuccess(res, HTTP_STATUS.OK, "No unbilled cases found for this period", []);
    }

    // 2. Group cases by Technician
    const groupedByTech = unbilledCases.reduce((acc, kase) => {
        const techId = kase.uploadedBy._id.toString();
        if (!acc[techId]) {
            acc[techId] = {
                technician: kase.uploadedBy,
                cases: [],
                totalAmount: 0
            };
        }
        acc[techId].cases.push(kase);
        acc[techId].totalAmount += (kase.billingInfo?.total || 0);
        return acc;
    }, {});

    const generatedInvoices = [];

    // 3. Create an invoice for each technician
    for (const techId in groupedByTech) {
        const group = groupedByTech[techId];
        const invoiceCount = await Invoice.countDocuments();
        const invoiceId = `INV-${year}${month.toString().padStart(2, '0')}-${(invoiceCount + 1).toString().padStart(3, '0')}`;

        const invoice = await Invoice.create({
            invoiceId,
            technician: techId,
            institutionName: group.technician.institution || group.technician.name,
            period: { month, year },
            cases: group.cases.map(c => c._id),
            caseCount: group.cases.length,
            amount: group.totalAmount,
            status: "pending",
            dueDate: new Date(year, month, 15), // Due on 15th of next month
            generatedBy: req.user._id
        });

        // 4. Link cases to the invoice
        await Case.updateMany(
            { _id: { $in: group.cases.map(c => c._id) } },
            { $set: { "billingInfo.invoiceId": invoice._id } }
        );

        generatedInvoices.push(invoice);
    }

    return sendSuccess(res, HTTP_STATUS.CREATED, `Generated ${generatedInvoices.length} invoices`, generatedInvoices);
});

/**
 * @desc    Get all invoices
 * @route   GET /api/billing/invoices
 * @access  Private (Admin)
 */
export const getAllInvoices = asyncHandler(async (req, res) => {
    const invoices = await Invoice.find()
        .populate("technician", "name email institution")
        .sort({ createdAt: -1 });
    return sendSuccess(res, HTTP_STATUS.OK, "Invoices fetched successfully", invoices);
});

/**
 * @desc    Get my invoices (for technicians)
 * @route   GET /api/billing/my-invoices
 * @access  Private (Technician)
 */
export const getMyInvoices = asyncHandler(async (req, res) => {
    const invoices = await Invoice.find({ technician: req.user._id })
        .sort({ createdAt: -1 });
    return sendSuccess(res, HTTP_STATUS.OK, "My invoices fetched successfully", invoices);
});

/**
 * @desc    Update invoice status
 * @route   PATCH /api/billing/invoices/:id/status
 * @access  Private (Admin)
 */
export const updateInvoiceStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, {
        status,
        paidAt: status === 'paid' ? new Date() : undefined
    }, {
        new: true,
        runValidators: true
    });

    if (!invoice) {
        throw new AppError("Invoice not found", HTTP_STATUS.NOT_FOUND);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Invoice status updated successfully", invoice);
});

/**
 * @desc    Download Invoice PDF
 * @route   GET /api/billing/invoices/:id/download
 * @access  Private (Admin/Technician)
 */
export const downloadInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate("technician", "name email institution")
        .populate({
            path: "cases",
            select: "patientName studyDate modality urgency billingInfo",
        });

    if (!invoice) {
        throw new AppError("Invoice not found", HTTP_STATUS.NOT_FOUND);
    }

    // Security check: Admins can download any, technicians only their own
    if (req.user.role === 'technician' && invoice.technician._id.toString() !== req.user._id.toString()) {
        throw new AppError("Unauthorized to download this invoice", HTTP_STATUS.FORBIDDEN);
    }

    const pdfBytes = await generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceId}.pdf"`);
    res.send(Buffer.from(pdfBytes));
});

/**
 * @desc    Get detailed breakdown of an invoice (Technicians & their Studies)
 * @route   GET /api/billing/invoices/:id/details
 * @access  Private (Admin)
 */
export const getInvoiceDetails = asyncHandler(async (req, res) => {
    // 1. Fetch the invoice to get period and institution
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
        throw new AppError("Invoice not found", HTTP_STATUS.NOT_FOUND);
    }

    const { institutionName, period } = invoice;

    // 2. Fetch all cases linked to this invoice ID
    const cases = await Case.find({ "billingInfo.invoiceId": invoice._id })
        .populate("uploadedBy", "name email");

    // 3. Group cases by the uploading Technician
    const groupedByTech = cases.reduce((acc, kase) => {
        const techId = kase.uploadedBy._id.toString();
        if (!acc[techId]) {
            acc[techId] = {
                technician: {
                    id: techId,
                    name: kase.uploadedBy.name,
                    email: kase.uploadedBy.email
                },
                cases: [],
                totalCases: 0,
            };
        }
        
        acc[techId].cases.push({
            _id: kase._id,
            patientName: kase.patientName,
            modality: kase.modality,
            studyDate: kase.studyDate,
            urgency: kase.urgency,
            totalEarnings: kase.billingInfo?.total || 0,
            status: kase.status
        });
        
        acc[techId].totalCases += 1;
        
        return acc;
    }, {});

    // Convert object to array
    const result = Object.values(groupedByTech);

    return sendSuccess(res, HTTP_STATUS.OK, "Invoice details fetched successfully", {
        invoiceId: invoice.invoiceId,
        institutionName,
        period,
        technicianBreakdown: result
    });
});
