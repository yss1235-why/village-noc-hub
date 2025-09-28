import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If already authenticated, redirect to appropriate dashboard
  if (isAuthenticated && user) {
    const dashboardPath = getRoleDashboard(user.role);
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

// Helper function to get dashboard path by role
const getRoleDashboard = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'system_admin':
      return '/system-admin/dashboard';
    case 'village_admin':
      return '/admin/dashboard';
    case 'applicant':
    default:
      return '/userDashboard';
  }
};

export default PublicRoute;
