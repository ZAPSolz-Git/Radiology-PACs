import mongoose from "mongoose";

const TemplateSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String, // Can store HTML or a DOCX reference/placeholder
            required: true,
        },
        modality: {
            type: String,
            required: true,
            enum: ["CT", "MRI", "X-Ray", "US", "PET-CT"],
        },
        bodyPart: {
            type: String,
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Template", TemplateSchema);
