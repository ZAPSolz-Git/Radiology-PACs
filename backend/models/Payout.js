import mongoose from "mongoose";

const PayoutSchema = new mongoose.Schema(
    {
        radiologist: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        payoutId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        period: {
            type: String, // e.g., "03-2026"
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            enum: ["Pending", "Paid"],
            default: "Pending",
            index: true,
        },
        cases: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Case",
            },
        ],
        caseCount: {
            type: Number,
            default: 0,
        },
        paidAt: {
            type: Date,
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Admin who generated it
            required: true,
        },
        attachments: [
            {
                url: String,
                name: String,
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
    },
    { timestamps: true }
);

// Compound index for idempotency per radiologist/period
PayoutSchema.index({ radiologist: 1, period: 1 });

export default mongoose.model("Payout", PayoutSchema);
