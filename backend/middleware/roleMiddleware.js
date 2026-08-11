import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/index.js";

/**
 * RESTRICT TO:
 * Middleware to restrict access to specific roles.
 * Usage: restrictTo('admin', 'technician')
 */
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        // 1. Check if user exists on request (set by authMiddleware)
        if (!req.user) {
            return next(
                new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
            );
        }

        // 2. Check if user role is allowed
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You do not have permission to perform this action",
                    HTTP_STATUS.FORBIDDEN
                )
            );
        }

        next();
    };
};
