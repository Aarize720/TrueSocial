// Provider pour l'authentification
'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { socketManager } from '@/lib/socket';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    // Initialiser l'authentification au montage du composant
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Gérer la connexion/déconnexion des WebSockets
    if (isAuthenticated && user) {
      socketManager.connect();
    } else {
      socketManager.disconnect();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Gérer la visibilité de la page pour les WebSockets
    const handleVisibilityChange = () => {
      if (isAuthenticated) {
        if (document.hidden) {
          socketManager.updateOnlineStatus(false);
        } else {
          socketManager.updateOnlineStatus(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // Gérer la fermeture de la page
    const handleBeforeUnload = () => {
      if (isAuthenticated) {
        socketManager.updateOnlineStatus(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};