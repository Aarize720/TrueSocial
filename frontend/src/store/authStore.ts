// Store Zustand pour l'authentification
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import { authApi, usersApi } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { storage } from '@/lib/utils';
import type { 
  AuthUser, 
  LoginCredentials, 
  RegisterCredentials, 
  UpdateProfileData,
  User 
} from '@/types';

interface AuthState {
  // État
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshToken: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  updateUserStats: (stats: Partial<Pick<User, 'followers_count' | 'following_count' | 'posts_count'>>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      // Initialisation de l'authentification
      initialize: async () => {
        const token = storage.get('auth_token');
        const user = storage.get('user');

        if (token && user) {
          set({ 
            user: { ...user, token }, 
            isAuthenticated: true,
            isInitialized: true 
          });
          
          // Connecter les WebSockets
          socketManager.connect();
          
          // Vérifier la validité du token en arrière-plan
          try {
            await get().refreshToken();
          } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
            get().logout();
          }
        } else {
          set({ isInitialized: true });
        }
      },

      // Connexion
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        
        try {
          const response = await authApi.login(credentials);
          
          if (response.success && response.data) {
            const { user, token, refresh_token } = response.data;
            
            // Sauvegarder les tokens
            storage.set('auth_token', token);
            storage.set('refresh_token', refresh_token);
            storage.set('user', user);
            
            // Mettre à jour l'état
            set({
              user: { ...user, token, refresh_token },
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Connecter les WebSockets
            socketManager.connect();
            
            toast.success(`Bienvenue ${user.username} !`);
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Erreur de connexion';
          toast.error(message);
          throw error;
        }
      },

      // Inscription
      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true });
        
        try {
          const response = await authApi.register(credentials);
          
          if (response.success && response.data) {
            const { user, token, refresh_token } = response.data;
            
            // Sauvegarder les tokens
            storage.set('auth_token', token);
            storage.set('refresh_token', refresh_token);
            storage.set('user', user);
            
            // Mettre à jour l'état
            set({
              user: { ...user, token, refresh_token },
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Connecter les WebSockets
            socketManager.connect();
            
            toast.success(`Compte créé avec succès ! Bienvenue ${user.username} !`);
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Erreur lors de l\'inscription';
          toast.error(message);
          throw error;
        }
      },

      // Déconnexion
      logout: () => {
        // Nettoyer le stockage
        storage.remove('auth_token');
        storage.remove('refresh_token');
        storage.remove('user');
        
        // Déconnecter les WebSockets
        socketManager.disconnect();
        
        // Réinitialiser l'état
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Appeler l'API de déconnexion (optionnel)
        authApi.logout().catch(console.error);
        
        toast.success('Déconnexion réussie');
        
        // Rediriger vers la page de connexion
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      },

      // Mise à jour du profil
      updateProfile: async (data: UpdateProfileData) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({ isLoading: true });
        
        try {
          let response;
          
          // Si on a une image de profil, l'uploader d'abord
          if (data.profile_picture) {
            const uploadResponse = await usersApi.uploadAvatar(data.profile_picture);
            if (uploadResponse.success) {
              // Mettre à jour les autres données
              const updateData = { ...data };
              delete updateData.profile_picture;
              response = await usersApi.updateProfile(updateData);
              
              // Mettre à jour l'URL de l'avatar
              if (response.success && response.data) {
                response.data.profile_picture = uploadResponse.data.url;
              }
            }
          } else {
            response = await usersApi.updateProfile(data);
          }
          
          if (response?.success && response.data) {
            const updatedUser = { ...currentUser, ...response.data };
            
            // Sauvegarder les modifications
            storage.set('user', updatedUser);
            
            // Mettre à jour l'état
            set({
              user: updatedUser,
              isLoading: false,
            });
            
            toast.success('Profil mis à jour avec succès');
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
          toast.error(message);
          throw error;
        }
      },

      // Rafraîchissement du token
      refreshToken: async () => {
        const refreshToken = storage.get('refresh_token');
        if (!refreshToken) {
          throw new Error('Aucun refresh token disponible');
        }

        try {
          const response = await authApi.refreshToken(refreshToken);
          
          if (response.success && response.data) {
            const { token, refresh_token, user } = response.data;
            
            // Sauvegarder les nouveaux tokens
            storage.set('auth_token', token);
            storage.set('refresh_token', refresh_token);
            
            if (user) {
              storage.set('user', user);
              set({
                user: { ...user, token, refresh_token },
              });
            } else {
              // Mettre à jour seulement les tokens
              const currentUser = get().user;
              if (currentUser) {
                set({
                  user: { ...currentUser, token, refresh_token },
                });
              }
            }
          }
        } catch (error) {
          // En cas d'erreur, déconnecter l'utilisateur
          get().logout();
          throw error;
        }
      },

      // Setter pour l'utilisateur
      setUser: (user: AuthUser | null) => {
        set({ user, isAuthenticated: !!user });
        if (user) {
          storage.set('user', user);
        }
      },

      // Mise à jour des statistiques utilisateur
      updateUserStats: (stats) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...stats };
          set({ user: updatedUser });
          storage.set('user', updatedUser);
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook pour utiliser l'authentification
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    ...store,
    // Helpers
    isLoggedIn: store.isAuthenticated && !!store.user,
    userId: store.user?.id,
    username: store.user?.username,
    userAvatar: store.user?.profile_picture,
    isVerified: store.user?.is_verified || false,
  };
};

// L'initialisation est maintenant gérée par l'AuthProvider