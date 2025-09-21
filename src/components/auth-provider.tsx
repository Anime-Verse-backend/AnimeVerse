"use client"

import type { User } from '@/lib/types';
import * as api from '@/lib/api';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect, type ReactNode, useCallback, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  checkUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkUser = useCallback(async () => {
    const token = localStorage.getItem('animeverse-auth-token');
    if (token) {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Session invalid, logging out", error);
        setUser(null);
        localStorage.removeItem('animeverse-auth-token');
      }
    } else {
        setUser(null); // Explicitly set user to null if no token
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const login = async (email: string, password?: string) => {
    try {
      const { token, user: loggedInUser } = await api.login(email, password || '');
      localStorage.setItem('animeverse-auth-token', token);
      setUser(loggedInUser);
      if (['admin', 'co-owner', 'owner'].includes(loggedInUser.role)) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    localStorage.removeItem('animeverse-auth-token');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
}
