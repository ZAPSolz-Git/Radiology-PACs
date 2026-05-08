import { useEffect } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';

export const useSocket = (caseId: string | null) => {
    const ctx = useSocketContext();

    useEffect(() => {
        if (caseId) {
            ctx.setCurrentCaseId(caseId);
        }
        return () => {
            if (caseId) {
                ctx.setCurrentCaseId(null);
            }
        };
    }, [caseId, ctx.setCurrentCaseId]);

    // Return the context value to maintain the identical original shape.
    // The context already provides: isConnected, messages, typingUsers, onlineUsers, 
    // unreadCount, lastSeenTimestamps, sendMessage, startTyping, stopTyping, 
    // markMessagesAsDelivered, markMessagesAsRead, getUnreadCount, 
    // markNotificationAsRead, markAllNotificationsAsRead, refreshNotifications, 
    // setMessages, and socket.
    return ctx;
};
