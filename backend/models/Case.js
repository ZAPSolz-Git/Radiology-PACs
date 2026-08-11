import mongoose from "mongoose";

const CaseSchema = new mongoose.Schema(
    {
        // --- Attribution (Who & Where) ---
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        assignedRadiologist: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        assignedPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ApiKey",
            default: null,
            index: true,
        },
        // Link to dedicated Patient record
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
            index: true,
        },
        // Unique identifier for the study (SOP Study Instance UID or safe generated UUID)
        studyInstanceUID: {
            type: String,
            required: true,
            unique: true,
        },
        // Base directory for study files: uploads/cases/<id>
        studyDirectory: {
            type: String,
        },
        orthancStudyId: {
            type: String,
            sparse: true
        },
        expectedFiles: {
            type: Number,
            default: 0
        },
        // --- Ingestion Source ---
        source: {
            type: String,
            enum: ['FOLDER_UPLOAD', 'PACS_IMPORT', 'PACS_PUSH'],
            default: 'FOLDER_UPLOAD',
            index: true
        },

        // --- Patient Demographics ---
        patientName: {
            type: String,
            required: [true, "Patient Name is required"],
            trim: true,
        },
        patientId: {
            type: String,
            required: [true, "Patient ID/MRN is required"],
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
        accessionNumber: {
            type: String,
            trim: true,
            index: true
        },
        institution: {
            type: String,
            trim: true
        },

        // --- Clinical Information ---
        referringDoctor: {
            type: String,
            trim: true,
        },
        clinicalHistory: {
            type: String,
            default: "",
        },
        indication: {
            type: String,
            // "Why the case is performed" (e.g., Trauma, Rule out Stroke)
        },

        // --- Scan Information ---
        modality: {
            type: String,
            required: true,
            // CT, MRI, XRAY, US
        },
        bodyPart: {
            type: String,
            required: true,
        },
        studyDate: {
            type: Date,
            default: Date.now,
        },
        contrast: {
            isGiven: {
                type: Boolean,
                default: false,
            },
            dose: {
                type: String,
                default: "",
            },
        },
        specialInstructions: {
            type: String,
            default: "",
        },

        dicomFiles: [
            {
                name: String,
                path: String, // Relative path
                size: Number,

                // --- DICOM Metadata (Cached for Viewer) ---
                sopInstanceUID: { type: String, index: true },
                seriesInstanceUID: { type: String, index: true },
                sopClassUID: String,
                instanceNumber: Number,
                seriesNumber: Number,
                seriesDescription: String,
                modality: String,
                studyDescription: String,
                studyDate: String,
                studyTime: String,

                // Geometry
                rows: Number,
                columns: Number,
                pixelSpacing: [Number], // [Row, Col]
                sliceThickness: Number,
                spacingBetweenSlices: Number,
                imagePositionPatient: [Number],
                imageOrientationPatient: [Number],
                frameOfReferenceUID: String,

                // Pixel Data
                bitsAllocated: Number,
                bitsStored: Number,
                highBit: Number,
                pixelRepresentation: Number,
                samplesPerPixel: Number,
                photometricInterpretation: String,

                // Windowing / Lut
                windowCenter: Number,
                windowWidth: Number,
                rescaleIntercept: Number,
                rescaleSlope: Number,

                transferSyntax: String
            }
        ],
        attachments: [
            {
                name: String,
                url: { type: String, required: true },
                path: String, // Relative path from uploads/
                fileType: String, // 'image/jpeg', 'application/pdf'
                category: {
                    type: String,
                    enum: ["Lab", "OldReport", "OldImage", "Snapshot", "ClinicalImage"],
                    default: "OldReport",
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // --- Workflow Status ---
        status: {
            type: String,
            enum: [
                "Uploaded",      // Initial upload (Draft)
                "QA_Pending",    // Submitted by Tech, waiting for QA
                "QA_Review",     // QA is actively looking at it
                "Assigned",      // QA approved, Doctor assigned
                "In_Progress",   // Doctor opened the case
                "QA_Audit",      // Doctor submitted report, QA auditing
                "Rep_Correction",// QA sent back to Doctor
                "Finalized",     // Medico-legal lock
                "Rejected",      // QA sent back to Tech
                "Incomplete"     // Interrupted PACS transfer
            ],
            default: "Uploaded",
            index: true,
        },
        isEmergency: {
            type: Boolean,
            default: false,
        },
        rejectionReason: {
            type: String,
            default: "",
        },

        // --- TAT & Deadlines ---
        urgency: {
            type: String,
            enum: ["Routine", "STAT"],
            default: "Routine",
        },
        deadline: {
            type: Date,
            // Calculated middleware will set this based on urgency
        },

        // --- Quality Assurance (Advanced) ---
        qaVerification: {
            verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            verifiedAt: Date,
            identityMatch: { type: Boolean, default: false },
            imageQuality: { type: String, enum: ["Optimal", "Adequate", "Suboptimal", "Unacceptable"], default: "Optimal" },
            protocolValid: { type: Boolean, default: false },
            contrastCheck: { type: Boolean, default: false },
            notes: String
        },

        // --- Automated Integrity Analysis (Phase 1 & 2) ---
        integrityResults: {
            score: { type: Number, default: 0 },
            status: { type: String, enum: ["Pass", "Warning", "Fail", "Pending"], default: "Pending" },
            lastRun: Date,
            findings: [
                {
                    level: { type: String, enum: ["Metadata", "Structural", "Clinical", "AI"] },
                    type: { type: String, enum: ["Error", "Warning", "Info"] },
                    message: String,
                    seriesInstanceUID: String,
                    details: mongoose.Schema.Types.Mixed
                }
            ],
            metadataHealth: { type: Number, default: 0 },
            structuralHealth: { type: Number, default: 0 }
        },

        // --- Reporting Module ---
        report: {
            author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            findings: String,
            impression: String,
            docxUrl: String,
            docxPath: String,
            measurements: [
                {
                    label: String,
                    value: String,
                    seriesInstanceUID: String
                }
            ],
            keyImages: [String], // Array of SOP UIDs
            jsonContent: String, // Tiptap JSON content for perfect formatting persistence
            banner: { type: mongoose.Schema.Types.ObjectId, ref: "Banner" },
            status: { type: String, enum: ["Draft", "Submitted", "Correction", "Final"], default: "Draft" },
            version: { type: Number, default: 0 },
            submittedAt: Date,
            finalizedAt: Date
        },

        // --- Financial Lock (Snapshot during Finalize) ---
        billingInfo: {
            basePrice: { type: Number, default: 0 },
            emergencySurcharge: { type: Number, default: 0 },
            nightHolidaySurcharge: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            radiologistEarning: { type: Number, default: 0 },
            tariffId: { type: mongoose.Schema.Types.ObjectId, ref: "Tariff" },
            invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
            payoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Payout" },
            lockedAt: Date
        },

        // --- Audit & Timeline ---
        timeline: [
            {
                action: String, // e.g., "Case Uploaded", "Report Submitted"
                status: String, // Current status at time of action
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                userName: String,
                role: String,
                timestamp: { type: Date, default: Date.now },
                details: String, // Additional context
                metadata: mongoose.Schema.Types.Mixed // Structured data for complex events
            }
        ],

        // --- Technician Checklist (Legacy Compatible) ---
        checklist: {
            detailsVerified: { type: Boolean, default: false },
            historyAdded: { type: Boolean, default: false },
            correctStudy: { type: Boolean, default: false },
            allSeriesUploaded: { type: Boolean, default: false },
        },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: compute remaining TAT seconds from the deadline
CaseSchema.virtual('tatRemainingSeconds').get(function () {
    if (!this.deadline) return 0;

    // If the case is finalized, the TAT clock stops exactly when it was finalized.
    // This allows us to see how much time was left (or by how much SLA was breached) at completion.
    if (this.status === 'Finalized') {
        const endTime = this.report?.finalizedAt 
            ? new Date(this.report.finalizedAt).getTime() 
            : new Date(this.updatedAt).getTime();
        return Math.round((new Date(this.deadline).getTime() - endTime) / 1000);
    }

    return Math.round((new Date(this.deadline).getTime() - Date.now()) / 1000);
});

// Helper method to add timeline entries
CaseSchema.methods.addTimelineEntry = function (action, user, details = '', metadata = null) {
    this.timeline.push({
        action,
        status: this.status,
        user: user._id,
        userName: user.name,
        role: user.role,
        details,
        metadata,
        timestamp: new Date()
    });
};

export default mongoose.model("Case", CaseSchema);
