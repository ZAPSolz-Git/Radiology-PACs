import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

// Derive socket URL: explicit env var → strip /api from API URL → localhost fallback.
// This prevents connecting to localhost:5000 in production when VITE_SOCKET_URL is missing.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
        : 'http://localhost:5000');

// ---------------------------------------------------------------------------
// SocketContext — stable, rarely changes (connect/disconnect/notifications)
// ---------------------------------------------------------------------------
interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    sendMessage: (text: string, chatType?: string, messageType?: string) => void;
    startTyping: () => void;
    stopTyping: () => void;
    markMessagesAsDelivered: (messageId: string) => void;
    markMessagesAsRead: (messageIds: string[]) => void;
    getUnreadCount: () => void;
    markNotificationAsRead: (notificationId: string) => void;
    markAllNotificationsAsRead: () => void;
    refreshNotifications: () => void;
    currentCaseId: string | null;
    setCurrentCaseId: React.Dispatch<React.SetStateAction<string | null>>;
}

// ---------------------------------------------------------------------------
// ChatContext — frequently changes (every message / typing event)
// ---------------------------------------------------------------------------
interface ChatContextValue {
    messages: any[];
    setMessages: React.Dispatch<React.SetStateAction<any[]>>;
    typingUsers: any[];
    onlineUsers: any[];
    unreadCount: number;
    lastSeenTimestamps: Record<string, string>;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);
const ChatContext = createContext<ChatContextValue | undefined>(undefined);

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
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
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
            // S4: Re-join the current case room after a reconnect so that
            // messages and presence events resume without needing a page reload.
            if (caseIdRef.current) {
                socket.emit('join-room', { caseId: caseIdRef.current }, (response: any) => {
                    if (response?.success) {
                        console.log(`[Socket] Re-joined room after reconnect: ${caseIdRef.current}`);
                        if (response.participants) {
                            setOnlineUsers(response.participants);
                        }
                        socket.emit('user-presence', { caseId: caseIdRef.current, isOnline: true });
                    } else {
                        console.warn('[Socket] Room re-join after reconnect failed:', response?.error);
                    }
                });
            }
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
            setMessages((prev) => {
                const updated = [...prev, message];
                // S2: Cap at 500 to prevent unbounded memory growth in long sessions
                return updated.length > 500 ? updated.slice(-500) : updated;
            });
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
            setMessages((prev) => {
                const idSet = new Set<string>(data.messageIds);
                return prev.map(msg => {
                    if (idSet.has(msg._id)) {
                        const newReadBy = [...(msg.readBy || []), { userId: data.userId, userName: data.userName, timestamp: data.timestamp }];
                        return { ...msg, readBy: newReadBy, deliveryStatus: 'read' };
                    }
                    return msg;
                });
            });
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
            // S1: Remove every listener before disconnecting.
            // Without this, if the user object changes (e.g. token refresh) the
            // effect re-runs and registers a second copy of each handler on the
            // same socket instance — causing messages to fire 2×, 3×, etc.
            socket.off('connect');
            socket.off('disconnect');
            socket.off('room-messages');
            socket.off('new-message');
            socket.off('message-sent');
            socket.off('user-typing');
            socket.off('user-stopped-typing');
            socket.off('user-presence-update');
            socket.off('message-delivery-confirmed');
            socket.off('message-read-receipt');
            socket.off('unread-count-update');
            socket.off('new-notification');
            socket.off('notification-count-update');
            socket.off('case_updated');
            // Clear any in-flight typing timer so it doesn't fire after unmount.
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
            }
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

        // Only emit once — skip if already marked as typing
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit('typing-start', { caseId: currentCaseId });
        }

        // Reset the auto-stop timer on each keystroke
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            isTypingRef.current = false;
            socket.emit('typing-stop', { caseId: currentCaseId });
        }, 2000);
    }, [isConnected, currentCaseId]);

    const stopTyping = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected || !currentCaseId) return;

        if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = null;
        }
        isTypingRef.current = false;
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

    // ------------------------------------------------------------------
    // Stable socket value — consumers of SocketContext do NOT re-render
    // when messages or typingUsers change.
    // ------------------------------------------------------------------
    const socketValue: SocketContextValue = {
        socket: socketRef.current,
        isConnected,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesAsDelivered,
        markMessagesAsRead,
        getUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
        currentCaseId,
        setCurrentCaseId,
    };

    // ------------------------------------------------------------------
    // Chat value — consumers of ChatContext re-render on every message /
    // typing / presence event (correct — only chat components subscribe).
    // ------------------------------------------------------------------
    const chatValue: ChatContextValue = {
        messages,
        setMessages,
        typingUsers,
        onlineUsers,
        unreadCount,
        lastSeenTimestamps,
    };

    return (
        <SocketContext.Provider value={socketValue}>
            <ChatContext.Provider value={chatValue}>
                {children}
            </ChatContext.Provider>
        </SocketContext.Provider>
    );
};

// ---------------------------------------------------------------------------
// useSocketContext — backward-compatible hook.
// Returns the merged shape of both contexts so every existing consumer keeps
// working without any changes.  Internally the two separate providers ensure
// that a messages update only re-renders ChatContext consumers, not
// SocketContext consumers (e.g. TechnicianDashboard, NotificationCenter).
// ---------------------------------------------------------------------------
export const useSocketContext = () => {
    const socketCtx = useContext(SocketContext);
    const chatCtx = useContext(ChatContext);
    if (socketCtx === undefined || chatCtx === undefined) {
        throw new Error('useSocketContext must be used within a SocketProvider');
    }
    // Merge both contexts into the original flat shape for full backward compat
    return { ...socketCtx, ...chatCtx };
};

// ---------------------------------------------------------------------------
// useChatContext — lightweight hook for components that ONLY need chat data.
// Use this in place of useSocketContext when you only care about messages,
// typingUsers, onlineUsers, unreadCount, or lastSeenTimestamps so that the
// component is isolated to ChatContext re-renders only.
// ---------------------------------------------------------------------------
export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatContext must be used within a SocketProvider');
    }
    return context;
};
