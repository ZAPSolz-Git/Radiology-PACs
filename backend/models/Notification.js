import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['chat', 'case'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedId: {
        type: String, // caseId or other identifier
        required: true
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient querying of unread notifications for a user
NotificationSchema.index({ recipientId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;
