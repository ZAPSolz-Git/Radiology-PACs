import Case from "../models/Case.js";
import Invoice from "../models/Invoice.js";
import Payout from "../models/Payout.js";
import { HTTP_STATUS } from "../constants/index.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc    Get comprehensive revenue analytics for the admin dashboard
 * @route   GET /api/analytics/revenue
 * @access  Private (Admin only)
 */
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
        dateFilter.updatedAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    // We only care about Finalized cases for revenue recognizing
    const matchStage = {
        $match: {
            status: "Finalized",
            ...dateFilter
        }
    };

    // 1. Overall Stats Aggregation (Totals)
    const statsPipeline = [
        matchStage,
        {
            $group: {
                _id: null,
                totalCases: { $sum: 1 },
                netRevenue: { $sum: "$billingInfo.total" },
                doctorCost: { $sum: "$billingInfo.radiologistEarning" }
            }
        }
    ];

    // 2. Trajectory Aggregation (Group by Month/Year)
    // To give a robust 7-month trajectory like the UI expects
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trajectoryPipeline = [
        {
            $match: {
                status: "Finalized",
                updatedAt: { $gte: sixMonthsAgo } // Cases finalized in the last 6 months
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$updatedAt" },
                    year: { $year: "$updatedAt" }
                },
                income: { $sum: "$billingInfo.total" },
                cost: { $sum: "$billingInfo.radiologistEarning" }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ];

    // 3. Modality Mix Aggregation
    const modalityPipeline = [
        matchStage,
        {
            $group: {
                _id: "$modality",
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 } // Highest first
        }
    ];

    // 4. Top Institutions Aggregation
    const topInstitutionsPipeline = [
        matchStage,
        {
            $group: {
                _id: "$institution",
                revenue: { $sum: "$billingInfo.total" },
                caseCount: { $sum: 1 }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
    ];

    // 5. Accounts Receivable (from Invoices)
    const invoiceMatch = {};
    if (startDate && endDate) {
        invoiceMatch.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    const invoicePipeline = [
        { $match: invoiceMatch },
        {
            $group: {
                _id: "$status",
                totalAmount: { $sum: "$amount" }
            }
        }
    ];

    // 6. Accounts Payable (from Payouts)
    const payoutMatch = {};
    if (startDate && endDate) {
        payoutMatch.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    const payoutPipeline = [
        { $match: payoutMatch },
        {
            $group: {
                _id: "$status",
                totalAmount: { $sum: "$amount" }
            }
        }
    ];

    // Execute all pipelines concurrently
    const [statsResult, trajectoryResult, modalityResult, institutionsResult, invoiceResult, payoutResult] = await Promise.all([
        Case.aggregate(statsPipeline),
        Case.aggregate(trajectoryPipeline),
        Case.aggregate(modalityPipeline),
        Case.aggregate(topInstitutionsPipeline),
        Invoice.aggregate(invoicePipeline),
        Payout.aggregate(payoutPipeline)
    ]);

    // Format Overall Stats
    const rawStats = statsResult[0] || { totalCases: 0, netRevenue: 0, doctorCost: 0 };
    const netRevenue = rawStats.netRevenue;
    const doctorCost = rawStats.doctorCost;
    const totalCases = rawStats.totalCases;

    // Profit Margin Calculation = (Revenue - Cost) / Revenue
    let profitMargin = 0;
    if (netRevenue > 0) {
        profitMargin = ((netRevenue - doctorCost) / netRevenue) * 100;
    }

    // Average Study Value Calculation
    let avgStudyValue = 0;
    if (totalCases > 0) {
        avgStudyValue = netRevenue / totalCases;
    }

    const overallStats = {
        netRevenue,
        doctorCost,
        profitMargin,
        avgStudyValue,
        totalCases
    };

    // Format Trajectory
    // We get elements like { _id: { month: 3, year: 2026 }, income: 1000, cost: 400 }
    // Let's format them directly for the UI to digest easier.
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trajectory = trajectoryResult.map(item => ({
        label: `${monthNames[item._id.month - 1]}`,
        year: item._id.year,
        income: item.income,
        cost: item.cost
    }));

    // Format Modality Mix
    const totalModalityCases = modalityResult.reduce((sum, item) => sum + item.count, 0);
    const modalityMix = modalityResult.map(item => ({
        label: item._id || "Unknown",
        value: totalModalityCases > 0 ? ((item.count / totalModalityCases) * 100).toFixed(1) : 0,
        absoluteCount: item.count
    }));

    // Format Top Institutions
    const topInstitutions = institutionsResult.map(item => ({
        name: item._id || "Unknown Institution",
        revenue: item.revenue,
        caseCount: item.caseCount
    }));

    // Format Cash Flow
    let collectedCash = 0;
    let pendingReceivables = 0;
    invoiceResult.forEach(item => {
        if (item._id === 'paid') collectedCash = item.totalAmount;
        if (item._id === 'pending') pendingReceivables = item.totalAmount;
    });

    let paidOutCash = 0;
    let pendingPayables = 0;
    payoutResult.forEach(item => {
        if (item._id === 'Paid') paidOutCash = item.totalAmount;
        if (item._id === 'Pending') pendingPayables = item.totalAmount;
    });

    const cashFlow = {
        receivables: { collected: collectedCash, pending: pendingReceivables },
        payables: { paid: paidOutCash, pending: pendingPayables }
    };

    return sendSuccess(res, HTTP_STATUS.OK, "Revenue analytics fetched successfully", {
        overallStats,
        trajectory,
        modalityMix,
        topInstitutions,
        cashFlow
    });
});
