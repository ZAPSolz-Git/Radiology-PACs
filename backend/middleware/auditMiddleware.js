import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from '../utils/auditLogger.js';

/**
 * Middleware to automatically audit administrative actions
 * Targets POST, PATCH, DELETE requests on specified resource paths
 */
export const auditMiddleware = (category, resourceType) => {
    return (req, res, next) => {
        // We only audit successful state-changing requests
        const originalSend = res.send;

        res.send = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const action = `${req.method} ${req.originalUrl}`;

                logAudit({
                    category: category || AUDIT_CATEGORIES.SYSTEM,
                    action: action,
                    resourceType: resourceType,
                    resourceId: req.params.id,
                    req,
                    status: AUDIT_STATUS.SUCCESS,
                    severity: req.method === 'DELETE' ? AUDIT_SEVERITY.HIGH : AUDIT_SEVERITY.LOW,
                    details: `Automated audit: ${req.method} request to ${req.originalUrl}`,
                    metadata: {
                        method: req.method,
                        path: req.originalUrl,
                        body: req.method !== 'GET' ? req.body : undefined,
                        params: req.params,
                        query: req.query
                    }
                });
            }
            return originalSend.apply(res, arguments);
        };

        next();
    };
};
