import mongoose from "mongoose";

const TariffSchema = new mongoose.Schema(
    {
        modality: {
            type: String,
            required: [true, "Modality is required"],
            enum: ["CT", "MRI", "X-Ray", "US", "PET-CT", "MG", "BMD", "OTHERS"],
            index: true
        },
        studyType: {
            type: String,
            required: [true, "Study / Procedure type is required"],
            trim: true
        },
        basePrice: {
            type: Number,
            required: [true, "Base price is required"],
            min: [0, "Price cannot be negative"]
        },
        emergencySurcharge: {
            type: Number,
            default: 0,
            min: [0, "Surcharge cannot be negative"]
        },
        nightHolidaySurcharge: {
            type: Number,
            default: 0,
            min: [0, "Surcharge cannot be negative"]
        },
        targetHospitalId: {
            type: String, // Can be ID or Name for filtering
            default: null,
            index: true
        },
        targetRadiologistId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Compound index to ensure uniqueness for global, hospital, or radiologist specific rules
TariffSchema.index({ modality: 1, studyType: 1, targetHospitalId: 1, targetRadiologistId: 1 }, { unique: true });

export default mongoose.model("Tariff", TariffSchema);
