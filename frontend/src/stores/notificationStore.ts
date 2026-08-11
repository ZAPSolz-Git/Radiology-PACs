import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
    _id: string;
    recipientId: string;
    type: 'chat' | 'case';
    title: string;
    message: string;
    relatedId: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    setUnreadCount: (count: number) => void;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            unreadCount: 0,
            setNotifications: (notifications) => set({ notifications }),
            addNotification: (notification) => set((state) => ({
                notifications: [notification, ...state.notifications].slice(0, 100),
                unreadCount: state.unreadCount + 1
            })),
            setUnreadCount: (unreadCount) => set({ unreadCount }),
            markAsRead: (notificationId) => set((state) => {
                const notification = state.notifications.find(n => n._id === notificationId);
                if (!notification || notification.isRead) return state;

                return {
                    notifications: state.notifications.map((n) =>
                        n._id === notificationId ? { ...n, isRead: true } : n
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1)
                };
            }),
            markAllAsRead: () => set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                unreadCount: 0
            })),
            clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
        }),
        {
            name: 'notification-storage',
        }
    )
);
