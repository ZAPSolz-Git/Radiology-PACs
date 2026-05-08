import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['AUTH', 'USER_MGMT', 'CASE_WORKFLOW', 'SECURITY_CONFIG', 'DATA_ACCESS', 'FINANCIAL', 'SYSTEM', 'EXTERNAL_API'],
        default: 'SYSTEM',
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    resourceType: String, // e.g., 'Case', 'User', 'Setting'
    resourceId: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userName: String,
    role: String,
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    status: {
        type: String,
        enum: ['Success', 'Failure', 'Warning', 'Info', 'Critical'],
        default: 'Info'
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low',
        index: true
    },
    ipAddress: String,
    userAgent: String,
    details: String,
    diff: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: false });

export default mongoose.model('AuditLog', AuditLogSchema);
