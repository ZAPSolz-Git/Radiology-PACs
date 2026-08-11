import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/index.js';
import Case from '../models/Case.js';
import ShareLink from '../models/ShareLink.js';
import RoleToolRestriction from '../models/RoleToolRestriction.js';

/**
 * @desc    Create a secure share link
 * @route   POST /api/share-links
 * @access  Protected
 */
export const createShareLink = asyncHandler(async (req, res) => {
    const { caseId, role, expiresIn } = req.body;

    if (!caseId || !role) {
        throw new AppError('Case ID and Role are required', HTTP_STATUS.BAD_REQUEST);
    }

    const validRoles = ['radiologist', 'technician', 'qa', 'user'];
    if (!validRoles.includes(role)) {
        throw new AppError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
    }

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw new AppError('Case not found', HTTP_STATUS.NOT_FOUND);
    }

    if (!caseDoc.studyInstanceUID) {
        throw new AppError('Case does not have a studyInstanceUID', HTTP_STATUS.BAD_REQUEST);
    }

    let expiryHours = 24;
    if (expiresIn === '1h') expiryHours = 1;
    else if (expiresIn === '6h') expiryHours = 6;
    else if (expiresIn === '24h') expiryHours = 24;
    else if (expiresIn === '7d') expiryHours = 24 * 7;
    
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const token = crypto.randomBytes(32).toString('hex');

    await ShareLink.create({
        token,
        caseId,
        studyInstanceUID: caseDoc.studyInstanceUID,
        role,
        createdBy: req.user._id,
        expiresAt,
    });

    // Record in case timeline — security audit trail
    caseDoc.addTimelineEntry(
        'Share Link Created',
        req.user,
        `Secure share link created for role "${role}", expires in ${expiresIn || '24h'}`,
        { role, expiresIn: expiresIn || '24h', expiresAt, tokenSuffix: token.slice(-6) }
    );
    await caseDoc.save();

    const viewerUrl = process.env.VITE_OHIF_URL || 'http://localhost:3000';
    // Use OHIF viewer URL structure
    const shareUrl = `${viewerUrl}/basic?StudyInstanceUIDs=${caseDoc.studyInstanceUID}&shareToken=${token}`;

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: {
            shareUrl,
            token,
            expiresAt,
            role
        }
    });
});

/**
 * @desc    Validate a secure share link
 * @route   GET /api/share-links/validate
 * @access  Public (Rate Limited)
 */
export const validateShareLink = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: 'fail',
            data: { valid: false, reason: 'missing_token' }
        });
    }

    const shareLink = await ShareLink.findOne({ token });

    if (!shareLink) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: 'fail',
            data: { valid: false, reason: 'not_found' }
        });
    }

    if (shareLink.isRevoked) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
            status: 'fail',
            data: { valid: false, reason: 'revoked' }
        });
    }

    if (new Date() > shareLink.expiresAt) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
            status: 'fail',
            data: { valid: false, reason: 'expired' }
        });
    }

    const restrictions = await RoleToolRestriction.getFormattedRestrictions();
    const allowedTools = restrictions[shareLink.role] || [];

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            valid: true,
            studyInstanceUID: shareLink.studyInstanceUID,
            role: shareLink.role,
            caseId: shareLink.caseId,
            expiresAt: shareLink.expiresAt,
            allowedTools
        }
    });
});

/**
 * @desc    Revoke a secure share link
 * @route   DELETE /api/share-links/:token
 * @access  Protected
 */
export const revokeShareLink = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const shareLink = await ShareLink.findOne({ token });

    if (!shareLink) {
        throw new AppError('Share link not found', HTTP_STATUS.NOT_FOUND);
    }

    if (shareLink.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new AppError('Not authorized to revoke this link', HTTP_STATUS.FORBIDDEN);
    }

    shareLink.isRevoked = true;
    await shareLink.save();

    // Record revocation in case timeline
    const caseDoc = await Case.findById(shareLink.caseId);
    if (caseDoc) {
        caseDoc.addTimelineEntry(
            'Share Link Revoked',
            req.user,
            `Share link (role: "${shareLink.role}") was revoked`,
            { role: shareLink.role, tokenSuffix: token.slice(-6), revokedBy: req.user.name }
        );
        await caseDoc.save();
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Share link revoked successfully'
    });
});

/**
 * @desc    Get all active share links for a case
 * @route   GET /api/share-links/case/:caseId
 * @access  Protected
 */
export const getCaseShareLinks = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    // Fetch links and populate creator details
    const links = await ShareLink.find({
        caseId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    })
    .populate('createdBy', 'role')
    .sort({ createdAt: -1 });

    // Filter: If the user is NOT an admin, hide links created by administrators
    const filteredLinks = req.user.role === 'admin' 
        ? links 
        : links.filter(link => link.createdBy && link.createdBy.role !== 'admin');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: filteredLinks.map(link => ({
            token: link.token,
            role: link.role,
            expiresAt: link.expiresAt,
            createdAt: link.createdAt,
            shareUrl: `${process.env.VITE_OHIF_URL || 'http://localhost:3000'}/basic?StudyInstanceUIDs=${link.studyInstanceUID}&shareToken=${link.token}`
        }))
    });
});
