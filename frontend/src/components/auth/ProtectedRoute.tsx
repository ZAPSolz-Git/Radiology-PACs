import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
    children: JSX.Element;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { isAuthenticated, isInitialized, user } = useAuthStore();
    const location = useLocation();

    // P1: Wait for auth to resolve before deciding to redirect.
    // Showing the spinner here (instead of App root) means public routes
    // like / and /login render immediately without waiting for getMe().
    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Authenticating Securely...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={`/dashboard/${user.role}`} replace />;
    }

    return children;
};
