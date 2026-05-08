import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// Auth Components
import LoginPage from "@/features/auth/pages/LoginPage";
// import RegisterPage from "@/features/auth/pages/RegisterPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
// Dashboards
import TechnicianDashboard from "@/features/dashboard/technician";
import RadiologistDashboard from "@/features/dashboard/radiologist";
import AdminDashboard from "@/features/dashboard/admin";
import UserDashboard from "@/features/dashboard/user";
import QADashboard from "@/features/dashboard/qa";

import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import { useAuth } from "@/hooks/useAuth";
import { TaskProvider } from "@/contexts/TaskContext";
import { SocketProvider } from "@/contexts/SocketContext";

const queryClient = new QueryClient();

const App = () => {
  const { isInitialized } = useAuth();

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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SocketProvider>
          <TaskProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                {/* <Route path="/register" element={<RegisterPage />} /> */}

                {/* Landing Page - Public */}
                <Route path="/" element={<Home />} />

                {/* Role-Based Protected Routes */}
                <Route path="/dashboard/technician" element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <TechnicianDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/radiologist" element={
                  <ProtectedRoute allowedRoles={['radiologist']}>
                    <RadiologistDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/qa" element={
                  <ProtectedRoute allowedRoles={['qa']}>
                    <QADashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/user" element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <UserDashboard />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TaskProvider>
        </SocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
