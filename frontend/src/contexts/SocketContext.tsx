import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    messages: any[];
    typingUsers: any[];
    onlineUsers: any[];
    unreadCount: number;
    lastSeenTimestamps: Record<string, string>;
    sendMessage: (text: string, chatType?: string, messageType?: string) => void;
    startTyping: () => void;
    stopTyping: () => void;
    markMessagesAsDelivered: (messageId: string) => void;
    markMessagesAsRead: (messageIds: string[]) => void;
    getUnreadCount: () => void;
    markNotificationAsRead: (notificationId: string) => void;
    markAllNotificationsAsRead: () => void;
    refreshNotifications: () => void;
    setMessages: React.Dispatch<React.SetStateAction<any[]>>;
    currentCaseId: string | null;
    setCurrentCaseId: React.Dispatch<React.SetStateAction<string | null>>;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuthStore();
    const { addNotification, setUnreadCount: setGlobalUnreadCount, setNotifications } = useNotificationStore();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [typingUsers, setTypingUsers] = useState<any[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastSeenTimestamps, setLastSeenTimestamps] = useState<Record<string, string>>({});
    const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);

    // Use a ref for currentCaseId so event listeners always have the latest value 
    // without needing to re-create the socket connection on caseId changes.
    const caseIdRef = useRef<string | null>(null);
    useEffect(() => {
        caseIdRef.current = currentCaseId;
    }, [currentCaseId]);

    useEffect(() => {
        if (!user) return;

        // Initialize socket connection
        console.log('[SocketProvider] Initializing for user:', user.name);

        const socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['polling', 'websocket'],
            path: '/socket.io/',
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Socket connected');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Socket disconnected');
        });

        socket.on('room-messages', (data) => {
            if (data.caseId === caseIdRef.current) {
                setMessages(data.messages);
            }
        });

        socket.on('new-message', (message) => {
            setMessages((prev) => [...prev, message]);
            // Automatically mark as delivered when received
            if (message._id && caseIdRef.current) {
                socket.emit('message-delivered', { messageId: message._id, caseId: caseIdRef.current });
            }
        });

        socket.on('message-sent', (message) => {
            setMessages((prev) => {
                const exists = prev.find(m => m._id === message._id);
                if (exists) return prev;
                return [...prev, message];
            });
        });

        socket.on('user-typing', (data) => {
            if (data.caseId === caseIdRef.current) {
                setTypingUsers((prev) => {
                    if (prev.find(u => u.userId === data.userId)) return prev;
                    return [...prev, data];
                });
            }
        });

        socket.on('user-stopped-typing', (data) => {
            setTypingUsers((prev) => prev.filter(u => u.userId !== data.userId));
        });

        socket.on('user-presence-update', (data) => {
            if (data.caseId === caseIdRef.current) {
                setOnlineUsers((prev) => {
                    const filtered = prev.filter(u => u.userId !== data.userId);
                    if (data.isOnline) {
                        return [...filtered, data];
                    } else {
                        // Store last seen timestamp for offline users
                        setLastSeenTimestamps((prevTimestamps) => ({
                            ...prevTimestamps,
                            [data.userId]: new Date().toISOString()
                        }));
                    }
                    return filtered;
                });
            }
        });

        // Handle message delivery confirmation
        socket.on('message-delivery-confirmed', (data) => {
            setMessages((prev) => prev.map(msg =>
                msg._id === data.messageId
                    ? { ...msg, deliveryStatus: 'delivered', deliveredTo: [...(msg.deliveredTo || []), { userId: data.userId, timestamp: data.timestamp }] }
                    : msg
            ));
        });

        // Handle read receipts
        socket.on('message-read-receipt', (data) => {
            setMessages((prev) => prev.map(msg => {
                if (data.messageIds.includes(msg._id)) {
                    const newReadBy = [...(msg.readBy || []), { userId: data.userId, userName: data.userName, timestamp: data.timestamp }];
                    return {
                        ...msg,
                        readBy: newReadBy,
                        deliveryStatus: 'read'
                    };
                }
                return msg;
            }));
        });

        // Handle unread count updates
        socket.on('unread-count-update', (data) => {
            if (data.caseId === caseIdRef.current) {
                setUnreadCount(data.count);
            }
        });

        // Handle global notifications
        socket.on('new-notification', (notification) => {
            console.log('New notification received:', notification);
            addNotification(notification);
        });

        socket.on('notification-count-update', (data) => {
            console.log('Notification count update:', data);
            setGlobalUnreadCount(data.unreadCount);
        });

        // Handle real-time case updates (Status, Timeline, etc.)
        socket.on('case_updated', (updatedCaseId) => {
            console.log('[useSocket] Case updated real-time:', updatedCaseId);
            window.dispatchEvent(new CustomEvent('case_updated', { detail: updatedCaseId }));
        });

        // Fetch initial notifications
        socket.emit('get-notifications', {}, (response: any) => {
            if (response.success) {
                setNotifications(response.notifications);
                setGlobalUnreadCount(response.unreadCount);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Room management
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;

        // Clear previous state when joining a new room
        setMessages([]);
        setTypingUsers([]);
        setOnlineUsers([]);
        setUnreadCount(0);

        socket.emit('join-room', { caseId: currentCaseId }, (response: any) => {
            if (response?.success) {
                console.log(`Joined room: ${currentCaseId}`);
                if (response.participants) {
                    setOnlineUsers(response.participants);
                }
                if (response.unreadCount !== undefined) {
                    setUnreadCount(response.unreadCount);
                }
                socket.emit('user-presence', { caseId: currentCaseId, isOnline: true });
            } else {
                console.error(`Failed to join room: ${response?.error}`);
            }
        });

        return () => {
            socket.emit('user-presence', { caseId: currentCaseId, isOnline: false });
            socket.emit('leave-room', { caseId: currentCaseId });
            // Clear state on leave
            setMessages([]);
            setTypingUsers([]);
            setOnlineUsers([]);
            setUnreadCount(0);
        };
    }, [isConnected, currentCaseId]);

    const sendMessage = useCallback((text: string, chatType: string = 'group', messageType: string = 'text') => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;

        socket.emit('send-message', {
            caseId: currentCaseId,
            text,
            messageType,
            chatType
        });
    }, [isConnected, currentCaseId]);

    const startTyping = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;
        socket.emit('typing-start', { caseId: currentCaseId });
    }, [isConnected, currentCaseId]);

    const stopTyping = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;
        socket.emit('typing-stop', { caseId: currentCaseId });
    }, [isConnected, currentCaseId]);

    const markMessagesAsDelivered = useCallback((messageId: string) => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;
        socket.emit('message-delivered', { messageId, caseId: currentCaseId });
    }, [isConnected, currentCaseId]);

    const markMessagesAsRead = useCallback((messageIds: string[]) => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;
        socket.emit('messages-read', { messageIds, caseId: currentCaseId }, (response: any) => {
            if (response?.success && response.unreadCount !== undefined) {
                setUnreadCount(response.unreadCount);
            }
        });
    }, [isConnected, currentCaseId]);

    const getUnreadCount = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;
        socket.emit('get-unread-count', { caseId: currentCaseId }, (response: any) => {
            if (response?.success) {
                setUnreadCount(response.count);
            }
        });
    }, [isConnected, currentCaseId]);

    const markNotificationAsRead = useCallback((notificationId: string) => {
        const socket = socketRef.current;
        if (!socket || !isConnected) return;
        socket.emit('mark-notification-read', { notificationId });
    }, [isConnected]);

    const markAllNotificationsAsRead = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected) return;
        socket.emit('mark-all-notifications-read', {});
    }, [isConnected]);

    const refreshNotifications = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected) return;
        socket.emit('get-notifications', {}, (response: any) => {
            if (response?.success) {
                setNotifications(response.notifications);
                setGlobalUnreadCount(response.unreadCount);
            }
        });
    }, [isConnected, setNotifications, setGlobalUnreadCount]);

    const value: SocketContextValue = {
        socket: socketRef.current,
        isConnected,
        messages,
        typingUsers,
        onlineUsers,
        unreadCount,
        lastSeenTimestamps,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesAsDelivered,
        markMessagesAsRead,
        getUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
        setMessages,
        currentCaseId,
        setCurrentCaseId
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocketContext = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocketContext must be used within a SocketProvider');
    }
    return context;
};
