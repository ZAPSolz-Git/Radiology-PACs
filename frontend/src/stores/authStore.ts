import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { useNotificationStore } from './notificationStore';
import { AuthService } from '@/services/AuthService';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitialized: boolean;

    setAuth: (user: User) => void;
    updateUser: (user: User) => void;
    setInitialized: (initialized: boolean) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isInitialized: false,

            setAuth: (user) => set({
                user,
                isAuthenticated: true,
            }),

            updateUser: (user) => set({ user }),

            setInitialized: (isInitialized) => set({ isInitialized }),

            logout: async () => {
                const { isAuthenticated } = useAuthStore.getState();
                if (!isAuthenticated) return;

                // 1. Clear local state immediately (Optimistic UI)
                set({
                    user: null,
                    isAuthenticated: false,
                });

                // 2. Invalidate Viewers' cached user data (cross-app signal).
                //    The Viewers app is a separate JS bundle on the same domain;
                //    UserService.getMe() checks this flag before serving cached data.
                try {
                    localStorage.setItem('viewer-logout-signal', Date.now().toString());
                } catch { /* localStorage unavailable — non-critical */ }

                try {
                    // 3. Clear notifications
                    useNotificationStore.getState().clearNotifications();

                    // 4. Notify backend to clear cookies
                    await AuthService.logout();
                } catch (error) {
                    console.error('[AuthStore] Background logout cleanup failed:', error);
                }
            },
        }),
        {
            name: 'auth-status', // minimal UI hint, not for security
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                // Do NOT persist isInitialized or user - force a fetch on refresh.
            }),
        }
    )
);
