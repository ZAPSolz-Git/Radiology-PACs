import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/index.js';
import User from '../models/User.js';
import { verifyToken } from '../utils/generateToken.js';

/**
 * Protect routes - verify JWT token from cookies
 */
export const protect = asyncHandler(async (req, res, next) => {
    // 1. Get token from cookies (preferred) or Authorization header (fallback for mobile/legacy)
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. Check if token exists
    if (!token) {
        throw new AppError(
            ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    try {
        // 3. Verify token using RS256 (via verifyToken helper)
        const decoded = verifyToken(token);

        // 4. Get user from DB
        const user = await User.findById(decoded.userId || decoded.id).select('-password');

        if (!user) {
            throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        if (user.status === 'deactivated' || user.status === 'locked') {
            throw new AppError('Your account is inactive. Please contact support.', HTTP_STATUS.FORBIDDEN);
        }

        // Add user to request object
        req.user = user;

        // Update lastActive (async, don't wait)
        user.lastActive = new Date();
        user.save({ validateBeforeSave: false }).catch(err => console.error('Error updating lastActive:', err));

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
            throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }
        if (error.name === 'TokenExpiredError') {
            throw new AppError('Token expired', HTTP_STATUS.UNAUTHORIZED);
        }
        throw error;
    }
});

/**
 * Restrict routes to specific roles (Cache-based check from token/user object)
 */
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AppError(
                'You do not have permission to perform this action',
                HTTP_STATUS.FORBIDDEN
            );
        }
        next();
    };
};

/**
 * Strict Role Validation - Queries DB to ensure the role hasn't changed or been revoked.
 * Required for sensitive/admin actions.
 */
export const verifyDBRole = (requiredRole) => {
    return asyncHandler(async (req, res, next) => {
        // Get fresh user data from DB
        const user = await User.findById(req.user._id).select('role status');
        
        if (!user) {
            throw new AppError('User no longer exists', HTTP_STATUS.UNAUTHORIZED);
        }

        if (user.status !== 'active') {
            throw new AppError('Your account is no longer active', HTTP_STATUS.FORBIDDEN);
        }

        if (user.role !== requiredRole && user.role !== 'admin') { // Admin is always allowed if we treat it as super-admin
            throw new AppError('Strict authorization failed: Role mismatch', HTTP_STATUS.FORBIDDEN);
        }

        next();
    });
};

