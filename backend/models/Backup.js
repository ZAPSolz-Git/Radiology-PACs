import mongoose from "mongoose";

const BackupSchema = new mongoose.Schema(
    {
        backupId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        type: {
            type: String,
            enum: ["automatic", "manual"],
            default: "manual",
        },
        status: {
            type: String,
            enum: ["success", "failed", "in-progress"],
            default: "in-progress",
            index: true,
        },
        size: {
            type: String, // e.g., "1.45 GB"
            default: "0 KB",
        },
        sizeBytes: {
            type: Number,
            default: 0,
        },
        filePath: {
            type: String, // path to the .gz archive on disk
        },
        retention: {
            type: String,
            default: "90 days",
        },
        triggeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        errorMessage: String,
        collections: [String], // which collections were backed up
    },
    { timestamps: true }
);

export default mongoose.model("Backup", BackupSchema);
