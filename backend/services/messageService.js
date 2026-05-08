import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * Save a new message to the database
 */
export const saveMessage = async (messageData) => {
  try {
    const message = new Message({
      caseId: messageData.caseId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      text: messageData.text,
      messageType: messageData.messageType || 'text',
      chatType: messageData.chatType || 'group'
    });

    await message.save();
    return message;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

/**
 * Get messages for a specific case with role-based filtering
 */
export const getCaseMessages = async (caseId, userRole, userId, limit = 50, skip = 0) => {
  try {
    const query = {
      caseId,
      isDeleted: false
    };

    // Admins bypass role-based chatType filtering to monitor all channels
    if (userRole !== 'admin') {
      query.$or = [
        { chatType: 'group' },
        { chatType: userRole },
        { senderId: userId }
      ];
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name role email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return messages.reverse(); // Reverse to show oldest first (chronological order)
  } catch (error) {
    console.error('Error fetching case messages:', error);
    throw error;
  }
};

/**
 * Mark a message as delivered to a specific user
 */
export const markAsDelivered = async (messageId, userId) => {
  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: {
          deliveredTo: { userId, timestamp: new Date() }
        }
      },
      { new: true }
    ).populate('deliveredTo.userId', 'name role');

    return message;
  } catch (error) {
    console.error('Error marking message as delivered:', error);
    throw error;
  }
};

/**
 * Mark a message as read by a specific user
 */
export const markAsRead = async (messageId, userId) => {
  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: {
          readBy: { userId, timestamp: new Date() }
        }
      },
      { new: true }
    ).populate('readBy.userId', 'name role');

    return message;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Mark multiple messages as read by a specific user
 */
export const markMultipleAsRead = async (messageIds, userId) => {
  try {
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        'readBy.userId': { $ne: userId }
      },
      {
        $addToSet: {
          readBy: { userId, timestamp: new Date() }
        }
      }
    );

    return result;
  } catch (error) {
    console.error('Error marking multiple messages as read:', error);
    throw error;
  }
};

/**
 * Get user's unread message count for a specific case with role-based filtering
 */
export const getUnreadCountForCase = async (caseId, userId, userRole) => {
  try {
    const query = {
      caseId,
      isDeleted: false,
      senderId: { $ne: userId }, // Don't count own messages
      'readBy.userId': { $ne: userId }
    };

    // Admins bypass filtering
    if (userRole !== 'admin') {
      query.$or = [
        { chatType: 'group' },
        { chatType: userRole }
      ];
    }

    const unreadCount = await Message.countDocuments(query);

    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Get unread messages for a user in a specific case with role-based filtering
 */
export const getUnreadMessagesForUser = async (caseId, userId, userRole, limit = 50) => {
  try {
    const query = {
      caseId,
      isDeleted: false,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId }
    };

    if (userRole !== 'admin') {
      query.$or = [
        { chatType: 'group' },
        { chatType: userRole }
      ];
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name role email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return messages.reverse();
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    throw error;
  }
};

/**
 * Update message as edited
 */
export const updateMessage = async (messageId, newText, userId) => {
  try {
    const message = await Message.findOne({ _id: messageId, senderId: userId });
    if (!message) {
      throw new Error('Message not found or unauthorized to edit');
    }

    message.text = newText;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    return message;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (messageId, userId, isHardDelete = false) => {
  try {
    const message = await Message.findOne({ _id: messageId, senderId: userId });
    if (!message) {
      throw new Error('Message not found or unauthorized to delete');
    }

    if (isHardDelete) {
      await Message.findByIdAndDelete(messageId);
    } else {
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();
    }

    return message;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};
