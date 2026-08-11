import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
    {
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: [true, "Comment content is required"],
            trim: true,
        },
        isSystemMessage: {
            type: Boolean,
            default: false, // True for auto-generated messages like "Case Assigned"
        },
    },
    { timestamps: true }
);

export default mongoose.model("Comment", CommentSchema);
