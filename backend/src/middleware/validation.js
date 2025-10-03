/**
 * Schémas de validation avec Joi
 */

const Joi = require('joi');

// Schémas de base réutilisables
const schemas = {
  // UUID valide
  uuid: Joi.string().uuid().required(),
  
  // UUID optionnel
  optionalUuid: Joi.string().uuid().optional(),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    cursor: Joi.string().optional()
  }),

  // Tri
  sort: Joi.object({
    sortBy: Joi.string().valid('created_at', 'updated_at', 'likes_count', 'comments_count').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Validation pour l'authentification
const authValidation = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Le nom d\'utilisateur ne peut contenir que des lettres et des chiffres',
        'string.min': 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
        'string.max': 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Adresse email invalide'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
      }),
    
    fullName: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Le nom complet doit contenir au moins 2 caractères',
        'string.max': 'Le nom complet ne peut pas dépasser 100 caractères'
      })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
  })
};

// Validation pour les utilisateurs
const userValidation = {
  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(100).optional(),
    bio: Joi.string().max(500).allow('').optional(),
    website: Joi.string().uri().allow('').optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional(),
    isPrivate: Joi.boolean().optional()
  }),

  updateAvatar: Joi.object({
    avatarUrl: Joi.string().uri().required()
  }),

  searchUsers: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    ...schemas.pagination
  }),

  getUserPosts: Joi.object({
    userId: schemas.uuid,
    ...schemas.pagination,
    ...schemas.sort
  })
};

// Validation pour les posts
const postValidation = {
  createPost: Joi.object({
    caption: Joi.string().max(2200).allow('').optional(),
    mediaUrls: Joi.array()
      .items(Joi.string().uri())
      .min(1)
      .max(10)
      .required()
      .messages({
        'array.min': 'Au moins une image ou vidéo est requise',
        'array.max': 'Maximum 10 médias par post'
      }),
    mediaType: Joi.string()
      .valid('image', 'video', 'carousel')
      .required(),
    location: Joi.string().max(255).allow('').optional(),
    hashtags: Joi.array()
      .items(Joi.string().pattern(/^[a-zA-Z0-9_]+$/))
      .max(30)
      .optional(),
    mentions: Joi.array()
      .items(schemas.uuid)
      .max(20)
      .optional()
  }),

  updatePost: Joi.object({
    caption: Joi.string().max(2200).allow('').optional(),
    location: Joi.string().max(255).allow('').optional(),
    hashtags: Joi.array()
      .items(Joi.string().pattern(/^[a-zA-Z0-9_]+$/))
      .max(30)
      .optional(),
    mentions: Joi.array()
      .items(schemas.uuid)
      .max(20)
      .optional()
  }),

  getFeed: Joi.object({
    ...schemas.pagination,
    cursor: Joi.string().optional()
  }),

  getPost: Joi.object({
    postId: schemas.uuid
  }),

  likePost: Joi.object({
    postId: schemas.uuid
  }),

  getPostLikes: Joi.object({
    postId: schemas.uuid,
    ...schemas.pagination
  })
};

// Validation pour les commentaires
const commentValidation = {
  createComment: Joi.object({
    postId: schemas.uuid,
    content: Joi.string().min(1).max(500).required(),
    parentId: schemas.optionalUuid
  }),

  updateComment: Joi.object({
    content: Joi.string().min(1).max(500).required()
  }),

  getComments: Joi.object({
    postId: schemas.uuid,
    ...schemas.pagination,
    parentId: schemas.optionalUuid
  }),

  likeComment: Joi.object({
    commentId: schemas.uuid
  })
};

// Validation pour les stories
const storyValidation = {
  createStory: Joi.object({
    mediaUrl: Joi.string().uri().required(),
    mediaType: Joi.string().valid('image', 'video').required(),
    textOverlay: Joi.string().max(200).allow('').optional(),
    backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
  }),

  getStories: Joi.object({
    userId: schemas.optionalUuid,
    ...schemas.pagination
  }),

  viewStory: Joi.object({
    storyId: schemas.uuid
  })
};

// Validation pour les follows
const followValidation = {
  followUser: Joi.object({
    userId: schemas.uuid
  }),

  getFollowers: Joi.object({
    userId: schemas.uuid,
    ...schemas.pagination
  }),

  getFollowing: Joi.object({
    userId: schemas.uuid,
    ...schemas.pagination
  })
};

// Validation pour les notifications
const notificationValidation = {
  getNotifications: Joi.object({
    ...schemas.pagination,
    unreadOnly: Joi.boolean().default(false)
  }),

  markAsRead: Joi.object({
    notificationIds: Joi.array().items(schemas.uuid).min(1).required()
  })
};

// Validation pour la recherche
const searchValidation = {
  search: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('users', 'posts', 'hashtags', 'all').default('all'),
    ...schemas.pagination
  }),

  searchHashtags: Joi.object({
    q: Joi.string().min(1).max(50).required(),
    ...schemas.pagination
  }),

  getHashtagPosts: Joi.object({
    hashtag: Joi.string().min(1).max(50).required(),
    ...schemas.pagination,
    ...schemas.sort
  })
};

// Validation pour l'upload
const uploadValidation = {
  uploadImage: Joi.object({
    type: Joi.string().valid('avatar', 'post', 'story').required(),
    quality: Joi.number().min(1).max(100).default(80),
    width: Joi.number().min(100).max(2048).optional(),
    height: Joi.number().min(100).max(2048).optional()
  }),

  uploadVideo: Joi.object({
    type: Joi.string().valid('post', 'story').required(),
    quality: Joi.string().valid('low', 'medium', 'high').default('medium'),
    maxDuration: Joi.number().min(1).max(60).default(30) // secondes
  })
};

// Validation pour les paramètres d'URL
const paramValidation = {
  userId: Joi.object({
    userId: schemas.uuid
  }),

  postId: Joi.object({
    postId: schemas.uuid
  }),

  commentId: Joi.object({
    commentId: schemas.uuid
  }),

  storyId: Joi.object({
    storyId: schemas.uuid
  }),

  notificationId: Joi.object({
    notificationId: schemas.uuid
  }),

  username: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required()
  })
};

module.exports = {
  schemas,
  authValidation,
  userValidation,
  postValidation,
  commentValidation,
  storyValidation,
  followValidation,
  notificationValidation,
  searchValidation,
  uploadValidation,
  paramValidation
};