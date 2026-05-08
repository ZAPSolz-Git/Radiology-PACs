import mongoose from "mongoose";

const ApiKeySchema = new mongoose.Schema(
    {
        partnerName: {
            type: String,
            required: [true, "Partner name is required"],
            trim: true,
        },
        // bcrypt hash of the raw API key — raw key is NEVER stored
        keyHash: {
            type: String,
            required: true,
        },
        // First 16 characters of the raw key for display + indexed lookup
        keyPrefix: {
            type: String,
            required: true,
            unique: true,
            index: true,
            maxlength: 16,
        },
        scopes: {
            type: [String],
            enum: ["read:cases", "write:reports"],
            default: ["read:cases"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            default: null, // null = never expires
        },
        lastUsedAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        rateLimit: {
            type: Number,
            default: 100, // requests per minute
        },
        ipWhitelist: {
            type: [String], // e.g. ["203.0.113.5", "198.51.100.0/24"]
            default: [],
        },
    },
    { timestamps: true }
);

export default mongoose.model("ApiKey", ApiKeySchema);
