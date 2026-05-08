import Case from "../models/Case.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";

/**
 * @desc    Get Case Timeline
 * @route   GET /api/cases/:id/timeline
 * @access  Private (All authenticated users)
 */
export const getCaseTimeline = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const caseData = await Case.findById(id)
        .select('timeline patientName patientId')
        .populate('timeline.user', 'name email role');

    if (!caseData) {
        throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);
    }

    // Sort timeline by timestamp (newest first)
    const sortedTimeline = caseData.timeline.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    return sendSuccess(res, HTTP_STATUS.OK, "Timeline retrieved successfully", {
        caseId: caseData._id,
        patientName: caseData.patientName,
        patientId: caseData.patientId,
        timeline: sortedTimeline
    });
});
