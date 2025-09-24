import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  pointBalance: number;
  isApproved: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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

  // Check for existing auth on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (token) {
          // Verify token is still valid by making a test request
          const response = await fetch('/.netlify/functions/get-user-points', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Token is valid, set user from stored data
              const storedUser = localStorage.getItem('user-data');
              if (storedUser) {
                setUser(JSON.parse(storedUser));
              }
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('auth-token');
              localStorage.removeItem('user-data');
            }
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user-data');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-data');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: { login: string; password: string }) => {
    try {
      const response = await fetch('/.netlify/functions/login-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('auth-token', data.token);
        localStorage.setItem('user-data', JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-data');
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      const response = await fetch('/.netlify/functions/get-user-points', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && user) {
          const updatedUser = {
            ...user,
            pointBalance: data.user.currentBalance || 0
          };
          setUser(updatedUser);
          localStorage.setItem('user-data', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
