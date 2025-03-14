import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

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
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Check if user is already logged in
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
          avatar: data.avatar,
        });
      } catch (error: any) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [API_URL]);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('token', data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      
      setUser(data.user);
      
      router.push('/chat');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to login');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, { name, email, password });
      localStorage.setItem('token', data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      
      setUser(data.user);
      
      router.push('/chat');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to register');
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      router.push('/login');
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, data);
      
      // Update local user state with new data
      setUser(prevUser => {
        if (!prevUser) return null;
        
        return {
          ...prevUser,
          name: response.data.name || prevUser.name,
          avatar: response.data.avatar || prevUser.avatar,
        };
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      register, 
      logout,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
