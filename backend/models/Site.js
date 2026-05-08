import mongoose from "mongoose";

/**
 * AE Title validation: max 16 chars, alphanumeric + underscores + hyphens only
 */
const aeTitleValidator = {
    validator: (v) => /^[A-Z0-9_\-]{1,16}$/.test(v),
    message: (props) => `${props.value} is not a valid AE Title (max 16 chars, uppercase alphanumeric/underscore/hyphen)`,
};

/**
 * Port validation: integer between 1 and 65535
 */
const portValidator = {
    validator: (v) => Number.isInteger(v) && v >= 1 && v <= 65535,
    message: (props) => `${props.value} is not a valid port number (must be 1-65535)`,
};

const SiteSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please add a site name"],
            unique: true,
            trim: true,
        },
        siteId: {
            type: String,
            required: [true, "Please add a unique Site ID"],
            unique: true,
            uppercase: true,
            trim: true,
        },

        // ─── Legacy DICOMweb fields (kept for backward compatibility) ───────
        gatewayUrl: {
            type: String,
        },
        siteSecret: {
            type: String,
            select: false,
        },

        // ─── Traditional DICOM / DIMSE fields ────────────────────────────────
        // PACS Server side (SCP = Service Class Provider — the hospital PACS)
        scpAETitle: {
            type: String,
            uppercase: true,
            trim: true,
            validate: aeTitleValidator,
        },
        scpIP: {
            type: String,
            trim: true,
            validate: {
                validator: (v) =>
                    /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(v),
                message: (props) => `${props.value} is not a valid IPv4 address`,
            },
        },
        scpPort: {
            type: Number,
            validate: portValidator,
        },

        // Our Application side (SCU = Service Class User — your server)
        scuAETitle: {
            type: String,
            uppercase: true,
            trim: true,
            validate: aeTitleValidator,
        },
        scuIP: {
            type: String,
            trim: true,
            validate: {
                validator: (v) =>
                    /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(v),
                message: (props) => `${props.value} is not a valid IPv4 address`,
            },
        },
        scuPort: {
            type: Number,
            validate: portValidator,
        },

        // ─── General ──────────────────────────────────────────────────────────
        isActive: {
            type: Boolean,
            default: true,
        },
        lastPing: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
        },
        assignedTechnician: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Site", SiteSchema);