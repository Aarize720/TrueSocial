// Types principaux pour l'application TrueSocial

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  profile_picture?: string;
  is_verified: boolean;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  user: User;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
  hashtags: string[];
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user: User;
  content: string;
  likes_count: number;
  is_liked: boolean;
  parent_id?: string;
  replies?: Comment[];
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  user: User;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  is_viewed: boolean;
  views_count: number;
  expires_at: string;
  created_at: string;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  has_unseen: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  from_user: User;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'story_view';
  post_id?: string;
  post?: Post;
  comment_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  follower: User;
  following: User;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id?: string;
  comment_id?: string;
  user: User;
  created_at: string;
}

export interface HashtagTrend {
  hashtag: string;
  posts_count: number;
  trend_score: number;
}

export interface SearchResult {
  users: User[];
  hashtags: HashtagTrend[];
  posts: Post[];
}

// Types pour l'authentification
export interface AuthUser extends User {
  token: string;
  refresh_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  message?: string;
}

// Types pour les formulaires
export interface CreatePostData {
  caption?: string;
  media: File;
  location?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  bio?: string;
  profile_picture?: File;
  is_private?: boolean;
}

export interface CreateCommentData {
  content: string;
  parent_id?: string;
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Types pour les WebSockets
export interface SocketEvent {
  type: 'notification' | 'like' | 'comment' | 'follow' | 'online_status';
  data: any;
  timestamp: string;
}

export interface OnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
}

// Types pour les stores Zustand
export interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export interface PostStore {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  fetchPosts: (page?: number) => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
}

export interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// Types pour les hooks
export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export interface UseDebounceOptions {
  delay: number;
}

// Types pour les composants
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  error?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

// Types pour les utilitaires
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Types pour les erreurs
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Types pour les filtres et tri
export interface PostFilters {
  user_id?: string;
  hashtag?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
}

export interface SortOptions {
  field: 'created_at' | 'likes_count' | 'comments_count';
  order: 'asc' | 'desc';
}

// Export par défaut des types les plus utilisés
export type {
  User as DefaultUser,
  Post as DefaultPost,
  Comment as DefaultComment,
  Story as DefaultStory,
  Notification as DefaultNotification,
};