// Utilitaires généraux pour l'application
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow as formatDistanceToNowFn, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction pour combiner les classes CSS avec Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ré-exporter formatDistanceToNow pour l'utiliser dans d'autres composants
export { formatDistanceToNowFn as formatDistanceToNow };

// Formatage des dates
export const formatDate = {
  // Format relatif (il y a 2 heures, hier, etc.)
  relative: (date: string | Date): string => {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (isToday(parsedDate)) {
      return formatDistanceToNow(parsedDate, { 
        addSuffix: true, 
        locale: fr 
      });
    }
    
    if (isYesterday(parsedDate)) {
      return 'Hier';
    }
    
    return format(parsedDate, 'dd MMM yyyy', { locale: fr });
  },

  // Format court pour les posts (2h, 1j, 1s)
  short: (date: string | Date): string => {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}j`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks}sem`;
    }
    
    return format(parsedDate, 'dd MMM', { locale: fr });
  },

  // Format complet
  full: (date: string | Date): string => {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'dd MMMM yyyy à HH:mm', { locale: fr });
  },
};

// Formatage des nombres
export const formatNumber = {
  // Format compact (1.2K, 1.5M, etc.)
  compact: (num: number): string => {
    if (num < 1000) {
      return num.toString();
    }
    
    if (num < 1000000) {
      return `${(num / 1000).toFixed(1).replace('.0', '')}K`;
    }
    
    if (num < 1000000000) {
      return `${(num / 1000000).toFixed(1).replace('.0', '')}M`;
    }
    
    return `${(num / 1000000000).toFixed(1).replace('.0', '')}B`;
  },

  // Format avec séparateurs de milliers
  withSeparators: (num: number): string => {
    return num.toLocaleString('fr-FR');
  },
};

// Validation des fichiers
export const validateFile = {
  // Validation d'image
  image: (file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Format non supporté. Utilisez JPG, PNG ou WebP.',
      };
    }
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fichier trop volumineux. Maximum 10MB.',
      };
    }
    
    return { isValid: true };
  },

  // Validation de vidéo
  video: (file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Format non supporté. Utilisez MP4, WebM ou OGG.',
      };
    }
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fichier trop volumineux. Maximum 100MB.',
      };
    }
    
    return { isValid: true };
  },
};

// Utilitaires pour les médias
export const mediaUtils = {
  // Créer une URL de prévisualisation pour un fichier
  createPreviewUrl: (file: File): string => {
    return URL.createObjectURL(file);
  },

  // Nettoyer une URL de prévisualisation
  revokePreviewUrl: (url: string): void => {
    URL.revokeObjectURL(url);
  },

  // Redimensionner une image
  resizeImage: (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number = 0.8
  ): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  },
};

// Utilitaires pour les hashtags
export const hashtagUtils = {
  // Extraire les hashtags d'un texte
  extract: (text: string): string[] => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  },

  // Formater un texte avec des liens pour les hashtags
  linkify: (text: string): string => {
    return text.replace(
      /#([a-zA-Z0-9_]+)/g,
      '<a href="/hashtag/$1" class="text-blue-500 hover:underline">#$1</a>'
    );
  },

  // Valider un hashtag
  validate: (hashtag: string): boolean => {
    const hashtagRegex = /^[a-zA-Z0-9_]+$/;
    return hashtagRegex.test(hashtag) && hashtag.length >= 1 && hashtag.length <= 30;
  },
};

// Utilitaires pour les mentions
export const mentionUtils = {
  // Extraire les mentions d'un texte
  extract: (text: string): string[] => {
    const mentionRegex = /@[a-zA-Z0-9_.]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.slice(1).toLowerCase()) : [];
  },

  // Formater un texte avec des liens pour les mentions
  linkify: (text: string): string => {
    return text.replace(
      /@([a-zA-Z0-9_.]+)/g,
      '<a href="/user/$1" class="text-blue-500 hover:underline">@$1</a>'
    );
  },
};

// Utilitaires pour le stockage local
export const storage = {
  // Sauvegarder un objet
  set: (key: string, value: any): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Récupérer un objet
  get: <T = any>(key: string): T | null => {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return null;
  },

  // Supprimer un élément
  remove: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },

  // Vider le stockage
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  },
};

// Utilitaires pour les URLs
export const urlUtils = {
  // Construire une URL avec des paramètres
  buildUrl: (base: string, params: Record<string, any>): string => {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  },

  // Extraire les paramètres d'une URL
  getParams: (url: string): Record<string, string> => {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  },
};

// Utilitaires pour la performance
export const performanceUtils = {
  // Debounce une fonction
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Throttle une fonction
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  },
};

// Utilitaires pour la validation
export const validation = {
  // Valider un email
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Valider un nom d'utilisateur
  username: (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_.]{3,30}$/;
    return usernameRegex.test(username);
  },

  // Valider un mot de passe
  password: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Au moins 8 caractères');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Au moins une majuscule');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Au moins une minuscule');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Au moins un chiffre');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Utilitaires pour les erreurs
export const errorUtils = {
  // Extraire un message d'erreur lisible
  getMessage: (error: any): string => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'Une erreur inattendue est survenue';
  },

  // Vérifier si une erreur est due à un problème réseau
  isNetworkError: (error: any): boolean => {
    return !error?.response && error?.code === 'NETWORK_ERROR';
  },

  // Vérifier si une erreur est due à une authentification
  isAuthError: (error: any): boolean => {
    return error?.response?.status === 401;
  },
};

// Exports directs pour la compatibilité avec les imports existants
export const debounce = performanceUtils.debounce;
export { formatNumber };
export { validateFile };