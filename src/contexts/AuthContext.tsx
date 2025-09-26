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
            console.warn('Token validation failed, falling back to stored data:', validationError);
            // Fallback to stored user data for offline functionality
           const storedUser = localStorage.getItem('user-data');
            if (storedUser) {
              try {
                const rawUserData = JSON.parse(storedUser);
                // Basic token structure validation
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                  // Apply standardized user object format to stored data
                  const standardizedUser = {
                    id: rawUserData.id,
                    username: rawUserData.username || rawUserData.email,
                    email: rawUserData.email,
                    fullName: rawUserData.fullName || rawUserData.name || rawUserData.email,
                    role: rawUserData.role,
                    pointBalance: rawUserData.pointBalance || 0,
                    isApproved: rawUserData.isApproved !== false,
                    villageId: rawUserData.villageId,
                    villageName: rawUserData.villageName
                  };
                  setUser(standardizedUser);
                  // Sync standardized data back to storage
                  localStorage.setItem('user-data', JSON.stringify(standardizedUser));
                } else {
                  throw new Error('Invalid token structure');
                }
              } catch (parseError) {
                throw new Error('Stored user data corrupted');
              }
            } else {
              throw new Error('No valid user data available');
            }
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
    
    // Clear user state immediately to prevent any UI inconsistencies
    setUser(null);
    
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
    
    // Token invalidation is handled by removing it from storage
    // Backend tokens are stateless JWTs that expire naturally
    if (token) {
      console.log('Local logout completed successfully');
    }
    
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
