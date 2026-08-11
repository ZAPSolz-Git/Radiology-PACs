import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/AuthService';

export const useAuth = () => {
    // Only subscribe to isInitialized — store action functions (setAuth, logout,
    // setInitialized) are stable Zustand references but reading them from the hook
    // can produce new object identities on certain re-renders. Calling them via
    // getState() inside the effect avoids them being in the dependency array
    // entirely, preventing a spurious re-run loop.
    const isInitialized = useAuthStore((state) => state.isInitialized);

    useEffect(() => {
        if (isInitialized) return;

        const initAuth = async () => {
            try {
                // Try to get current user from server (using cookies)
                const user = await AuthService.getMe();
                useAuthStore.getState().setAuth(user);
            } catch (error) {
                console.error('[useAuth] Session initialization failed:', error);
                useAuthStore.getState().logout();
            } finally {
                useAuthStore.getState().setInitialized(true);
            }
        };

        initAuth();
    }, [isInitialized]);

    return { isInitialized };
};

