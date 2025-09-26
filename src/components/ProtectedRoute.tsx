import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallbackPath = '/login'
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      // Additional token validation
      const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
      const userData = localStorage.getItem('user-data') || sessionStorage.getItem('userInfo');
      
      if (!token || !userData) {
        // Clear any remaining auth data
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-data');
        sessionStorage.removeItem('auth-token');
        sessionStorage.removeItem('userInfo');
      }
      
      setIsValidating(false);
    };

    validateAuth();
  }, []);

  // Show loading spinner while validating
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to appropriate login
  if (!isAuthenticated || !user) {
    // Determine login page based on current route
    let loginPath = '/login';
    if (location.pathname.startsWith('/admin/')) {
      loginPath = '/admin';
    } else if (location.pathname.startsWith('/super-admin/')) {
      loginPath = '/super-admin';
    } else if (location.pathname.startsWith('/system-admin/')) {
      loginPath = '/system-admin';
    }
    
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!requiredRoles.includes(user.role)) {
      // Role mismatch - redirect to appropriate dashboard
      const redirectPath = getRoleDashboard(user.role);
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
};

// Helper function to get dashboard path by role
const getRoleDashboard = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'admin':
      return '/system-admin/dashboard';
    case 'village_admin':
      return '/admin/dashboard';
    case 'user':
    case 'applicant':
    default:
      return '/userDashboard';
  }
};

export default ProtectedRoute;
