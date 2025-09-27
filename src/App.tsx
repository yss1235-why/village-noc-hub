import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Apply from "./pages/Apply";
import Status from "./pages/Status";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import NotFound from "./pages/NotFound";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SystemAdminDashboard from "./pages/SystemAdminDashboard";
import SystemAdminLogin from "./pages/SystemAdminLogin";
import VillageRegistration from './pages/VillageRegistration';
import Terms from './pages/Terms';
import Verify from "./pages/Verify";
import VoucherManagement from './components/admin/VoucherManagement';
import VoucherRedemption from './components/user/VoucherRedemption';

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
       <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/verify/:applicationNumber" element={<Verify />} />
            
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/admin" element={
              <PublicRoute>
                <AdminLogin />
              </PublicRoute>
            } />
            <Route path="/super-admin" element={
              <PublicRoute>
                <SuperAdminLogin />
              </PublicRoute>
            } />
            <Route path="/system-admin" element={
              <PublicRoute>
                <SystemAdminLogin />
              </PublicRoute>
            } />
            
            <Route path="/village/register" element={<VillageRegistration />} />

            <Route path="/apply" element={
              <ProtectedRoute requiredRole={['user', 'applicant']}>
                <Apply />
              </ProtectedRoute>
            } />
            <Route path="/status" element={
              <ProtectedRoute requiredRole={['user', 'applicant']}>
                <Status />
              </ProtectedRoute>
            } />
            <Route path="/userDashboard" element={
              <ProtectedRoute requiredRole={['user', 'applicant']}>
                <UserDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredRole="village_admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/system-admin/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <SystemAdminDashboard />
              </ProtectedRoute>
            } />

           <Route path="/super-admin/dashboard" element={
              <ProtectedRoute requiredRole="super_admin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/vouchers" element={
              <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                <VoucherManagement />
              </ProtectedRoute>
            } />

            <Route path="/user/vouchers" element={
              <ProtectedRoute requiredRole={['user', 'applicant']}>
                <VoucherRedemption />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
      </BrowserRouter>
    </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
