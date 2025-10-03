// Store Zustand pour la gestion des posts
import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { postsApi } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import type { Post, CreatePostData, PaginatedResponse } from '@/types';

interface PostState {
  // État du feed
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;

  // État des posts utilisateur
  userPosts: Record<string, Post[]>;
  userPostsLoading: Record<string, boolean>;
  userPostsHasMore: Record<string, boolean>;
  userPostsPage: Record<string, number>;

  // État des posts sauvegardés
  savedPosts: Post[];
  savedPostsLoading: boolean;
  savedPostsHasMore: boolean;
  savedPostsPage: number;

  // Actions du feed
  fetchFeed: (refresh?: boolean) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  
  // Actions des posts
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (postId: string, data: { caption?: string; location?: string }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  
  // Actions d'interaction
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  
  // Actions des posts utilisateur
  fetchUserPosts: (userId: string, refresh?: boolean) => Promise<void>;
  loadMoreUserPosts: (userId: string) => Promise<void>;
  
  // Actions des posts sauvegardés
  fetchSavedPosts: (refresh?: boolean) => Promise<void>;
  loadMoreSavedPosts: () => Promise<void>;
  
  // Utilitaires
  getPost: (postId: string) => Post | undefined;
  updatePostInStore: (postId: string, updates: Partial<Post>) => void;
  removePostFromStore: (postId: string) => void;
  reset: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  // État initial
  posts: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  page: 1,
  error: null,

  userPosts: {},
  userPostsLoading: {},
  userPostsHasMore: {},
  userPostsPage: {},

  savedPosts: [],
  savedPostsLoading: false,
  savedPostsHasMore: true,
  savedPostsPage: 1,

  // Récupérer le feed
  fetchFeed: async (refresh = false) => {
    const state = get();
    
    if (state.isLoading || (!refresh && state.posts.length > 0)) {
      return;
    }

    set({ 
      isLoading: true, 
      error: null,
      ...(refresh && { posts: [], page: 1, hasMore: true })
    });

    try {
      const page = refresh ? 1 : state.page;
      const response = await postsApi.getFeed(page, 10);
      
      if (response.success && response.data) {
        const { data: posts, pagination } = response.data as PaginatedResponse<Post>;
        
        set({
          posts: refresh ? posts : [...state.posts, ...posts],
          hasMore: pagination.has_next,
          page: pagination.page,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Erreur lors du chargement du feed',
        isLoading: false 
      });
      toast.error('Impossible de charger le feed');
    }
  },

  // Charger plus de posts
  loadMorePosts: async () => {
    const state = get();
    
    if (state.isLoadingMore || !state.hasMore || state.isLoading) {
      return;
    }

    set({ isLoadingMore: true });

    try {
      const response = await postsApi.getFeed(state.page + 1, 10);
      
      if (response.success && response.data) {
        const { data: posts, pagination } = response.data as PaginatedResponse<Post>;
        
        set({
          posts: [...state.posts, ...posts],
          hasMore: pagination.has_next,
          page: pagination.page,
          isLoadingMore: false,
        });
      }
    } catch (error: any) {
      set({ isLoadingMore: false });
      toast.error('Erreur lors du chargement');
    }
  },

  // Créer un post
  createPost: async (data: CreatePostData) => {
    try {
      const formData = new FormData();
      formData.append('media', data.media);
      if (data.caption) formData.append('caption', data.caption);
      if (data.location) formData.append('location', data.location);

      const response = await postsApi.createPost(formData);
      
      if (response.success && response.data) {
        const newPost = response.data as Post;
        
        // Ajouter le post au début du feed
        set(state => ({
          posts: [newPost, ...state.posts]
        }));
        
        toast.success('Post publié avec succès !');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la publication';
      toast.error(message);
      throw error;
    }
  },

  // Mettre à jour un post
  updatePost: async (postId: string, data: { caption?: string; location?: string }) => {
    try {
      const response = await postsApi.updatePost(postId, data);
      
      if (response.success && response.data) {
        const updatedPost = response.data as Post;
        get().updatePostInStore(postId, updatedPost);
        toast.success('Post mis à jour');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
      toast.error(message);
      throw error;
    }
  },

  // Supprimer un post
  deletePost: async (postId: string) => {
    try {
      const response = await postsApi.deletePost(postId);
      
      if (response.success) {
        get().removePostFromStore(postId);
        toast.success('Post supprimé');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
      throw error;
    }
  },

  // Liker/unliker un post
  likePost: async (postId: string) => {
    const post = get().getPost(postId);
    if (!post) return;

    // Optimistic update
    const newLikeStatus = !post.is_liked;
    const newLikesCount = post.likes_count + (newLikeStatus ? 1 : -1);
    
    get().updatePostInStore(postId, {
      is_liked: newLikeStatus,
      likes_count: newLikesCount,
    });

    try {
      if (newLikeStatus) {
        await postsApi.likePost(postId);
      } else {
        await postsApi.unlikePost(postId);
      }
    } catch (error: any) {
      // Revert optimistic update
      get().updatePostInStore(postId, {
        is_liked: post.is_liked,
        likes_count: post.likes_count,
      });
      toast.error('Erreur lors de l\'interaction');
    }
  },

  // Sauvegarder/désauvegarder un post
  savePost: async (postId: string) => {
    const post = get().getPost(postId);
    if (!post) return;

    // Optimistic update
    const newSaveStatus = !post.is_saved;
    
    get().updatePostInStore(postId, {
      is_saved: newSaveStatus,
    });

    try {
      if (newSaveStatus) {
        await postsApi.savePost(postId);
        toast.success('Post sauvegardé');
      } else {
        await postsApi.unsavePost(postId);
        toast.success('Post retiré des favoris');
      }
    } catch (error: any) {
      // Revert optimistic update
      get().updatePostInStore(postId, {
        is_saved: post.is_saved,
      });
      toast.error('Erreur lors de la sauvegarde');
    }
  },

  // Récupérer les posts d'un utilisateur
  fetchUserPosts: async (userId: string, refresh = false) => {
    const state = get();
    
    if (state.userPostsLoading[userId] || (!refresh && state.userPosts[userId]?.length > 0)) {
      return;
    }

    set(state => ({
      userPostsLoading: { ...state.userPostsLoading, [userId]: true },
      ...(refresh && {
        userPosts: { ...state.userPosts, [userId]: [] },
        userPostsPage: { ...state.userPostsPage, [userId]: 1 },
        userPostsHasMore: { ...state.userPostsHasMore, [userId]: true },
      })
    }));

    try {
      const page = refresh ? 1 : (state.userPostsPage[userId] || 1);
      const response = await postsApi.getUserPosts(userId, page, 12);
      
      if (response.success && response.data) {
        const { data: posts, pagination } = response.data as PaginatedResponse<Post>;
        
        set(state => ({
          userPosts: {
            ...state.userPosts,
            [userId]: refresh ? posts : [...(state.userPosts[userId] || []), ...posts]
          },
          userPostsHasMore: { ...state.userPostsHasMore, [userId]: pagination.has_next },
          userPostsPage: { ...state.userPostsPage, [userId]: pagination.page },
          userPostsLoading: { ...state.userPostsLoading, [userId]: false },
        }));
      }
    } catch (error: any) {
      set(state => ({
        userPostsLoading: { ...state.userPostsLoading, [userId]: false }
      }));
      toast.error('Erreur lors du chargement des posts');
    }
  },

  // Charger plus de posts utilisateur
  loadMoreUserPosts: async (userId: string) => {
    const state = get();
    
    if (state.userPostsLoading[userId] || !state.userPostsHasMore[userId]) {
      return;
    }

    set(state => ({
      userPostsLoading: { ...state.userPostsLoading, [userId]: true }
    }));

    try {
      const page = (state.userPostsPage[userId] || 1) + 1;
      const response = await postsApi.getUserPosts(userId, page, 12);
      
      if (response.success && response.data) {
        const { data: posts, pagination } = response.data as PaginatedResponse<Post>;
        
        set(state => ({
          userPosts: {
            ...state.userPosts,
            [userId]: [...(state.userPosts[userId] || []), ...posts]
          },
          userPostsHasMore: { ...state.userPostsHasMore, [userId]: pagination.has_next },
          userPostsPage: { ...state.userPostsPage, [userId]: pagination.page },
          userPostsLoading: { ...state.userPostsLoading, [userId]: false },
        }));
      }
    } catch (error: any) {
      set(state => ({
        userPostsLoading: { ...state.userPostsLoading, [userId]: false }
      }));
      toast.error('Erreur lors du chargement');
    }
  },

  // Récupérer les posts sauvegardés
  fetchSavedPosts: async (refresh = false) => {
    const state = get();
    
    if (state.savedPostsLoading || (!refresh && state.savedPosts.length > 0)) {
      return;
    }

    set({ 
      savedPostsLoading: true,
      ...(refresh && { savedPosts: [], savedPostsPage: 1, savedPostsHasMore: true })
    });

    try {
      const page = refresh ? 1 : state.savedPostsPage;
      const response = await postsApi.getSavedPosts(page, 12);
      
      if (response.success && response.data) {
        const { data: posts, pagination } = response.data as PaginatedResponse<Post>;
        
        set({
          savedPosts: refresh ? posts : [...state.savedPosts, ...posts],
          savedPostsHasMore: pagination.has_next,
          savedPostsPage: pagination.page,
          savedPostsLoading: false,
        });
      }
    } catch (error: any) {
      set({ savedPostsLoading: false });
      toast.error('Erreur lors du chargement des posts sauvegardés');
    }
  },

  // Charger plus de posts sauvegardés
  loadMoreSavedPosts: async () => {
    const state = get();
    
    if (state.savedPostsLoading || !state.savedPostsHasMore) {
      return;
    }

    set({ savedPostsLoading: true });

    try {
      const response = await postsApi.getSavedPosts(state.savedPostsPage + 1, 12);
      
      if (response.success && response.data) {
        const { data: posts, pagination } = response.data as PaginatedResponse<Post>;
        
        set({
          savedPosts: [...state.savedPosts, ...posts],
          savedPostsHasMore: pagination.has_next,
          savedPostsPage: pagination.page,
          savedPostsLoading: false,
        });
      }
    } catch (error: any) {
      set({ savedPostsLoading: false });
      toast.error('Erreur lors du chargement');
    }
  },

  // Utilitaires
  getPost: (postId: string) => {
    const state = get();
    
    // Chercher dans le feed principal
    let post = state.posts.find(p => p.id === postId);
    if (post) return post;
    
    // Chercher dans les posts utilisateur
    for (const userPosts of Object.values(state.userPosts)) {
      post = userPosts.find(p => p.id === postId);
      if (post) return post;
    }
    
    // Chercher dans les posts sauvegardés
    post = state.savedPosts.find(p => p.id === postId);
    return post;
  },

  updatePostInStore: (postId: string, updates: Partial<Post>) => {
    set(state => {
      const updatePostsArray = (posts: Post[]) =>
        posts.map(post => post.id === postId ? { ...post, ...updates } : post);

      return {
        // Mettre à jour le feed principal
        posts: updatePostsArray(state.posts),
        
        // Mettre à jour les posts utilisateur
        userPosts: Object.fromEntries(
          Object.entries(state.userPosts).map(([userId, posts]) => [
            userId,
            updatePostsArray(posts)
          ])
        ),
        
        // Mettre à jour les posts sauvegardés
        savedPosts: updatePostsArray(state.savedPosts),
      };
    });
  },

  removePostFromStore: (postId: string) => {
    set(state => {
      const filterPosts = (posts: Post[]) => posts.filter(post => post.id !== postId);

      return {
        // Retirer du feed principal
        posts: filterPosts(state.posts),
        
        // Retirer des posts utilisateur
        userPosts: Object.fromEntries(
          Object.entries(state.userPosts).map(([userId, posts]) => [
            userId,
            filterPosts(posts)
          ])
        ),
        
        // Retirer des posts sauvegardés
        savedPosts: filterPosts(state.savedPosts),
      };
    });
  },

  reset: () => {
    set({
      posts: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      page: 1,
      error: null,
      userPosts: {},
      userPostsLoading: {},
      userPostsHasMore: {},
      userPostsPage: {},
      savedPosts: [],
      savedPostsLoading: false,
      savedPostsHasMore: true,
      savedPostsPage: 1,
    });
  },
}));

// Configuration des listeners WebSocket
if (typeof window !== 'undefined') {
  // Écouter les likes en temps réel
  socketManager.on('like', (data: { post_id: string; user: any; likes_count: number }) => {
    usePostStore.getState().updatePostInStore(data.post_id, {
      likes_count: data.likes_count,
    });
  });

  // Écouter les commentaires en temps réel
  socketManager.on('comment', (data: { post_id: string; comment: any }) => {
    const post = usePostStore.getState().getPost(data.post_id);
    if (post) {
      usePostStore.getState().updatePostInStore(data.post_id, {
        comments_count: post.comments_count + 1,
      });
    }
  });
}