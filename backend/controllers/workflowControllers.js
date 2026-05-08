import Case from "../models/Case.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @desc    Get real-time workflow analytics
 * @route   GET /api/admin/workflow/analytics
 */
export const getWorkflowAnalytics = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingCount, reportedToday, emergencyCount, activeOperators, integrityWarnings] = await Promise.all([
        Case.countDocuments({ status: { $in: ["Uploaded", "QA_Pending", "QA_Review", "Assigned", "In_Progress"] } }),
        Case.countDocuments({ status: "Finalized", updatedAt: { $gte: today } }),
        Case.countDocuments({ isEmergency: true, status: { $ne: "Finalized" } }),
        AuditLog.distinct('user', {
            timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
        }),
        Case.countDocuments({ "integrityResults.status": { $in: ["Warning", "Fail"] }, status: { $ne: "Finalized" } })
    ]);

    // Active users detail with workload
    const liveStaff = await User.find({ _id: { $in: activeOperators } })
        .select('name role status lastActive')
        .limit(10);

    const liveStaffWithWorkload = await Promise.all(liveStaff.map(async (u) => {
        const workload = await Case.countDocuments({
            assignedRadiologist: u._id,
            status: { $in: ["Assigned", "In_Progress"] }
        });
        return {
            id: u._id,
            name: u.name,
            role: u.role,
            status: u.status === 'active' ? 'online' : u.status,
            lastActive: u.lastActive,
            workload
        };
    }));

    return sendSuccess(res, HTTP_STATUS.OK, 'Workflow analytics fetched', {
        stats: {
            pending: pendingCount,
            reportedToday,
            emergency: emergencyCount,
            activeOperators: activeOperators.length,
            integrityWarnings
        },
        liveStaff: liveStaffWithWorkload
    });
});

/**
 * @desc    Get SLA monitoring data
 * @route   GET /api/admin/workflow/sla
 */
export const getSLAMonitoring = asyncHandler(async (req, res) => {
    const cases = await Case.find({ status: { $ne: "Finalized" } })
        .select('patientName modality isEmergency urgency createdAt deadline studyInstanceUID status integrityResults qaVerification assignedRadiologist')
        .populate('assignedRadiologist', 'name')
        .sort('createdAt')
        .limit(50);

    const slaMetrics = cases.map(c => {
        const now = new Date();
        const deadline = c.deadline || new Date(c.createdAt.getTime() + 24 * 60 * 60 * 1000);
        const remainingTime = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60));

        let slaStatus = 'on-track';
        if (remainingTime < 0) slaStatus = 'breached';
        else if (remainingTime < 30) slaStatus = 'warning';

        return {
            id: c._id,
            caseId: c.studyInstanceUID.substring(0, 8),
            patientName: c.patientName,
            modality: c.modality,
            priority: c.isEmergency ? 'emergency' : (c.urgency === 'STAT' ? 'urgent' : 'routine'),
            uploadedAt: c.createdAt,
            remainingTime,
            status: slaStatus,
            workflowStatus: c.status,
            integrityScore: c.integrityResults?.score || 0,
            integrityStatus: c.integrityResults?.status || 'Pending',
            assignedTo: c.assignedRadiologist?.name || 'Unassigned'
        };
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'SLA metrics fetched', slaMetrics);
});

/**
 * @desc    Get system-wide alerts
 * @route   GET /api/admin/workflow/alerts
 */
export const getSystemAlerts = asyncHandler(async (req, res) => {
    const criticalLogs = await AuditLog.find({
        severity: { $in: ['High', 'Critical'] }
    })
        .sort('-timestamp')
        .limit(20);

    const alerts = criticalLogs.map(log => ({
        id: log._id,
        type: log.category === 'AUTH' ? 'system_error' :
            log.category === 'CASE_WORKFLOW' ? 'emergency_upload' : 'system_error',
        severity: log.severity.toLowerCase(),
        message: log.details || `${log.action} by ${log.userName}`,
        timestamp: log.timestamp,
        isRead: false,
        resourceType: log.resourceType,
        resourceId: log.resourceId
    }));

    return sendSuccess(res, HTTP_STATUS.OK, 'System alerts fetched', alerts);
});
