import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  pointBalance: number;
  isApproved: boolean;
  villageId?: string;
  villageName?: string;
}
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { login: string; password: string }, loginType?: 'user' | 'admin' | 'super_admin' | 'system_admin') => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean }>;
  refreshUser: () => Promise<void>;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

// Check for existing auth on app load with enhanced token validation
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (token) {
          // Enhanced token validation with backend verification
          try {
            const response = await fetch('/.netlify/functions/validate-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                // Token is valid, set user from validated data
                setUser(data.user);
               // Sync storage with validated user data
                  localStorage.setItem('user-data', JSON.stringify(data.user));
              } else {
                throw new Error('Token validation failed');
              }
            } else {
              throw new Error('Token validation request failed');
            }
         } catch (validationError) {
            console.warn('Token validation failed, clearing all authentication data:', validationError);
            // Clear all authentication data to force fresh login
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user-data');
            setUser(null);
            throw new Error('Authentication validation failed');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
       // Clear authentication artifacts from primary storage only
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user-data');
          setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);
const login = async (credentials: { login: string; password: string }, loginType: 'user' | 'admin' | 'super_admin' | 'system_admin' = 'user') => {
    try {
      // Determine the correct endpoint based on login type
      const endpoints = {
        user: '/.netlify/functions/login-user',
        admin: '/.netlify/functions/auth-village-admin', 
        super_admin: '/.netlify/functions/auth-super-admin',
        system_admin: '/.netlify/functions/auth-system-admin'
      };

      const response = await fetch(endpoints[loginType], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        // Standardized user object creation
        const standardizedUser = {
          id: data.user.id,
          username: data.user.username || data.user.email,
          email: data.user.email,
          fullName: data.user.fullName || data.user.name || data.user.email,
          role: data.user.role,
          pointBalance: data.user.pointBalance || 0,
          isApproved: data.user.isApproved !== false, // Default to true for admin roles
          villageId: data.user.villageId || data.village?.id,
          villageName: data.user.villageName || data.village?.name
        };

        setUser(standardizedUser);
        
       // Single storage approach - use localStorage only
            localStorage.setItem('auth-token', data.token);
            localStorage.setItem('user-data', JSON.stringify(standardizedUser));
        
        return { success: true, user: standardizedUser };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };
const logout = async () => {
    // Get token before clearing state
   const token = localStorage.getItem('auth-token');
    
    // CRITICAL: Set loading state to prevent route checks during logout
    setIsLoading(true);
    
    // Clear user state immediately to prevent any UI inconsistencies
    setUser(null);
    
    // CRITICAL: Force React state synchronization - wait for user state to be null
    await new Promise(resolve => {
      // Use a longer timeout to ensure all components re-render
      setTimeout(resolve, 300);
    });
    
    // Cleanup of authentication artifacts from primary storage
        const authKeys = ['auth-token', 'user-data'];
        authKeys.forEach(key => {
          localStorage.removeItem(key);
        });
            
 // Clear any other potentially sensitive cached data from primary storage only
    const sensitiveKeys = ['userApplications', 'adminData', 'villageData', 'userPoints'];
    sensitiveKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Additional safety: Clear any browser-cached state
    if (typeof window !== 'undefined') {
      // Force garbage collection of any cached references
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    // Token invalidation is handled by removing it from storage
    // Backend tokens are stateless JWTs that expire naturally
    if (token) {
      console.log('Local logout completed successfully with state sync');
    }
    
    // Reset loading state after logout completes
    setIsLoading(false);
    
    return { success: true };
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      const response = await fetch('/.netlify/functions/validate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Complete overwrite with standardized user object from backend
          const standardizedUser = {
            id: data.user.id,
            username: data.user.username || data.user.email,
            email: data.user.email,
            fullName: data.user.fullName || data.user.name || data.user.email,
            role: data.user.role,
            pointBalance: data.user.pointBalance || 0,
            isApproved: data.user.isApproved !== false,
            villageId: data.user.villageId,
            villageName: data.user.villageName
          };
          setUser(standardizedUser);
          localStorage.setItem('user-data', JSON.stringify(standardizedUser));
        }
      }
    } catch (error) {
  console.error('Failed to refresh user:', error);
  // Clear authentication data on refresh failure
  localStorage.removeItem('auth-token');
  localStorage.removeItem('user-data');
  setUser(null);
}
  };

const validateToken = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return false;

      const response = await fetch('/.netlify/functions/validate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Synchronize user data with backend during validation
          const standardizedUser = {
            id: data.user.id,
            username: data.user.username || data.user.email,
            email: data.user.email,
            fullName: data.user.fullName || data.user.name || data.user.email,
            role: data.user.role,
            pointBalance: data.user.pointBalance || 0,
            isApproved: data.user.isApproved !== false,
            villageId: data.user.villageId,
            villageName: data.user.villageName
          };
          setUser(standardizedUser);
          localStorage.setItem('user-data', JSON.stringify(standardizedUser));
          return true;
        }
      }
      return false;
    } catch (error) {
  console.error('Token validation failed:', error);
  // Clear authentication data on validation failure
  localStorage.removeItem('auth-token');
  localStorage.removeItem('user-data');
  setUser(null);
  return false;
}
  };
  const register = async (userData: any) => {
    try {
      const response = await fetch('/.netlify/functions/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };
 const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    validateToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
