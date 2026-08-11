import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// Auth Components
import LoginPage from "@/features/auth/pages/LoginPage";
// import RegisterPage from "@/features/auth/pages/RegisterPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
// Dashboards — lazy-loaded (P2)
const TechnicianDashboard = lazy(() => import("@/features/dashboard/technician"));
const RadiologistDashboard = lazy(() => import("@/features/dashboard/radiologist"));
const AdminDashboard = lazy(() => import("@/features/dashboard/admin"));
const UserDashboard = lazy(() => import("@/features/dashboard/user"));
const QADashboard = lazy(() => import("@/features/dashboard/qa"));

import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import { useAuth } from "@/hooks/useAuth";
import { TaskProvider } from "@/contexts/TaskContext";
import { SocketProvider } from "@/contexts/SocketContext";

const App = () => {
  // P1: Keep useAuth() to trigger auth initialization, but remove the global
  // spinner — it now lives in ProtectedRoute so public routes aren't blocked.
  useAuth();

  return (
    <TooltipProvider>
      <SocketProvider>
        <TaskProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              </div>
            }>
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
            </Suspense>
          </BrowserRouter>
        </TaskProvider>
      </SocketProvider>
    </TooltipProvider>
  );
};

export default App;
