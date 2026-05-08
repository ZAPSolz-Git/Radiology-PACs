import RoleToolRestriction from "../models/RoleToolRestriction.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * Viewer Tool Validation Middleware
 * 
 * Provides server-side validation of viewer tool permissions to prevent
 * unauthorized tool usage even if client-side restrictions are bypassed.
 * 
 * SECURITY NOTE: This middleware should be used on any route that performs
 * tool-specific actions (saving measurements, exporting annotations, etc.)
 * to ensure users can only use tools permitted for their role.
 * 
 * @example
 *   // Single tool validation
 *   router.post('/measurements', protect, validateViewerToolAction('Length'), saveMeasurement);
 * 
 * @example
 *   // Multiple tool validation
 *   router.post('/measurements/batch', protect, validateViewerToolActions(['Length', 'Angle']), saveMeasurements);
 * 
 * @example
 *   // Attach restrictions to request for use in route handler
 *   router.get('/tools', protect, attachViewerRestrictions, getAvailableTools);
 */

/**
 * Middleware to validate viewer tool actions against user's role permissions
 * @param {string} requiredTool - The tool ID that must be allowed for the user's role
 * @returns {Function} Express middleware
 */
export const validateViewerToolAction = (requiredTool) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const userRole = req.user.role;

        // Admin always has access to all tools
        if (userRole === 'admin') {
            return next();
        }

        // Fetch restrictions for this role
        const restriction = await RoleToolRestriction.findOne({ role: userRole });

        // If no restriction exists, deny access (secure by default)
        if (!restriction) {
            throw new AppError(
                `Tool access not configured for role: ${userRole}`,
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Check if the required tool is in the allowed list
        const isAllowed = restriction.allowedTools.includes(requiredTool);

        if (!isAllowed) {
            // Log the violation for audit purposes
            console.warn(
                `[SECURITY] Tool violation: User ${req.user._id} (${userRole}) attempted to use '${requiredTool}' which is not permitted`
            );

            throw new AppError(
                `Tool '${requiredTool}' is not permitted for your role (${userRole})`,
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Tool is allowed, proceed
        next();
    });
};

/**
 * Middleware to validate multiple tool actions (for batch operations)
 * @param {string[]} requiredTools - Array of tool IDs that must all be allowed
 * @returns {Function} Express middleware
 */
export const validateViewerToolActions = (requiredTools) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const userRole = req.user.role;

        // Admin always has access to all tools
        if (userRole === 'admin') {
            return next();
        }

        // Fetch restrictions for this role
        const restriction = await RoleToolRestriction.findOne({ role: userRole });

        if (!restriction) {
            throw new AppError(
                `Tool access not configured for role: ${userRole}`,
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Check if ALL required tools are allowed
        const disallowedTools = requiredTools.filter(tool => !restriction.allowedTools.includes(tool));

        if (disallowedTools.length > 0) {
            // Log the violation for audit purposes
            console.warn(
                `[SECURITY] Tool violation: User ${req.user._id} (${userRole}) attempted to use '${disallowedTools.join(', ')}' which are not permitted`
            );

            throw new AppError(
                `Tools not permitted for role (${userRole}): ${disallowedTools.join(', ')}`,
                HTTP_STATUS.FORBIDDEN
            );
        }

        next();
    });
};

/**
 * Express middleware that adds viewer restrictions to req object
 * Useful for routes that need to know what tools are available
 * @returns {Function} Express middleware
 */
export const attachViewerRestrictions = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    const restrictions = await RoleToolRestriction.getFormattedRestrictions();
    const userRole = req.user.role;

    req.viewerRestrictions = restrictions[userRole] || [];
    req.userRole = userRole;

    next();
});
