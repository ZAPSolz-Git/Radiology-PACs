import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";
import Backup from "../models/Backup.js";
import Case from "../models/Case.js";
import AuditLog from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, "..", "uploads", "backups");
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Helper: Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Helper: Generate a sequential backup ID
 */
async function generateBackupId() {
    const now = new Date();
    const year = now.getFullYear();
    const count = await Backup.countDocuments({
        createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
        },
    });
    return `BK-${year}-${String(count + 1).padStart(3, "0")}`;
}

/**
 * @desc    Get all backup records
 * @route   GET /api/backups
 * @access  Private (Admin only)
 */
export const getAllBackups = asyncHandler(async (req, res) => {
    const backups = await Backup.find()
        .sort({ createdAt: -1 })
        .populate("triggeredBy", "name email");

    return sendSuccess(res, HTTP_STATUS.OK, "Backups fetched successfully", backups);
});

/**
 * @desc    Get vault statistics (storage, health, next job)
 * @route   GET /api/backups/stats
 * @access  Private (Admin only)
 */
export const getBackupStats = asyncHandler(async (req, res) => {
    // Total vault storage
    const allBackups = await Backup.find({ status: "success" });
    const totalBytes = allBackups.reduce((sum, b) => sum + (b.sizeBytes || 0), 0);
    const totalStorage = formatBytes(totalBytes);

    // Health: check if the last backup was successful
    const lastBackup = await Backup.findOne().sort({ createdAt: -1 });
    let health = "Healthy";
    let healthDetail = "All Jobs Verified";
    if (lastBackup && lastBackup.status === "failed") {
        health = "Degraded";
        healthDetail = "Last Job Failed";
    }
    if (!lastBackup) {
        health = "No Backups";
        healthDetail = "No snapshots taken yet";
    }

    // Total backup count
    const totalBackups = await Backup.countDocuments();
    const successCount = await Backup.countDocuments({ status: "success" });
    const failedCount = await Backup.countDocuments({ status: "failed" });

    return sendSuccess(res, HTTP_STATUS.OK, "Backup stats fetched", {
        totalStorage,
        totalBytes,
        totalBackups,
        successCount,
        failedCount,
        health,
        healthDetail,
        lastBackupAt: lastBackup?.createdAt || null,
    });
});

/**
 * @desc    Trigger a full system backup (MongoDB + Case Files + Payout Receipts)
 * @route   POST /api/backups/trigger
 * @access  Private (Admin only)
 */
export const triggerManualBackup = asyncHandler(async (req, res) => {
    const backupId = await generateBackupId();

    // Create the backup record as in-progress
    const backup = await Backup.create({
        backupId,
        type: "manual",
        status: "in-progress",
        triggeredBy: req.user._id,
    });

    const mongoUri = process.env.MONGO_URI;
    const mongoDumpPath = process.env.MONGODUMP_PATH || "mongodump";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // Temp file for the mongodump, final archive is the .zip
    const dbDumpName = `${backupId}_db_${timestamp}.gz`;
    const dbDumpPath = path.join(BACKUP_DIR, dbDumpName);
    const archiveName = `${backupId}_${timestamp}.zip`;
    const archivePath = path.join(BACKUP_DIR, archiveName);

    const cmd = `"${mongoDumpPath}" --uri="${mongoUri}" --archive="${dbDumpPath}" --gzip`;

    // Send immediate response so the UI knows the job started
    res.status(202).json({
        success: true,
        message: "Backup job started (Database + Case Files + Payouts)",
        data: backup,
    });

    // Step 1: Run mongodump
    exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, async (error) => {
        try {
            if (error) {
                backup.status = "failed";
                if (error.message.includes("not recognized") || error.message.includes("ENOENT")) {
                    backup.errorMessage = "'mongodump' tool not found. Please install MongoDB Database Tools or set MONGODUMP_PATH in .env";
                } else {
                    backup.errorMessage = error.message.substring(0, 500);
                }
                await backup.save();
                console.error(`[Backup] ✗ Job ${backupId} failed:`, backup.errorMessage);
                return;
            }

            console.log(`[Backup] ✓ DB dump complete for ${backupId}. Now archiving files...`);

            // Step 2: Create a combined .zip archive
            const output = fs.createWriteStream(archivePath);
            const archive = archiver("zip", { zlib: { level: 6 } });

            output.on("close", async () => {
                try {
                    // Clean up the temp DB dump file
                    if (fs.existsSync(dbDumpPath)) {
                        fs.unlinkSync(dbDumpPath);
                    }

                    const archiveStats = fs.statSync(archivePath);
                    backup.status = "success";
                    backup.filePath = archivePath;
                    backup.sizeBytes = archiveStats.size;
                    backup.size = formatBytes(archiveStats.size);

                    // Record which folders were included
                    const included = ["database"];
                    const casesDir = path.join(UPLOADS_DIR, "cases");
                    const payoutsDir = path.join(UPLOADS_DIR, "payouts");
                    if (fs.existsSync(casesDir)) included.push("cases");
                    if (fs.existsSync(payoutsDir)) included.push("payouts");
                    backup.collections = included;

                    await backup.save();
                    console.log(`[Backup] ✓ Job ${backupId} fully completed. Archive: ${backup.size} (Includes: ${included.join(", ")})`);
                } catch (saveErr) {
                    console.error(`[Backup] Error finalizing:`, saveErr);
                }
            });

            archive.on("error", async (archiveErr) => {
                backup.status = "failed";
                backup.errorMessage = `Archive error: ${archiveErr.message}`.substring(0, 500);
                await backup.save();
                console.error(`[Backup] ✗ Archive failed for ${backupId}:`, archiveErr.message);
            });

            archive.pipe(output);

            // Add the MongoDB dump file
            if (fs.existsSync(dbDumpPath)) {
                archive.file(dbDumpPath, { name: "database/mongodump.gz" });
            }

            // Add case files (DICOM studies, attachments, etc.)
            const casesDir = path.join(UPLOADS_DIR, "cases");
            if (fs.existsSync(casesDir)) {
                archive.directory(casesDir, "cases");
                console.log(`[Backup] → Adding cases folder...`);
            }

            // Add payout receipts
            const payoutsDir = path.join(UPLOADS_DIR, "payouts");
            if (fs.existsSync(payoutsDir)) {
                archive.directory(payoutsDir, "payouts");
                console.log(`[Backup] → Adding payouts folder...`);
            }

            await archive.finalize();
        } catch (outerErr) {
            console.error(`[Backup] Unexpected error:`, outerErr);
            backup.status = "failed";
            backup.errorMessage = outerErr.message?.substring(0, 500);
            await backup.save();
        }
    });
});

/**
 * @desc    Download a backup archive
 * @route   GET /api/backups/:id/download
 * @access  Private (Admin only)
 */
export const downloadBackup = asyncHandler(async (req, res) => {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
        throw new AppError("Backup not found", HTTP_STATUS.NOT_FOUND);
    }
    if (backup.status !== "success" || !backup.filePath) {
        throw new AppError("Backup file is not available for download", HTTP_STATUS.BAD_REQUEST);
    }
    if (!fs.existsSync(backup.filePath)) {
        throw new AppError("Backup file missing from disk", HTTP_STATUS.NOT_FOUND);
    }

    const fileName = `${backup.backupId}.zip`;
    res.download(backup.filePath, fileName);
});

/**
 * @desc    Delete a backup record and its archive file
 * @route   DELETE /api/backups/:id
 * @access  Private (Admin only)
 */
export const deleteBackup = asyncHandler(async (req, res) => {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
        throw new AppError("Backup not found", HTTP_STATUS.NOT_FOUND);
    }

    // Delete file from disk if it exists
    if (backup.filePath && fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
    }

    await Backup.findByIdAndDelete(req.params.id);

    return sendSuccess(res, HTTP_STATUS.OK, "Backup deleted successfully");
});

/**
 * @desc    Get live compliance statistics
 * @route   GET /api/backups/compliance
 * @access  Private (Admin only)
 */
export const getComplianceStats = asyncHandler(async (req, res) => {
    // Locked Cases: Finalized cases count
    const lockedCases = await Case.countDocuments({ status: "Finalized" });

    // Access Checks: Total audit log entries
    const accessChecks = await AuditLog.countDocuments();

    // Violations: Audit log entries with status 'Failure' or severity 'Critical'/'High'
    const violations = await AuditLog.countDocuments({
        $or: [
            { status: "Failure" },
            { severity: { $in: ["Critical", "High"] } },
        ],
    });

    // Last Backup timestamp
    const lastBackup = await Backup.findOne({ status: "success" }).sort({ createdAt: -1 });

    // Compliance Score
    const totalCases = await Case.countDocuments();
    let complianceScore = 100;
    if (totalCases > 0 && violations > 0) {
        complianceScore = Math.max(0, 100 - (violations / totalCases) * 100);
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Compliance stats fetched", {
        lockedCases,
        accessChecks,
        violations,
        lastBackup: lastBackup?.createdAt || null,
        complianceScore: parseFloat(complianceScore.toFixed(1)),
    });
});
