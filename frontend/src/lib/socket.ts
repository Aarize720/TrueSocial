// Configuration et gestion des WebSockets
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { SocketEvent, Notification, OnlineStatus } from '@/types';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      this.isConnecting = false;
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
    this.isConnecting = false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Événements de connexion
    this.socket.on('connect', () => {
      console.log('✅ Socket connecté');
      this.reconnectAttempts = 0;
      this.emit('user_online');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket déconnecté:', reason);
      
      if (reason === 'io server disconnect') {
        // Déconnexion forcée par le serveur, reconnecter
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion socket:', error);
      this.handleConnectionError();
    });

    // Événements métier
    this.socket.on('notification', (data: Notification) => {
      this.handleNotification(data);
      this.notifyListeners('notification', data);
    });

    this.socket.on('like', (data: { post_id: string; user: any; likes_count: number }) => {
      this.notifyListeners('like', data);
    });

    this.socket.on('comment', (data: { post_id: string; comment: any }) => {
      this.notifyListeners('comment', data);
    });

    this.socket.on('follow', (data: { user: any }) => {
      this.notifyListeners('follow', data);
    });

    this.socket.on('online_status', (data: OnlineStatus) => {
      this.notifyListeners('online_status', data);
    });

    this.socket.on('story_view', (data: { story_id: string; viewer: any }) => {
      this.notifyListeners('story_view', data);
    });

    // Événements d'erreur
    this.socket.on('error', (error: any) => {
      console.error('❌ Erreur socket:', error);
      toast.error('Erreur de connexion temps réel');
    });
  }

  private handleConnectionError(): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
      toast.error('Impossible de se connecter au serveur temps réel');
      return;
    }

    // Augmenter le délai de reconnexion exponentiellement
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, delay);
  }

  private handleNotification(notification: Notification): void {
    // Afficher une notification toast selon le type
    switch (notification.type) {
      case 'like':
        toast.success(`${notification.from_user.username} a aimé votre publication`);
        break;
      case 'comment':
        toast.success(`${notification.from_user.username} a commenté votre publication`);
        break;
      case 'follow':
        toast.success(`${notification.from_user.username} vous suit maintenant`);
        break;
      case 'mention':
        toast.success(`${notification.from_user.username} vous a mentionné`);
        break;
      default:
        toast.success(notification.message);
    }
  }

  // Méthodes publiques pour émettre des événements
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Gestion des listeners
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erreur dans le listener ${event}:`, error);
        }
      });
    }
  }

  // Méthodes spécifiques aux fonctionnalités
  joinRoom(roomId: string): void {
    this.emit('join_room', { room: roomId });
  }

  leaveRoom(roomId: string): void {
    this.emit('leave_room', { room: roomId });
  }

  sendTyping(postId: string): void {
    this.emit('typing', { post_id: postId });
  }

  stopTyping(postId: string): void {
    this.emit('stop_typing', { post_id: postId });
  }

  updateOnlineStatus(isOnline: boolean): void {
    this.emit('update_status', { is_online: isOnline });
  }

  // Méthodes de gestion de la connexion
  disconnect(): void {
    if (this.socket) {
      this.emit('user_offline');
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Méthode pour nettoyer lors du démontage
  cleanup(): void {
    this.disconnect();
  }
}

// Instance singleton du gestionnaire de socket
export const socketManager = new SocketManager();

// Hook personnalisé pour utiliser les sockets dans les composants React
export const useSocket = () => {
  const connect = () => socketManager.connect();
  const disconnect = () => socketManager.disconnect();
  const emit = (event: string, data?: any) => socketManager.emit(event, data);
  const on = (event: string, callback: Function) => socketManager.on(event, callback);
  const off = (event: string, callback: Function) => socketManager.off(event, callback);
  const isConnected = () => socketManager.isConnected();

  return {
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected,
    joinRoom: (roomId: string) => socketManager.joinRoom(roomId),
    leaveRoom: (roomId: string) => socketManager.leaveRoom(roomId),
    sendTyping: (postId: string) => socketManager.sendTyping(postId),
    stopTyping: (postId: string) => socketManager.stopTyping(postId),
    updateOnlineStatus: (isOnline: boolean) => socketManager.updateOnlineStatus(isOnline),
  };
};

export default socketManager;