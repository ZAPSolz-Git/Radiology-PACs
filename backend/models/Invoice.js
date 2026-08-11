import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
    {
        invoiceId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        technician: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        institutionName: {
            type: String,
            required: true,
        },
        period: {
            month: {
                type: Number,
                required: true,
            },
            year: {
                type: Number,
                required: true,
            },
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
        amount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "paid", "partial"],
            default: "pending",
        },
        dueDate: {
            type: Date,
            required: true,
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        paidAt: Date,
        notes: String,
    },
    { timestamps: true }
);

// Index for filtering by period
InvoiceSchema.index({ "period.year": 1, "period.month": 1 });

export default mongoose.model("Invoice", InvoiceSchema);
