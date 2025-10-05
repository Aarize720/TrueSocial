// Provider pour les WebSockets
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketManager, useSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';
import type { Notification, OnlineStatus } from '@/types';

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: Set<string>;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const { isAuthenticated } = useAuthStore();
  const { updatePostInStore } = usePostStore();
  const socket = useSocket();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Vérifier l'état de connexion
    const checkConnection = () => {
      setIsConnected(socket.isConnected());
    };

    // Vérifier périodiquement la connexion
    const interval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => clearInterval(interval);
  }, [isAuthenticated, socket]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Gestionnaires d'événements WebSocket
    const handleConnect = () => {
      console.log('✅ WebSocket connecté');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('❌ WebSocket déconnecté');
      setIsConnected(false);
    };

    const handleNotification = (notification: Notification) => {
      console.log('📢 Nouvelle notification:', notification);
      // Les notifications sont déjà gérées par le socketManager
    };

    const handleLike = (data: { post_id: string; user: any; likes_count: number }) => {
      console.log('❤️ Like reçu:', data);
      updatePostInStore(data.post_id, {
        likes_count: data.likes_count,
      });
    };

    const handleComment = (data: { post_id: string; comment: any }) => {
      console.log('💬 Commentaire reçu:', data);
      // Mettre à jour le compteur de commentaires
      try {
        const post = usePostStore.getState().getPost(data.post_id);
        if (post) {
          updatePostInStore(data.post_id, {
            comments_count: post.comments_count + 1,
          });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du commentaire:', error);
      }
    };

    const handleFollow = (data: { user: any }) => {
      console.log('👥 Nouveau follower:', data);
      // Mettre à jour les statistiques utilisateur si nécessaire
    };

    const handleOnlineStatus = (data: OnlineStatus) => {
      console.log('🟢 Statut en ligne:', data);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.is_online) {
          newSet.add(data.user_id);
        } else {
          newSet.delete(data.user_id);
        }
        return newSet;
      });
    };

    const handleStoryView = (data: { story_id: string; viewer: any }) => {
      console.log('👁️ Story vue:', data);
      // Gérer les vues de stories si nécessaire
    };

    // Enregistrer les listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('notification', handleNotification);
    socket.on('like', handleLike);
    socket.on('comment', handleComment);
    socket.on('follow', handleFollow);
    socket.on('online_status', handleOnlineStatus);
    socket.on('story_view', handleStoryView);

    return () => {
      // Nettoyer les listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('notification', handleNotification);
      socket.off('like', handleLike);
      socket.off('comment', handleComment);
      socket.off('follow', handleFollow);
      socket.off('online_status', handleOnlineStatus);
      socket.off('story_view', handleStoryView);
    };
  }, [isAuthenticated, socket, updatePostInStore]);

  useEffect(() => {
    // Gérer la reconnexion automatique
    if (isAuthenticated && !isConnected) {
      const reconnectTimer = setTimeout(() => {
        console.log('🔄 Tentative de reconnexion WebSocket...');
        socket.connect();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [isAuthenticated, isConnected, socket]);

  const contextValue: SocketContextType = {
    isConnected,
    onlineUsers,
    emit: socket.emit,
    on: socket.on,
    off: socket.off,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

// Hook personnalisé pour vérifier si un utilisateur est en ligne
export const useUserOnlineStatus = (userId: string) => {
  const { onlineUsers } = useSocketContext();
  return onlineUsers.has(userId);
};

// Hook personnalisé pour rejoindre/quitter des salles
export const useSocketRoom = (roomId: string | null) => {
  const { emit } = useSocketContext();

  useEffect(() => {
    if (roomId) {
      emit('join_room', { room: roomId });
      
      return () => {
        emit('leave_room', { room: roomId });
      };
    }
  }, [roomId, emit]);
};

// Hook personnalisé pour les notifications en temps réel
export const useRealtimeNotifications = (callback: (notification: Notification) => void) => {
  const { on, off } = useSocketContext();

  useEffect(() => {
    on('notification', callback);
    
    return () => {
      off('notification', callback);
    };
  }, [on, off, callback]);
};

// Hook personnalisé pour les likes en temps réel
export const useRealtimeLikes = (postId: string, callback: (data: any) => void) => {
  const { on, off } = useSocketContext();

  useEffect(() => {
    const handleLike = (data: { post_id: string; user: any; likes_count: number }) => {
      if (data.post_id === postId) {
        callback(data);
      }
    };

    on('like', handleLike);
    
    return () => {
      off('like', handleLike);
    };
  }, [postId, on, off, callback]);
};

// Hook personnalisé pour les commentaires en temps réel
export const useRealtimeComments = (postId: string, callback: (data: any) => void) => {
  const { on, off } = useSocketContext();

  useEffect(() => {
    const handleComment = (data: { post_id: string; comment: any }) => {
      if (data.post_id === postId) {
        callback(data);
      }
    };

    on('comment', handleComment);
    
    return () => {
      off('comment', handleComment);
    };
  }, [postId, on, off, callback]);
};