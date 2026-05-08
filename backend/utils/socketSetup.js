import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { authenticateSocket } from './socketAuth.js';
import {
  saveMessage,
  getCaseMessages,
  markAsDelivered,
  markAsRead,
  markMultipleAsRead,
  getUnreadCountForCase,
  getUnreadMessagesForUser
} from '../services/messageService.js';
import * as notificationService from '../services/notificationService.js';
import Case from '../models/Case.js';
import logger from '../config/logger.js';
import taskManager from './taskManager.js';



let io;

/**
 * Initialize Socket.io server with authentication and event handling
 */
export const initializeSocket = (server, allowedOrigins = []) => {
  // Create Socket.io instance
  const origins = allowedOrigins.length > 0 ? allowedOrigins : [
    process.env.FRONTEND_URL,
    "http://localhost:8080",
    "https://armorray.com",
    "https://www.armorray.com"
  ].filter(Boolean); // removes undefined if FRONTEND_URL not set
  io = new Server(server, {
    cors: {
      origin: origins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true
    },
    transports: ['polling'],
    // transports: ['polling', 'websocket'],
    allowEIO3: true
  });

  // Set up Redis adapter for multi-server scaling (optional)
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));

    logger.info('Redis adapter configured for Socket.io');
  }

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle new connections
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId} (${socket.userName})`);

    // Join default room based on user ID
    socket.join(socket.userId);

    // Handle joining a case room
    socket.on('join-room', async (data, callback) => {
      try {
        const { caseId } = data;

        // Verify user has access to this case
        // In a real implementation, you would check permissions in the database
        // For now, we'll trust the authorization was done on the frontend

        // Join the case-specific room
        socket.join(caseId);

        // Fetch recent messages for this case with role-based filtering
        const messages = await getCaseMessages(caseId, socket.userRole, socket.userId, 50, 0);

        // Get unread count for this user with role-based filtering
        const unreadCount = await getUnreadCountForCase(caseId, socket.userId, socket.userRole);

        // Send existing messages to the user
        socket.emit('room-messages', { caseId, messages });

        // Get all users currently in the room
        const sockets = await io.in(caseId).fetchSockets();
        const activeParticipants = sockets.map(s => ({
          userId: s.userId,
          userName: s.userName,
          userRole: s.userRole,
          isOnline: true
        }));

        // Notify other users in the room that someone joined
        socket.to(caseId).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
          caseId
        });

        logger.info(`User ${socket.userName} joined room ${caseId}`);

        // Execute callback if provided
        if (callback) {
          callback({
            success: true,
            message: 'Successfully joined room',
            participants: activeParticipants,
            unreadCount
          });
        }
      } catch (error) {
        logger.error(`Error joining room: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle leaving a case room
    socket.on('leave-room', (data, callback) => {
      try {
        const { caseId } = data;

        socket.leave(caseId);

        // Notify other users in the room that someone left
        socket.to(caseId).emit('user-left', {
          userId: socket.userId,
          caseId
        });

        logger.info(`User ${socket.userName} left room ${caseId}`);

        if (callback) {
          callback({ success: true, message: 'Successfully left room' });
        }
      } catch (error) {
        logger.error(`Error leaving room: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle sending a message
    socket.on('send-message', async (data, callback) => {
      try {
        const { caseId, text, messageType = 'text', chatType = 'group' } = data;

        // Validate required fields
        if (!caseId || !text?.trim()) {
          throw new Error('Missing required fields: caseId or text');
        }

        // Create message object
        const messageData = {
          caseId,
          senderId: socket.userId,
          senderName: socket.userName,
          senderRole: socket.userRole,
          text: text.trim(),
          messageType,
          chatType
        };

        // Save message to database
        const savedMessage = await saveMessage(messageData);

        // Mark as delivered to sender immediately
        await markAsDelivered(savedMessage._id, socket.userId);

        // Emit message only to users who should see it
        const roomSockets = await io.in(caseId).fetchSockets();
        for (const roomSocket of roomSockets) {
          if (roomSocket.userId === socket.userId) continue;

          // Check if this user should see this message
          const shouldSee = chatType === 'group' || roomSocket.userRole === chatType;

          if (shouldSee) {
            roomSocket.emit('new-message', {
              ...savedMessage.toObject(),
              deliveryStatus: 'sent'
            });
          }
        }

        // Also emit to sender so their message gets a proper ID
        socket.emit('message-sent', {
          ...savedMessage.toObject(),
          acknowledged: true,
          deliveryStatus: 'delivered'
        });

        // Update unread counts for relevant users in the room
        for (const roomSocket of roomSockets) {
          if (roomSocket.userId !== socket.userId) {
            // Only update if they can see this message
            const canSee = chatType === 'group' || roomSocket.userRole === chatType;
            if (canSee) {
              const unreadCount = await getUnreadCountForCase(caseId, roomSocket.userId, roomSocket.userRole);
              roomSocket.emit('unread-count-update', { caseId, count: unreadCount });
            }
          }
        }

        logger.info(`Message sent in room ${caseId} by ${socket.userName}`);

        if (callback) {
          callback({ success: true, messageId: savedMessage._id });
        }

        // Create notifications for other participants
        try {
          const caseData = await Case.findById(caseId).populate('uploadedBy assignedRadiologist qaVerification.verifiedBy');
          if (caseData) {
            const technicianId = caseData.uploadedBy?._id?.toString();
            const radiologistId = caseData.assignedRadiologist?._id?.toString();
            const qaId = caseData.qaVerification?.verifiedBy?._id?.toString();

            let notifyList = [];

            if (chatType === 'group' || !chatType) {
              // Group chat: Notify everyone except sender
              const allParticipants = new Set();
              if (technicianId) allParticipants.add(technicianId);
              if (radiologistId) allParticipants.add(radiologistId);
              if (qaId) allParticipants.add(qaId);

              notifyList = Array.from(allParticipants).filter(id => id !== socket.userId.toString());
            } else if (chatType === 'radiologist') {
              // Targeted Radiologist chat: Only notify radiologist if they aren't the sender
              if (radiologistId && radiologistId !== socket.userId.toString()) {
                notifyList = [radiologistId];
              }
            } else if (chatType === 'technician') {
              // Targeted Technician chat: Only notify technician if they aren't the sender
              if (technicianId && technicianId !== socket.userId.toString()) {
                notifyList = [technicianId];
              }
            } else if (chatType === 'qa') {
              // Targeted QA chat: Only notify QA if they aren't the sender
              if (qaId && qaId !== socket.userId.toString()) {
                notifyList = [qaId];
              }
            }

            for (const recipientId of notifyList) {
              await notificationService.createNotification(io, {
                recipientId,
                type: 'chat',
                title: `New Message from ${socket.userName}`,
                message: text.trim(),
                relatedId: caseId
              });
            }
          }
        } catch (notifyError) {
          logger.error(`Error sending chat notifications: ${notifyError.message}`);
        }
      } catch (error) {
        logger.error(`Error sending message: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle message read receipt
    socket.on('message-read', async (data, callback) => {
      try {
        const { messageId } = data;

        await markAsRead(messageId, socket.userId);

        // Notify sender that message was read
        // We'd need to find the original sender to notify them
        // This would require additional logic to track message ownership

        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        logger.error(`Error marking message as read: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle message delivery confirmation
    socket.on('message-delivered', async (data, callback) => {
      try {
        const { messageId, caseId } = data;

        const updatedMessage = await markAsDelivered(messageId, socket.userId);

        // Notify the sender that message was delivered
        socket.to(caseId).emit('message-delivery-confirmed', {
          messageId,
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date()
        });

        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        logger.error(`Error marking message as delivered: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle bulk message read receipts
    socket.on('messages-read', async (data, callback) => {
      try {
        const { messageIds, caseId } = data;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
          throw new Error('messageIds must be a non-empty array');
        }

        await markMultipleAsRead(messageIds, socket.userId);

        // Broadcast read receipts to all users in the room
        socket.to(caseId).emit('message-read-receipt', {
          messageIds,
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
          timestamp: new Date()
        });

        // Update unread count for this user
        const newUnreadCount = await getUnreadCountForCase(caseId, socket.userId, socket.userRole);
        socket.emit('unread-count-update', { caseId, count: newUnreadCount });

        if (callback) {
          callback({ success: true, unreadCount: newUnreadCount });
        }
      } catch (error) {
        logger.error(`Error marking messages as read: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle get unread count request
    socket.on('get-unread-count', async (data, callback) => {
      try {
        const { caseId } = data;

        const unreadCount = await getUnreadCountForCase(caseId, socket.userId, socket.userRole);

        if (callback) {
          callback({ success: true, count: unreadCount });
        }
      } catch (error) {
        logger.error(`Error getting unread count: ${error.message}`);

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle get user notifications
    socket.on('get-notifications', async (data, callback) => {
      try {
        const notifications = await notificationService.getNotifications(socket.userId);
        const unreadCount = await notificationService.getUnreadCount(socket.userId);

        if (callback) {
          callback({
            success: true,
            notifications,
            unreadCount
          });
        }
      } catch (error) {
        logger.error(`Error getting notifications: ${error.message}`);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Handle mark notification as read
    socket.on('mark-notification-read', async (data, callback) => {
      try {
        const { notificationId } = data;
        await notificationService.markAsRead(notificationId);
        const unreadCount = await notificationService.getUnreadCount(socket.userId);

        // Emit updated count to user
        socket.emit('notification-count-update', { unreadCount });

        if (callback) callback({ success: true, unreadCount });
      } catch (error) {
        logger.error(`Error marking notification as read: ${error.message}`);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Handle mark all notifications as read
    socket.on('mark-all-notifications-read', async (data, callback) => {
      try {
        await notificationService.markAllAsRead(socket.userId);
        socket.emit('notification-count-update', { unreadCount: 0 });

        if (callback) callback({ success: true, unreadCount: 0 });
      } catch (error) {
        logger.error(`Error marking all notifications as read: ${error.message}`);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      try {
        const { caseId } = data;
        socket.to(caseId).emit('user-typing', {
          userId: socket.userId,
          userName: socket.userName,
          caseId
        });
      } catch (error) {
        logger.error(`Error handling typing start: ${error.message}`);
      }
    });

    socket.on('typing-stop', (data) => {
      try {
        const { caseId } = data;
        socket.to(caseId).emit('user-stopped-typing', {
          userId: socket.userId,
          caseId
        });
      } catch (error) {
        logger.error(`Error handling typing stop: ${error.message}`);
      }
    });

    // Handle user presence
    socket.on('user-presence', (data) => {
      try {
        const { caseId, isOnline = true } = data;
        socket.to(caseId).emit('user-presence-update', {
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
          isOnline,
          caseId
        });
      } catch (error) {
        logger.error(`Error handling user presence: ${error.message}`);
      }
    });

    // Handle task synchronization for page refresh reconnection
    socket.on('task:sync', (data, callback) => {
      try {
        // Filter tasks by user: if socket.userId is available, only return tasks for that user
        const activeTasks = taskManager.getActiveTasks(socket.userId || null);
        if (callback) {
          callback({ success: true, activeTasks });
        }
      } catch (error) {
        logger.error(`Error checking active tasks: ${error.message}`);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.userId} (${socket.userName}), reason: ${reason}`);

      // Notify rooms that user left
      // We don't know which rooms they were in, so we'd need to track that
      // For now, we'll just log the disconnection
    });

    // Handle error events
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  logger.info('Socket.io initialized successfully');

  return io;
};

/**
 * Get the Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};