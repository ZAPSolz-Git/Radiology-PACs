import SecuritySetting from "../models/SecuritySetting.js";
import RoleToolRestriction from "../models/RoleToolRestriction.js";
import AuditLog from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { HTTP_STATUS } from "../constants/index.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";

// DEFINITIVE LIST OF ALL VALID TOOL IDS (from ToolControlConsole.tsx)
const VALID_TOOL_IDS = [
    // Navigation
    'WindowLevel', 'Pan', 'Zoom', 'TrackballRotate', 'Capture', 'Layout', 'Crosshairs', 'StackScroll',
    // Measurements
    'Length', 'Bidirectional', 'ArrowAnnotate', 'EllipticalROI', 'RectangleROI', 'CircleROI',
    'PlanarFreehandROI', 'SplineROI', 'LivewireContour', 'Angle', 'CobbAngle', 'CalibrationLine',
    'UltrasoundDirectionalTool',
    // Image Controls
    'Reset', 'rotate-right', 'flipHorizontal', 'invert', 'ImageSliceSync', 'ReferenceLines',
    'ImageOverlayViewer', 'WindowLevelRegion', 'Cine',
    // Inspection & Analysis
    'Probe', 'Magnify', 'AdvancedMagnify', 'TagBrowser', 'Colorbar', 'SegmentLabelTool',
    // Viewport Menus
    'orientationMenu', 'dataOverlayMenu', 'windowLevelMenu', 'windowLevelMenuEmbedded',
    'voiManualControlMenu', 'thresholdMenu', 'opacityMenu', 'modalityLoadBadge',
    'navigationComponent', 'trackingStatus'
];

/**
 * @desc    Get global security settings
 * @route   GET /api/admin/security/settings
 */
export const getSecuritySettings = asyncHandler(async (req, res) => {
    const settings = await SecuritySetting.getSettings();
    return sendSuccess(res, HTTP_STATUS.OK, 'Security settings fetched', settings);
});

/**
 * @desc    Update global security settings
 * @route   PATCH /api/admin/security/settings
 */
export const updateSecuritySettings = asyncHandler(async (req, res) => {
    const settings = await SecuritySetting.getSettings();
    const beforeUpdate = settings.toObject();

    const allowedUpdates = [
        'enforce2FA',
        'passwordRotationDays',
        'sessionTimeoutMinutes',
        'maxFailedAttempts',
        'lockoutDurationMinutes',
        'allowBiometricOverride'
    ];

    allowedUpdates.forEach(update => {
        if (req.body[update] !== undefined) {
            settings[update] = req.body[update];
        }
    });

    settings.updatedBy = req.user._id;
    await settings.save();

    logAudit({
        category: AUDIT_CATEGORIES.SECURITY_CONFIG,
        action: 'Security Settings Updated',
        resourceType: 'Setting',
        resourceId: settings._id,
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.MEDIUM,
        details: 'Global security policy changed',
        diff: {
            before: beforeUpdate,
            after: settings.toObject()
        },
        metadata: req.body
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Security settings updated', settings);
});

/**
 * @desc    Get security audit logs
 * @route   GET /api/admin/security/logs
 */
export const getSecurityLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, action, status, search, category } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    // Support either direct action filter or general search
    if (action) {
        query.action = { $regex: action, $options: 'i' };
    } else if (search) {
        query.$or = [
            { action: { $regex: search, $options: 'i' } },
            { details: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { userName: { $regex: search, $options: 'i' } }
        ];
    }

    if (status) query.status = status;
    if (category) query.category = category;

    const totalLogs = await AuditLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / parseInt(limit));

    const logs = await AuditLog.find(query)
        .sort('-timestamp')
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email role')
        .populate('targetUser', 'name email');

    return sendSuccess(res, HTTP_STATUS.OK, 'Security logs fetched', {
        logs,
        pagination: {
            totalLogs,
            totalPages,
            currentPage: parseInt(page),
            limit: parseInt(limit)
        }
    });
});

/**
 * @desc    Get recent login activity
 * @route   GET /api/admin/login-activity
 */
export const getLoginActivity = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { category: 'AUTH' };

    if (search) {
        query.$or = [
            { userName: { $regex: search, $options: 'i' } },
            { action: { $regex: search, $options: 'i' } },
            { ipAddress: { $regex: search, $options: 'i' } },
            { userAgent: { $regex: search, $options: 'i' } }
        ];
    }

    const totalLogs = await AuditLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / parseInt(limit));

    const logs = await AuditLog.find(query)
        .sort('-timestamp')
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email role');

    return sendSuccess(res, HTTP_STATUS.OK, 'Login activity fetched', {
        logs,
        pagination: {
            totalLogs,
            totalPages,
            currentPage: parseInt(page),
            limit: parseInt(limit)
        }
    });
});

/**
 * @desc    Get all viewer tool restrictions
 * @route   GET /api/admin/viewer/restrictions
 */
export const getViewerRestrictions = asyncHandler(async (req, res) => {
    let restrictions = await RoleToolRestriction.getFormattedRestrictions();

    // Auto-seed if empty
    if (Object.keys(restrictions).length === 0) {
        const roles = ['admin', 'radiologist', 'technician', 'qa', 'user', 'institution'];
        const ops = roles.map(role => ({
            role,
            allowedTools: [], // Default to empty (all tools allowed by business logic if not configured)
            lastModifiedBy: req.user?._id
        }));

        await RoleToolRestriction.insertMany(ops);
        restrictions = await RoleToolRestriction.getFormattedRestrictions();
    }

    return sendSuccess(res, HTTP_STATUS.OK, 'Viewer restrictions fetched', restrictions);
});

/**
 * @desc    Update viewer tool restrictions for a role
 * @route   POST /api/admin/viewer/restrictions
 */
export const updateViewerRestrictions = asyncHandler(async (req, res) => {
    const { role, allowedTools } = req.body;

    if (!role) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Role is required' });
    }

    // Validate role is one of the expected values
    const validRoles = ['user', 'technician', 'radiologist', 'admin', 'qa', 'institution'];
    if (!validRoles.includes(role)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
    }

    // Validate allowedTools is an array
    if (!Array.isArray(allowedTools)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'allowedTools must be an array' });
    }

    // SECURITY: Validate all tool IDs are valid
    const invalidTools = allowedTools.filter(tool => !VALID_TOOL_IDS.includes(tool));
    if (invalidTools.length > 0) {
        console.warn(
            `[SECURITY] Admin ${req.user._id} attempted to save invalid tools: ${invalidTools.join(', ')}`
        );
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: `Invalid tool IDs: ${invalidTools.join(', ')}`
        });
    }

    // Fetch existing for audit
    const existing = await RoleToolRestriction.findOne({ role });
    const beforeState = existing ? existing.allowedTools : null;

    const updated = await RoleToolRestriction.findOneAndUpdate(
        { role },
        { allowedTools, lastModifiedBy: req.user._id },
        { new: true, upsert: true, runValidators: true }
    );

    logAudit({
        category: AUDIT_CATEGORIES.SECURITY_CONFIG,
        action: 'Viewer Tool Restrictions Updated',
        resourceType: 'RoleToolRestriction',
        resourceId: updated._id,
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.MEDIUM,
        details: `Tools restricted for role: ${role}`,
        diff: {
            before: beforeState,
            after: allowedTools
        },
        metadata: req.body
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Viewer restrictions updated', updated);
});
