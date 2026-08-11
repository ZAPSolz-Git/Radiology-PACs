import { Socket } from 'socket.io-client';

interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: any) => void;
  onNewMessage?: (message: any) => void;
  onRoomMessages?: (data: { caseId: string; messages: any[] }) => void;
  onUserJoined?: (data: { userId: string; userName: string; userRole: string; caseId: string }) => void;
  onUserLeft?: (data: { userId: string; caseId: string }) => void;
  onUserTyping?: (data: { userId: string; userName: string; caseId: string }) => void;
  onUserStoppedTyping?: (data: { userId: string; caseId: string }) => void;
  onUserPresenceUpdate?: (data: { userId: string; userName: string; userRole: string; isOnline: boolean; caseId: string }) => void;
  onMessageSent?: (message: any) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds

  /**
   * Initialize socket connection with authentication
   */
  initialize(handlers?: SocketEventHandlers) {
    if (this.socket) {
      this.disconnect();
    }

    try {
      // io() has been removed from here to enforce the singleton SocketContext pattern.
      // This class is deprecated for connection management. Use SocketContext instead.
      console.warn("SocketService.initialize() is deprecated. Use SocketProvider instead.");

      // Set up event listeners
      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        handlers?.onConnect?.();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        this.isConnected = false;
        handlers?.onDisconnect?.(reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        handlers?.onError?.(error);
      });

      // Listen for custom events
      if (handlers?.onNewMessage) {
        this.socket.on('new-message', handlers.onNewMessage);
      }

      if (handlers?.onRoomMessages) {
        this.socket.on('room-messages', handlers.onRoomMessages);
      }

      if (handlers?.onUserJoined) {
        this.socket.on('user-joined', handlers.onUserJoined);
      }

      if (handlers?.onUserLeft) {
        this.socket.on('user-left', handlers.onUserLeft);
      }

      if (handlers?.onUserTyping) {
        this.socket.on('user-typing', handlers.onUserTyping);
      }

      if (handlers?.onUserStoppedTyping) {
        this.socket.on('user-stopped-typing', handlers.onUserStoppedTyping);
      }

      if (handlers?.onUserPresenceUpdate) {
        this.socket.on('user-presence-update', handlers.onUserPresenceUpdate);
      }

      if (handlers?.onMessageSent) {
        this.socket.on('message-sent', handlers.onMessageSent);
      }

    } catch (error) {
      console.error('Error initializing socket:', error);
      handlers?.onError?.(error);
    }
  }

  /**
   * Join a specific case room
   */
  joinRoom(caseId: string, callback?: (response: any) => void) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('join-room', { caseId }, callback);
  }

  /**
   * Leave a specific case room
   */
  leaveRoom(caseId: string, callback?: (response: any) => void) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('leave-room', { caseId }, callback);
  }

  /**
   * Send a message to a specific case room
   */
  sendMessage(caseId: string, text: string, messageType: string = 'text', callback?: (response: any) => void) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('send-message', { caseId, text, messageType }, callback);
  }

  /**
   * Mark a message as read
   */
  markMessageRead(messageId: string, callback?: (response: any) => void) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('message-read', { messageId }, callback);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(caseId: string) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('typing-start', { caseId });
  }

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(caseId: string) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('typing-stop', { caseId });
  }

  /**
   * Update user presence in a room
   */
  updateUserPresence(caseId: string, isOnline: boolean = true) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('user-presence', { caseId, isOnline });
  }

  /**
   * Check if socket is connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected && !!this.socket?.connected;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Reconnect socket manually
   */
  reconnect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();