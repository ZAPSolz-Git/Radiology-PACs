import User from "../models/User.js";
import Case from "../models/Case.js";
import AuditLog from "../models/AuditLog.js";
import Invoice from "../models/Invoice.js";
import Backup from "../models/Backup.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/index.js";
import { AppError } from "../utils/AppError.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execPromise = promisify(exec);

/**
 * @desc Helper to get actual disk space (Windows/Linux)
 */
async function getSystemDiskSpace() {
    try {
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows: Use wmic to get drive space for C: (most common) or let's try a more general approach
            // We'll get the drive letter from the current directory
            const driveLetter = path.resolve('.').split(':')[0];
            const { stdout } = await execPromise(`wmic logicaldisk where "DeviceID='${driveLetter}:'" get size,freespace /value`);
            const lines = stdout.split(/\r?\n/);
            let freeSpace = 0;
            let totalSpace = 0;
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('FreeSpace=')) freeSpace = parseInt(trimmed.split('=')[1]);
                if (trimmed.startsWith('Size=')) totalSpace = parseInt(trimmed.split('=')[1]);
            });
            return { totalSpace, freeSpace };
        } else {
            // Linux/Unix: df -P -B1 . (Portable format, Block size 1 byte, current dir)
            const { stdout } = await execPromise('df -P -B1 . | tail -1');
            const parts = stdout.trim().split(/\s+/);
            if (parts.length >= 4) {
                const totalSpace = parseInt(parts[1]);
                const freeSpace = parseInt(parts[3]);
                return { totalSpace, freeSpace };
            }
            throw new Error("Unexpected df output format");
        }
    } catch (err) {
        console.error("[DiskSpace Error]:", err.message);
        // Soft fallback to 100GB if detection fails
        return { totalSpace: 100 * 1024 ** 3, freeSpace: 0 };
    }
}

/**
 * @desc    Get all users (with search and filter)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
    const { search, role, status, sort } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    // Filter by role
    if (role && role !== 'all') {
        query.role = role;
    }

    // Filter by status
    if (status && status !== 'all') {
        query.status = status;
    }

    // Base query
    let userQuery = User.find(query);

    // Sorting
    if (sort) {
        const sortBy = sort.split(',').join(' ');
        userQuery = userQuery.sort(sortBy);
    } else {
        userQuery = userQuery.sort('-createdAt');
    }

    const users = await userQuery;

    return sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.FETCHED_SUCCESSFULLY, users);
});

/**
 * @desc    Create a new user
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
export const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, status, institution } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (role === 'technician' && (!institution || institution.trim() === '')) {
        throw new AppError('Associated Hospital/Center (institution) is strictly required for technicians.', HTTP_STATUS.BAD_REQUEST);
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role: role || 'user',
        status: status || 'active',
        institution
    });

    // Remove password from response
    user.password = undefined;

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.USER_MGMT,
        action: 'Create User',
        resourceType: 'User',
        resourceId: user._id,
        req,
        targetUser: user._id,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Created new user: ${user.email} with role: ${user.role}`
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, SUCCESS_MESSAGES.CREATED_SUCCESSFULLY, user);
});

/**
 * @desc    Update a user
 * @route   PATCH /api/admin/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res) => {
    const { name, email, role, status, institution } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Prepare for diff tracking
    const beforeUpdate = user.toObject();

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;

    if (user.role === 'technician' && !institution && !user.institution) {
        throw new AppError('Associated Hospital/Center (institution) is strictly required for technicians.', HTTP_STATUS.BAD_REQUEST);
    }

    if (institution !== undefined) {
        // If they are explicitly clearing it for a technician
        if (user.role === 'technician' && institution.trim() === '') {
            throw new AppError('Associated Hospital/Center (institution) is strictly required for technicians and cannot be empty.', HTTP_STATUS.BAD_REQUEST);
        }
        user.institution = institution;
    }

    await user.save();

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.USER_MGMT,
        action: 'Update User',
        resourceType: 'User',
        resourceId: user._id,
        req,
        targetUser: user._id,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.LOW,
        details: `Updated user profile for: ${user.email}`,
        diff: {
            before: beforeUpdate,
            after: user.toObject()
        }
    });

    return sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.UPDATED_SUCCESSFULLY, user);
});

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
        throw new AppError('You cannot delete your own account', HTTP_STATUS.BAD_REQUEST);
    }

    await User.findByIdAndDelete(req.params.id);

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.USER_MGMT,
        action: 'Delete User',
        resourceType: 'User',
        resourceId: req.params.id,
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.HIGH,
        details: `Permanently deleted user account: ${user.email}`
    });

    return sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.DELETED_SUCCESSFULLY);
});

/**
 * @desc    Reset user password
 * @route   POST /api/admin/users/:id/reset-password
 * @access  Private/Admin
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword) {
        throw new AppError('New password is required', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    user.password = newPassword;
    await user.save();

    // Log Audit
    logAudit({
        category: AUDIT_CATEGORIES.SECURITY_CONFIG,
        action: 'Reset Password',
        resourceType: 'User',
        resourceId: user._id,
        req,
        targetUser: user._id,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.MEDIUM,
        details: `Administrative password reset for user: ${user.email}`
    });

    return sendSuccess(res, HTTP_STATUS.OK, 'Password reset successfully');
});

/**
 * @desc    Get admin dashboard overview stats (single API call)
 * @route   GET /api/admin/overview
 * @access  Private/Admin
 */
export const getOverviewStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
        activeSessions,
        totalUsers,
        roleBreakdown,
        pendingCases,
        finalizedToday,
        securityAlerts,
        revenueThisMonth,
        lastBackup
    ] = await Promise.all([
        // Active sessions: users with lastActive within 5 minutes
        User.countDocuments({ lastActive: { $gte: fiveMinutesAgo } }),

        // Total registered users
        User.countDocuments(),

        // Count per role
        User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]),

        // Pending cases (in the pipeline)
        Case.countDocuments({
            status: { $in: ["Uploaded", "QA_Pending", "QA_Review", "Assigned", "In_Progress"] }
        }),

        // Cases finalized today
        Case.countDocuments({
            status: "Finalized",
            updatedAt: { $gte: todayStart }
        }),

        // Security alerts in the last 24 hours
        AuditLog.countDocuments({
            severity: { $in: ["High", "Critical"] },
            timestamp: { $gte: twentyFourHoursAgo }
        }),

        // Revenue this month from invoices
        Invoice.aggregate([
            {
                $match: {
                    "period.month": currentMonth,
                    "period.year": currentYear
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),

        // Last successful backup
        Backup.findOne({ status: "success" }).sort({ createdAt: -1 }).select("createdAt backupId")
    ]);

    // Transform role breakdown into an object
    const roles = {};
    roleBreakdown.forEach(r => {
        roles[r._id] = r.count;
    });

    return sendSuccess(res, HTTP_STATUS.OK, "Overview stats fetched", {
        activeSessions,
        totalUsers,
        roles: {
            admin: roles.admin || 0,
            radiologist: roles.radiologist || 0,
            technician: roles.technician || 0,
            qa: roles.qa || 0,
            user: roles.user || 0,
        },
        pendingCases,
        finalizedToday,
        securityAlerts,
        revenueThisMonth: revenueThisMonth[0]?.total || 0,
        lastBackup: lastBackup ? {
            timestamp: lastBackup.createdAt,
            backupId: lastBackup.backupId
        } : null
    });
});

// ============================================================
// Storage Management
// ============================================================


/**
 * Recursively calculate the total size of a directory in bytes
 */
function getDirSize(dirPath) {
    let totalSize = 0;
    try {
        if (!fs.existsSync(dirPath)) return 0;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                totalSize += getDirSize(fullPath);
            } else {
                try {
                    totalSize += fs.statSync(fullPath).size;
                } catch { /* skip inaccessible files */ }
            }
        }
    } catch { /* directory unreadable */ }
    return totalSize;
}

/**
 * @desc    Get global storage overview stats
 * @route   GET /api/admin/storage-stats
 * @access  Private/Admin
 */
export const getStorageStats = asyncHandler(async (req, res) => {
    const uploadsDir = path.resolve('uploads', 'cases');

    // 1. Aggregate from DB and fetch system disk space
    const [dbStats, modalityStats, totalCases, systemDisk] = await Promise.all([
        Case.aggregate([
            { $unwind: { path: '$dicomFiles', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalDicomFiles: { $sum: { $cond: [{ $ifNull: ['$dicomFiles', false] }, 1, 0] } },
                    totalDbSize: { $sum: { $ifNull: ['$dicomFiles.size', 0] } }
                }
            }
        ]),
        Case.aggregate([
            { $unwind: { path: '$dicomFiles', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$modality',
                    size: { $sum: { $ifNull: ['$dicomFiles.size', 0] } },
                    count: { $sum: 1 }
                }
            }
        ]),
        Case.countDocuments(),
        getSystemDiskSpace()
    ]);

    // 2. Calculate actual disk usage by walking the uploads/cases directory
    let totalDiskUsage = 0;
    let largestCaseDir = { name: '', size: 0 };
    try {
        if (fs.existsSync(uploadsDir)) {
            const caseDirs = fs.readdirSync(uploadsDir, { withFileTypes: true });
            for (const dir of caseDirs) {
                if (dir.isDirectory()) {
                    const dirSize = getDirSize(path.join(uploadsDir, dir.name));
                    totalDiskUsage += dirSize;
                    if (dirSize > largestCaseDir.size) {
                        largestCaseDir = { name: dir.name, size: dirSize };
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Storage Stats] Error reading uploads directory:', err.message);
    }

    // 3. Try to find the largest case's DB record for patient info
    let largestCase = null;
    if (largestCaseDir.name) {
        const caseDoc = await Case.findOne({
            $or: [
                { studyInstanceUID: largestCaseDir.name },
                { studyDirectory: { $regex: largestCaseDir.name } }
            ]
        }).select('patientName modality studyDate').lean();
        if (caseDoc) {
            largestCase = {
                id: caseDoc._id,
                patientName: caseDoc.patientName,
                modality: caseDoc.modality,
                size: largestCaseDir.size
            };
        }
    }

    // 4. Build modality breakdown
    const storageByModality = {};
    modalityStats.forEach(m => {
        if (m._id) storageByModality[m._id] = m.size;
    });

    const stats = dbStats[0] || { totalDicomFiles: 0, totalDbSize: 0 };

    return sendSuccess(res, HTTP_STATUS.OK, "Storage stats fetched", {
        totalCases,
        totalDiskUsage,
        totalDicomFiles: stats.totalDicomFiles,
        averageCaseSize: totalCases > 0 ? Math.round(totalDiskUsage / totalCases) : 0,
        largestCase,
        storageByModality,
        totalDiskSpace: systemDisk.totalSpace,
        freeDiskSpace: systemDisk.freeSpace
    });
});

/**
 * @desc    Get paginated case list with per-case disk usage
 * @route   GET /api/admin/storage-cases
 * @access  Private/Admin
 */
export const getStorageCases = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, sortBy = 'date' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const uploadsDir = path.resolve('uploads', 'cases');

    // Build query
    const query = {};
    if (search) {
        query.$or = [
            { patientName: { $regex: search, $options: 'i' } },
            { patientId: { $regex: search, $options: 'i' } },
            { accessionNumber: { $regex: search, $options: 'i' } },
            { institution: { $regex: search, $options: 'i' } }
        ];
    }

    // Determine sort
    let sort = {};
    switch (sortBy) {
        case 'name': sort = { patientName: 1 }; break;
        case 'modality': sort = { modality: 1 }; break;
        case 'status': sort = { status: 1 }; break;
        case 'oldest': sort = { studyDate: 1 }; break;
        case 'date':
        default: sort = { studyDate: -1 }; break;
    }

    const [cases, totalCount] = await Promise.all([
        Case.find(query)
            .select('patientName patientId modality studyDate status institution dicomFiles attachments studyDirectory studyInstanceUID')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Case.countDocuments(query)
    ]);

    // Enrich each case with actual disk usage
    const enriched = cases.map(c => {
        // Calculate DB-recorded file sizes
        const dicomFileCount = c.dicomFiles?.length || 0;
        const attachmentCount = c.attachments?.length || 0;
        const dbSize = (c.dicomFiles || []).reduce((sum, f) => sum + (f.size || 0), 0);

        // Calculate actual disk usage from filesystem
        let diskUsage = dbSize;
        const caseDir = c.studyDirectory || path.join(uploadsDir, c.studyInstanceUID);
        try {
            if (fs.existsSync(caseDir)) {
                diskUsage = getDirSize(caseDir);
            }
        } catch { /* fallback to DB size */ }

        return {
            _id: c._id,
            patientName: c.patientName,
            patientId: c.patientId,
            modality: c.modality,
            studyDate: c.studyDate,
            status: c.status,
            institution: c.institution,
            dicomFileCount,
            attachmentCount,
            diskUsage
        };
    });

    // If sorting by size, do it in-memory (since disk size isn't a DB field)
    if (sortBy === 'size') {
        enriched.sort((a, b) => b.diskUsage - a.diskUsage);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Storage cases fetched", {
        cases: enriched,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        }
    });
});
