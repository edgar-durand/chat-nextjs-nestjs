import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface UpdateProfileData {
  name?: string;
  avatar?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Check if user is authenticated in NextAuth session
    if (status === 'authenticated' && session?.user) {
      setUser({
        id: session.user.id || '',
        name: session.user.name || '',
        email: session.user.email || '',
        avatar: session.user.image || '',
      });
      
      // Set authorization header for API requests
      if (session.accessToken) {
        // Guardar el token en localStorage para que ChatContext pueda utilizarlo
        localStorage.setItem('token', session.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.accessToken}`;
      }
      
      setIsLoading(false);
      return;
    } else if (status === 'unauthenticated') {
      // Clear user state if not authenticated with NextAuth
      setUser(null);
      setIsLoading(false);
      return;
    }
    
    // Only check localStorage if NextAuth session status is not determined yet
    if (status === 'loading') {
      return;
    }
    
    // Fallback to legacy token authentication
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const { data } = await axios.get(`${API_URL}/auth/me`);
        
        setUser({
          id: data._id,
          name: data.name,
          email: data.email,
          avatar: data.avatar || '',
        });
      } catch (error: any) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [API_URL, session, status]);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem('token', data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || '',
      });

      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error logging in';
      throw new Error(message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error('Error logging in with Google');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
      });

      localStorage.setItem('token', data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || '',
      });

      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error registering';
      throw new Error(message);
    }
  };

  const logout = async () => {
    if (status === 'authenticated') {
      // For NextAuth logout
      await signOut({ callbackUrl: '/login' });
    } else {
      // For legacy logout
      if (user) {
        try {
          await axios.post(`${API_URL}/auth/logout`);
        } catch (error) {
          console.error('Error logging out:', error);
        }
      }
  
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      router.push('/login');
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const response = await axios.patch(`${API_URL}/users/profile`, data);
      
      if (response.data) {
        setUser(prevUser => {
          if (!prevUser) return null;
          
          return {
            ...prevUser,
            name: data.name || prevUser.name,
            avatar: data.avatar || prevUser.avatar,
          };
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error updating profile';
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
