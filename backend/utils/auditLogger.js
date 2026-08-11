import AuditLog from '../models/AuditLog.js';
import { getClientIp } from './ipUtils.js';

/**
 * Standardized utility for logging system events
 * @param {Object} params - Audit parameters
 */
export const logAudit = async ({
    category,
    action,
    req,
    user,
    targetUser,
    resourceType,
    resourceId,
    status = 'Info',
    severity = 'Low',
    details,
    diff,
    metadata
}) => {
    try {
        const auditData = {
            category,
            action,
            resourceType,
            resourceId,
            status,
            severity,
            details,
            diff,
            metadata,
            timestamp: new Date()
        };

        // Populate user data from request if available
        if (req && req.user) {
            auditData.user = req.user._id;
            auditData.userName = req.user.name;
            auditData.role = req.user.role;
        } else if (user) {
            auditData.user = user._id;
            auditData.userName = user.name;
            auditData.role = user.role;
        }

        // Populate target user if applicable
        if (targetUser) {
            auditData.targetUser = targetUser._id || targetUser;
        }

        // Capture IP and User Agent from request
        if (req) {
            auditData.ipAddress = getClientIp(req);
            auditData.userAgent = req.headers['user-agent'];
        }

        // Create the log (non-blocking)
        AuditLog.create(auditData).catch(err => {
            console.error('[AuditLogger Error]: Failed to save log:', err);
        });

    } catch (error) {
        console.error('[AuditLogger Error]:', error);
    }
};

export const AUDIT_CATEGORIES = {
    AUTH: 'AUTH',
    USER_MGMT: 'USER_MGMT',
    CASE_WORKFLOW: 'CASE_WORKFLOW',
    SECURITY_CONFIG: 'SECURITY_CONFIG',
    DATA_ACCESS: 'DATA_ACCESS',
    FINANCIAL: 'FINANCIAL',
    SYSTEM: 'SYSTEM',
    EXTERNAL_API: 'EXTERNAL_API'
};

export const AUDIT_STATUS = {
    SUCCESS: 'Success',
    FAILURE: 'Failure',
    WARNING: 'Warning',
    INFO: 'Info',
    CRITICAL: 'Critical'
};

export const AUDIT_SEVERITY = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical'
};
