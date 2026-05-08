import mongoose from "mongoose";

const MacroSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true,
        },
        expansion: {
            type: String,
            required: true,
            trim: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Ensure unique keys per user
MacroSchema.index({ key: 1, author: 1 }, { unique: true });

export default mongoose.model("Macro", MacroSchema);
