// Configuration et utilitaires pour les appels API
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import { ApiResponse, ApiError } from '@/types';

// Configuration de base d'Axios
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Intercepteur de requête - ajouter le token d'authentification
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse - gestion des erreurs globales
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Gestion de l'expiration du token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const token = this.getToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Gestion des autres erreurs
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { token, refresh_token } = response.data.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refresh_token);
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
      throw error;
    }
  }

  private handleAuthError(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
  }

  private handleApiError(error: any): void {
    const message = error.response?.data?.message || 
                   error.response?.data?.error || 
                   error.message || 
                   'Une erreur est survenue';

    // Ne pas afficher les erreurs 401 (gérées par l'intercepteur)
    if (error.response?.status !== 401) {
      toast.error(message);
    }
  }

  // Méthodes HTTP génériques
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Méthode pour upload de fichiers
  async upload<T = any>(
    url: string, 
    formData: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }
}

// Instance singleton de l'API client
export const apiClient = new ApiClient();

// Export de l'instance comme 'api' pour la compatibilité
export const api = apiClient;

// Fonctions utilitaires pour les appels API spécifiques

// Authentification
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  register: (userData: { username: string; email: string; password: string; full_name: string }) =>
    apiClient.post('/auth/register', userData),
  
  logout: () =>
    apiClient.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
};

// Utilisateurs
export const usersApi = {
  getProfile: (userId?: string) =>
    apiClient.get(userId ? `/users/${userId}` : '/users/me'),
  
  updateProfile: (data: any) =>
    apiClient.put('/users/me', data),
  
  uploadAvatar: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.upload('/users/me/avatar', formData, onProgress);
  },
  
  searchUsers: (query: string, page = 1, limit = 20) =>
    apiClient.get(`/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  
  followUser: (userId: string) =>
    apiClient.post(`/users/${userId}/follow`),
  
  unfollowUser: (userId: string) =>
    apiClient.delete(`/users/${userId}/follow`),
  
  getFollowers: (userId: string, page = 1, limit = 20) =>
    apiClient.get(`/users/${userId}/followers?page=${page}&limit=${limit}`),
  
  getFollowing: (userId: string, page = 1, limit = 20) =>
    apiClient.get(`/users/${userId}/following?page=${page}&limit=${limit}`),
};

// Posts
export const postsApi = {
  getFeed: (page = 1, limit = 10) =>
    apiClient.get(`/posts/feed?page=${page}&limit=${limit}`),
  
  getUserPosts: (userId: string, page = 1, limit = 12) =>
    apiClient.get(`/posts/user/${userId}?page=${page}&limit=${limit}`),
  
  getPost: (postId: string) =>
    apiClient.get(`/posts/${postId}`),
  
  createPost: (data: FormData, onProgress?: (progress: number) => void) =>
    apiClient.upload('/posts', data, onProgress),
  
  updatePost: (postId: string, data: { caption?: string; location?: string }) =>
    apiClient.put(`/posts/${postId}`, data),
  
  deletePost: (postId: string) =>
    apiClient.delete(`/posts/${postId}`),
  
  likePost: (postId: string) =>
    apiClient.post(`/posts/${postId}/like`),
  
  unlikePost: (postId: string) =>
    apiClient.delete(`/posts/${postId}/like`),
  
  savePost: (postId: string) =>
    apiClient.post(`/posts/${postId}/save`),
  
  unsavePost: (postId: string) =>
    apiClient.delete(`/posts/${postId}/save`),
  
  getSavedPosts: (page = 1, limit = 12) =>
    apiClient.get(`/posts/saved?page=${page}&limit=${limit}`),
};

// Commentaires
export const commentsApi = {
  getComments: (postId: string, page = 1, limit = 20) =>
    apiClient.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`),
  
  createComment: (postId: string, data: { content: string; parent_id?: string }) =>
    apiClient.post(`/posts/${postId}/comments`, data),
  
  updateComment: (commentId: string, content: string) =>
    apiClient.put(`/comments/${commentId}`, { content }),
  
  deleteComment: (commentId: string) =>
    apiClient.delete(`/comments/${commentId}`),
  
  likeComment: (commentId: string) =>
    apiClient.post(`/comments/${commentId}/like`),
  
  unlikeComment: (commentId: string) =>
    apiClient.delete(`/comments/${commentId}/like`),
};

// Stories
export const storiesApi = {
  getStories: () =>
    apiClient.get('/stories'),
  
  getUserStories: (userId: string) =>
    apiClient.get(`/stories/user/${userId}`),
  
  createStory: (data: FormData, onProgress?: (progress: number) => void) =>
    apiClient.upload('/stories', data, onProgress),
  
  viewStory: (storyId: string) =>
    apiClient.post(`/stories/${storyId}/view`),
  
  deleteStory: (storyId: string) =>
    apiClient.delete(`/stories/${storyId}`),
};

// Notifications
export const notificationsApi = {
  getNotifications: (page = 1, limit = 20) =>
    apiClient.get(`/notifications?page=${page}&limit=${limit}`),
  
  markAsRead: (notificationId: string) =>
    apiClient.put(`/notifications/${notificationId}/read`),
  
  markAllAsRead: () =>
    apiClient.put('/notifications/read-all'),
  
  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count'),
};

// Recherche
export const searchApi = {
  search: (query: string, type?: 'users' | 'hashtags' | 'posts') =>
    apiClient.get(`/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}`),
  
  getTrendingHashtags: (limit = 10) =>
    apiClient.get(`/search/trending?limit=${limit}`),
  
  getHashtagPosts: (hashtag: string, page = 1, limit = 12) =>
    apiClient.get(`/search/hashtag/${encodeURIComponent(hashtag)}?page=${page}&limit=${limit}`),
};

export default apiClient;