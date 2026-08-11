import mongoose from 'mongoose';

const SecuritySettingSchema = new mongoose.Schema({
    enforce2FA: {
        type: Boolean,
        default: false
    },
    passwordRotationDays: {
        type: Number,
        default: 90
    },
    sessionTimeoutMinutes: {
        type: Number,
        default: 15
    },
    maxFailedAttempts: {
        type: Number,
        default: 5
    },
    lockoutDurationMinutes: {
        type: Number,
        default: 30
    },
    allowBiometricOverride: {
        type: Boolean,
        default: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Ensure only one settings document exists
SecuritySettingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

export default mongoose.model('SecuritySetting', SecuritySettingSchema);
