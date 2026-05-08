import Case from "../models/Case.js";
import Tariff from "../models/Tariff.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { HTTP_STATUS } from "../constants/index.js";
import mongoose from "mongoose";
import { findMatchingTariff, calculateCaseEarning } from "../utils/billingUtils.js";

/**
 * @desc    Get Radiologist Productivity & Billing Stats
 * @route   GET /api/performance/stats
 * @access  Private (Radiologist)
 */
export const getRadiologistStats = asyncHandler(async (req, res) => {
    const radiologistId = req.user._id;

    // 1. Get all finalized cases for this radiologist
    const finalizedCases = await Case.find({
        assignedRadiologist: radiologistId,
        status: "Finalized"
    }).lean();

    // 2. Fetch all relevant tariffs (to avoid N+1 queries in a loop)
    // We'll fetch all active tariffs to match in memory
    const tariffs = await Tariff.find({ isActive: true }).lean();

    // 3. Process metrics
    let totalEarnings = 0;
    const modalityVolume = {};
    const dailyVolume = {};
    const monthlyVolume = {};
    let totalTATMinutes = 0;
    let tatCount = 0;

    finalizedCases.forEach(kase => {
        // Modality Volume
        modalityVolume[kase.modality] = (modalityVolume[kase.modality] || 0) + 1;

        // Earnings Calculation (Strictly use locked Snapshot for Finalized cases)
        if (kase.billingInfo && (kase.billingInfo.total > 0 || kase.billingInfo.lockedAt)) {
            totalEarnings += (kase.billingInfo.radiologistEarning || 0);
        } else {
            // Fallback ONLY for legacy cases that were finalized before the snapshot system was implemented
            const tariff = findMatchingTariff(tariffs, kase.modality, kase.bodyPart, kase.institution, kase.assignedRadiologist);
            if (tariff) {
                const earnings = calculateCaseEarning(kase, tariff);
                totalEarnings += earnings.radiologistEarning || 0;
            }
        }

        // Daily/Monthly Activity
        const date = new Date(kase.updatedAt).toISOString().split('T')[0];
        const month = date.substring(0, 7); // YYYY-MM

        dailyVolume[date] = (dailyVolume[date] || 0) + 1;
        monthlyVolume[month] = (monthlyVolume[month] || 0) + 1;

        // TAT Calculation (Assignment to Finalization)
        // Finding when it was assigned or accepted
        const assignmentEntry = kase.timeline.find(t => t.action === "Case Accepted" || t.status === "Assigned");
        const completionEntry = kase.timeline.find(t => t.status === "Finalized");

        if (assignmentEntry && completionEntry) {
            const start = new Date(assignmentEntry.timestamp);
            const end = new Date(completionEntry.timestamp);
            const diffMinutes = Math.floor((end - start) / (1000 * 60));
            if (diffMinutes > 0) {
                totalTATMinutes += diffMinutes;
                tatCount++;
            }
        }
    });

    const stats = {
        overview: {
            totalCases: finalizedCases.length,
            totalEarnings,
            avgTAT: tatCount > 0 ? Math.round(totalTATMinutes / tatCount) : 0,
            completionRate: 100 // Simplified for now
        },
        modalityDistribution: Object.entries(modalityVolume).map(([name, value]) => ({ name, value })),
        dailyActivity: Object.entries(dailyVolume)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-15) // Last 15 days
            .map(([date, count]) => ({ date, count })),
        monthlyActivity: Object.entries(monthlyVolume)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, count]) => ({ month, count })),
        recentEarnings: finalizedCases.map(kase => {
            const earnings = (kase.billingInfo && (kase.billingInfo.total > 0 || kase.billingInfo.lockedAt))
                ? kase.billingInfo
                : (() => {
                    const t = findMatchingTariff(tariffs, kase.modality, kase.bodyPart, kase.institution, kase.assignedRadiologist);
                    return calculateCaseEarning(kase, t);
                })();

            return {
                id: kase._id,
                date: kase.updatedAt,
                patientName: kase.patientName,
                modality: kase.modality,
                studyType: kase.bodyPart,
                basePrice: earnings.basePrice,
                surcharge: (earnings.emergencySurcharge || 0) + (earnings.nightHolidaySurcharge || 0),
                total: earnings.radiologistEarning || 0
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    return sendSuccess(res, HTTP_STATUS.OK, "Performance stats retrieved", stats);
});
