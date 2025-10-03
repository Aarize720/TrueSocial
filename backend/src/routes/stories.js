/**
 * Routes pour la gestion des stories
 * Création, lecture, visualisation, expiration automatique
 */

const express = require('express');
const { db, cache } = require('../config/database');
const { requireAuth } = require('../config/passport');
const { asyncHandler, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { storyValidation, paramValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/stories
 * @desc    Créer une nouvelle story
 * @access  Private
 */
router.post('/',
  requireAuth,
  validateRequest(storyValidation.createStory),
  asyncHandler(async (req, res) => {
    const { mediaUrl, mediaType, textOverlay, backgroundColor } = req.body;
    const userId = req.user.id;

    // Créer la story
    const result = await db.query(
      `INSERT INTO stories (user_id, media_url, media_type, text_overlay, background_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at, expires_at`,
      [userId, mediaUrl, mediaType, textOverlay, backgroundColor]
    );

    const story = result.rows[0];

    // Invalider les caches des stories
    await cache.delPattern(`stories:*`);
    await cache.delPattern(`user_stories:${userId}*`);

    logger.info(`Nouvelle story créée par ${req.user.username}: ${story.id}`);

    res.status(201).json({
      message: 'Story créée avec succès',
      story: {
        id: story.id,
        userId,
        mediaUrl,
        mediaType,
        textOverlay,
        backgroundColor,
        viewsCount: 0,
        createdAt: story.created_at,
        expiresAt: story.expires_at
      }
    });
  })
);

/**
 * @route   GET /api/stories
 * @desc    Obtenir les stories du feed (utilisateurs suivis + propres stories)
 * @access  Private
 */
router.get('/',
  requireAuth,
  validateRequest(storyValidation.getStories, 'query'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Clé de cache
    const cacheKey = `stories_feed:${userId}:${page}:${limit}`;
    
    // Essayer de récupérer depuis le cache
    let cachedStories = await cache.get(cacheKey);
    if (cachedStories) {
      return res.json(cachedStories);
    }

    // Récupérer les stories des utilisateurs suivis + propres stories
    // Groupées par utilisateur avec la story la plus récente en premier
    const result = await db.query(
      `SELECT DISTINCT ON (s.user_id) 
              s.id, s.user_id, s.media_url, s.media_type, s.text_overlay, 
              s.background_color, s.views_count, s.created_at, s.expires_at,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE WHEN sv.id IS NOT NULL THEN true ELSE false END as is_viewed,
              -- Compter le nombre total de stories de cet utilisateur
              (SELECT COUNT(*) FROM stories s2 
               WHERE s2.user_id = s.user_id AND s2.expires_at > NOW()) as total_stories
       FROM stories s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $1
       WHERE s.expires_at > NOW() 
         AND u.is_active = true
         AND (
           s.user_id = $1 OR 
           s.user_id IN (
             SELECT following_id FROM follows 
             WHERE follower_id = $1 AND status = 'accepted'
           )
         )
       ORDER BY s.user_id, s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Pour chaque utilisateur, récupérer toutes ses stories actives
    const storiesWithDetails = await Promise.all(
      result.rows.map(async (storyGroup) => {
        const userStoriesResult = await db.query(
          `SELECT s.id, s.media_url, s.media_type, s.text_overlay, s.background_color,
                  s.views_count, s.created_at, s.expires_at,
                  CASE WHEN sv.id IS NOT NULL THEN true ELSE false END as is_viewed
           FROM stories s
           LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $1
           WHERE s.user_id = $2 AND s.expires_at > NOW()
           ORDER BY s.created_at ASC`,
          [userId, storyGroup.user_id]
        );

        return {
          user: {
            id: storyGroup.user_id,
            username: storyGroup.username,
            fullName: storyGroup.full_name,
            avatarUrl: storyGroup.avatar_url,
            isVerified: storyGroup.is_verified
          },
          stories: userStoriesResult.rows.map(story => ({
            id: story.id,
            mediaUrl: story.media_url,
            mediaType: story.media_type,
            textOverlay: story.text_overlay,
            backgroundColor: story.background_color,
            viewsCount: story.views_count,
            isViewed: story.is_viewed,
            createdAt: story.created_at,
            expiresAt: story.expires_at
          })),
          totalStories: parseInt(storyGroup.total_stories),
          hasUnviewed: userStoriesResult.rows.some(story => !story.is_viewed)
        };
      })
    );

    // Trier par priorité : stories non vues en premier, puis par date
    storiesWithDetails.sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.stories[0]?.createdAt) - new Date(a.stories[0]?.createdAt);
    });

    const response = {
      storiesGroups: storiesWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasNext: storiesWithDetails.length === parseInt(limit)
      }
    };

    // Mettre en cache pour 5 minutes
    await cache.set(cacheKey, response, 300);

    res.json(response);
  })
);

/**
 * @route   GET /api/stories/user/:userId
 * @desc    Obtenir les stories d'un utilisateur spécifique
 * @access  Private
 */
router.get('/user/:userId',
  requireAuth,
  validateRequest(paramValidation.userId, 'params'),
  validateRequest(storyValidation.getStories, 'query'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    // Vérifier que l'utilisateur existe et qu'on peut voir ses stories
    const userResult = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, u.is_private,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM users u
       LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $2
       WHERE u.id = $1 AND u.is_active = true`,
      [userId, currentUserId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const user = userResult.rows[0];
    const isOwnProfile = userId === currentUserId;

    // Vérifier les permissions pour les comptes privés
    if (user.is_private && !isOwnProfile && !user.is_following) {
      throw new ForbiddenError('Profil privé');
    }

    // Récupérer les stories de l'utilisateur
    const storiesResult = await db.query(
      `SELECT s.id, s.media_url, s.media_type, s.text_overlay, s.background_color,
              s.views_count, s.created_at, s.expires_at,
              CASE WHEN sv.id IS NOT NULL THEN true ELSE false END as is_viewed
       FROM stories s
       LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $1
       WHERE s.user_id = $2 AND s.expires_at > NOW()
       ORDER BY s.created_at ASC
       LIMIT $3 OFFSET $4`,
      [currentUserId, userId, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM stories WHERE user_id = $1 AND expires_at > NOW()',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const stories = storiesResult.rows.map(story => ({
      id: story.id,
      mediaUrl: story.media_url,
      mediaType: story.media_type,
      textOverlay: story.text_overlay,
      backgroundColor: story.background_color,
      viewsCount: story.views_count,
      isViewed: story.is_viewed,
      createdAt: story.created_at,
      expiresAt: story.expires_at
    }));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified
      },
      stories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  })
);

/**
 * @route   GET /api/stories/:storyId
 * @desc    Obtenir une story spécifique
 * @access  Private
 */
router.get('/:storyId',
  requireAuth,
  validateRequest(paramValidation.storyId, 'params'),
  asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const userId = req.user.id;

    // Récupérer la story avec les informations de l'utilisateur
    const result = await db.query(
      `SELECT s.id, s.user_id, s.media_url, s.media_type, s.text_overlay, 
              s.background_color, s.views_count, s.created_at, s.expires_at,
              u.username, u.full_name, u.avatar_url, u.is_verified, u.is_private,
              CASE WHEN sv.id IS NOT NULL THEN true ELSE false END as is_viewed,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM stories s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $2
       LEFT JOIN follows f ON f.following_id = s.user_id AND f.follower_id = $2
       WHERE s.id = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [storyId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Story non trouvée ou expirée');
    }

    const story = result.rows[0];
    const isOwnStory = userId === story.user_id;

    // Vérifier les permissions pour les comptes privés
    if (story.is_private && !isOwnStory && !story.is_following) {
      throw new ForbiddenError('Vous ne pouvez pas voir cette story');
    }

    res.json({
      story: {
        id: story.id,
        user: {
          id: story.user_id,
          username: story.username,
          fullName: story.full_name,
          avatarUrl: story.avatar_url,
          isVerified: story.is_verified
        },
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        textOverlay: story.text_overlay,
        backgroundColor: story.background_color,
        viewsCount: story.views_count,
        isViewed: story.is_viewed,
        createdAt: story.created_at,
        expiresAt: story.expires_at
      }
    });
  })
);

/**
 * @route   POST /api/stories/:storyId/view
 * @desc    Marquer une story comme vue
 * @access  Private
 */
router.post('/:storyId/view',
  requireAuth,
  validateRequest(paramValidation.storyId, 'params'),
  asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const userId = req.user.id;

    // Vérifier que la story existe et qu'on peut la voir
    const storyResult = await db.query(
      `SELECT s.id, s.user_id, u.is_private,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM stories s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN follows f ON f.following_id = s.user_id AND f.follower_id = $2
       WHERE s.id = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [storyId, userId]
    );

    if (storyResult.rows.length === 0) {
      throw new NotFoundError('Story non trouvée ou expirée');
    }

    const story = storyResult.rows[0];
    const isOwnStory = userId === story.user_id;

    // Vérifier les permissions
    if (story.is_private && !isOwnStory && !story.is_following) {
      throw new ForbiddenError('Vous ne pouvez pas voir cette story');
    }

    // Ne pas enregistrer la vue si c'est sa propre story
    if (isOwnStory) {
      return res.json({
        message: 'Vue non enregistrée (propre story)'
      });
    }

    // Vérifier si la vue existe déjà
    const existingView = await db.query(
      'SELECT id FROM story_views WHERE story_id = $1 AND viewer_id = $2',
      [storyId, userId]
    );

    if (existingView.rows.length === 0) {
      // Enregistrer la vue
      await db.query(
        'INSERT INTO story_views (story_id, viewer_id) VALUES ($1, $2)',
        [storyId, userId]
      );

      // Invalider les caches
      await cache.delPattern(`stories:*`);
      await cache.delPattern(`user_stories:${story.user_id}*`);
    }

    res.json({
      message: 'Story vue'
    });
  })
);

/**
 * @route   GET /api/stories/:storyId/views
 * @desc    Obtenir la liste des vues d'une story (propriétaire seulement)
 * @access  Private
 */
router.get('/:storyId/views',
  requireAuth,
  validateRequest(paramValidation.storyId, 'params'),
  asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Vérifier que la story existe et appartient à l'utilisateur
    const storyResult = await db.query(
      'SELECT id, user_id FROM stories WHERE id = $1 AND user_id = $2',
      [storyId, userId]
    );

    if (storyResult.rows.length === 0) {
      throw new NotFoundError('Story non trouvée ou non autorisée');
    }

    // Récupérer les vues
    const viewsResult = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              sv.viewed_at,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM story_views sv
       JOIN users u ON sv.viewer_id = u.id
       LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $1
       WHERE sv.story_id = $2 AND u.is_active = true
       ORDER BY sv.viewed_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, storyId, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM story_views sv
       JOIN users u ON sv.viewer_id = u.id
       WHERE sv.story_id = $1 AND u.is_active = true`,
      [storyId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const views = viewsResult.rows.map(view => ({
      user: {
        id: view.id,
        username: view.username,
        fullName: view.full_name,
        avatarUrl: view.avatar_url,
        isVerified: view.is_verified,
        isFollowing: view.is_following
      },
      viewedAt: view.viewed_at
    }));

    res.json({
      views,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  })
);

/**
 * @route   DELETE /api/stories/:storyId
 * @desc    Supprimer une story
 * @access  Private
 */
router.delete('/:storyId',
  requireAuth,
  validateRequest(paramValidation.storyId, 'params'),
  asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    const userId = req.user.id;

    // Vérifier que la story existe et appartient à l'utilisateur
    const storyResult = await db.query(
      'SELECT id, user_id FROM stories WHERE id = $1 AND user_id = $2',
      [storyId, userId]
    );

    if (storyResult.rows.length === 0) {
      throw new NotFoundError('Story non trouvée ou non autorisée');
    }

    // Supprimer la story
    await db.query('DELETE FROM stories WHERE id = $1', [storyId]);

    // Invalider les caches
    await cache.delPattern(`stories:*`);
    await cache.delPattern(`user_stories:${userId}*`);

    logger.info(`Story supprimée par ${req.user.username}: ${storyId}`);

    res.json({
      message: 'Story supprimée avec succès'
    });
  })
);

/**
 * @route   POST /api/stories/cleanup
 * @desc    Nettoyer les stories expirées (tâche de maintenance)
 * @access  Private (admin seulement - à implémenter)
 */
router.post('/cleanup',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Cette route pourrait être protégée par un rôle admin
    // Pour l'instant, on permet à tous les utilisateurs authentifiés
    
    const result = await db.query(
      'DELETE FROM stories WHERE expires_at < NOW() RETURNING id'
    );

    const deletedCount = result.rows.length;

    // Invalider tous les caches des stories
    await cache.delPattern('stories:*');
    await cache.delPattern('user_stories:*');

    logger.info(`Nettoyage des stories: ${deletedCount} stories expirées supprimées`);

    res.json({
      message: `${deletedCount} stories expirées supprimées`,
      deletedCount
    });
  })
);

module.exports = router;