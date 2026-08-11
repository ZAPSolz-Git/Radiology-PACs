import Notification from '../models/Notification.js';

/**
 * Create a new notification and emit it to the user via socket
 */
export const createNotification = async (io, data) => {
    try {
        const { recipientId, type, title, message, relatedId } = data;

        const notification = new Notification({
            recipientId,
            type,
            title,
            message,
            relatedId
        });

        await notification.save();

        // Emit to the specific user's room (assuming their room name is their userId)
        if (io) {
            io.to(recipientId.toString()).emit('new-notification', notification);

            // Also emit a count update
            const unreadCount = await getUnreadCount(recipientId);
            io.to(recipientId.toString()).emit('notification-count-update', { unreadCount });
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Get notifications for a specific user
 */
export const getNotifications = async (userId, limit = 50) => {
    return await Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Get unread count for a specific user
 */
export const getUnreadCount = async (userId) => {
    return await Notification.countDocuments({ recipientId: userId, isRead: false });
};

/**
 * Mark a specific notification as read
 */
export const markAsRead = async (notificationId) => {
    return await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
    );
};

/**
 * Mark all notifications as read for a specific user
 */
export const markAllAsRead = async (userId) => {
    return await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { isRead: true }
    );
};

/**
 * Helper to notify all participants in a case chat EXCEPT the sender
 */
export const notifyChatParticipants = async (io, senderId, caseId, messageText, senderName, roomUsers) => {
    try {
        // roomUsers should be an array of user objects with _id
        for (const roomUser of roomUsers) {
            if (roomUser._id.toString() !== senderId.toString()) {
                await createNotification(io, {
                    recipientId: roomUser._id,
                    type: 'chat',
                    title: `New Message from ${senderName}`,
                    message: messageText.length > 50 ? `${messageText.substring(0, 47)}...` : messageText,
                    relatedId: caseId
                });
            }
        }
    } catch (error) {
        console.error('Error notifying chat participants:', error);
    }
};
