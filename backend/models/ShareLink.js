import mongoose from 'mongoose';

const ShareLinkSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: [true, 'Token is required'],
            unique: true,
            index: true,
        },
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            required: [true, 'Case ID is required'],
        },
        studyInstanceUID: {
            type: String,
            required: [true, 'StudyInstanceUID is required'],
        },
        role: {
            type: String,
            required: [true, 'Role is required'],
            enum: ['radiologist', 'technician', 'qa', 'user'],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        expiresAt: {
            type: Date,
            required: [true, 'Expiration date is required'],
            index: { expires: '0' } // TTL index
        },
        isRevoked: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('ShareLink', ShareLinkSchema);
