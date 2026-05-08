import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const RootRedirect = () => {
    const { isAuthenticated, user } = useAuthStore();

    if (isAuthenticated && user) {
        // Already logged in? Go to dashboard
        return <Navigate to={`/dashboard/${user.role}`} replace />;
    }

    // Not logged in? Go to Login
    return <Navigate to="/login" replace />;
};
