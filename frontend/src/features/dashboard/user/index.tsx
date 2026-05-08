import { useAuthStore } from '@/stores/authStore';

export default function UserDashboard() {
    const { user } = useAuthStore();

    return (
        <div className="min-h-screen overflow-y-auto bg-muted/20 p-4 sm:p-8 space-y-6 scroll-smooth">
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">My Dashboard</h1>
            <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Profile</h2>
                <div className="space-y-2">
                    <p><strong className="text-muted-foreground">Name:</strong> {user?.name}</p>
                    <p><strong className="text-muted-foreground">Email:</strong> {user?.email}</p>
                </div>
            </div>
        </div>
    );
}
