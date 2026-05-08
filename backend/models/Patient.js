import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Patient Name is required"],
            trim: true,
        },
        patientId: {
            type: String,
            required: [true, "Patient ID/MRN is required"],
            unique: true,
            trim: true,
            index: true,
        },
        age: {
            type: Number,
            required: [true, "Age is required"],
        },
        gender: {
            type: String,
            enum: ["M", "F", "O"],
            required: [true, "Gender is required"],
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Patient", PatientSchema);
