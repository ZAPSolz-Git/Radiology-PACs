import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/AuthService';

export const useAuth = () => {
    const { setAuth, logout, setInitialized, isInitialized } = useAuthStore();

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Try to get current user from server (using cookies)
                const user = await AuthService.getMe();
                setAuth(user);
            } catch (error) {
                console.error('[useAuth] Session initialization failed:', error);
                logout();
            } finally {
                setInitialized(true);
            }
        };

        if (!isInitialized) {
            initAuth();
        }
    }, [isInitialized, setAuth, logout, setInitialized]);

    return { isInitialized };
};

