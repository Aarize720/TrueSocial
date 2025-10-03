/**
 * Routes pour la gestion des posts
 * Création, lecture, mise à jour, suppression, likes, feed
 */

const express = require('express');
const { db, cache } = require('../config/database');
const { requireAuth, optionalAuth } = require('../config/passport');
const { asyncHandler, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { postValidation, paramValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/posts
 * @desc    Créer un nouveau post
 * @access  Private
 */
router.post('/',
  requireAuth,
  validateRequest(postValidation.createPost),
  asyncHandler(async (req, res) => {
    const { caption, mediaUrls, mediaType, location, hashtags = [], mentions = [] } = req.body;
    const userId = req.user.id;

    // Extraire les hashtags du caption si pas fournis
    let finalHashtags = hashtags;
    if (caption && finalHashtags.length === 0) {
      const hashtagMatches = caption.match(/#[a-zA-Z0-9_]+/g);
      if (hashtagMatches) {
        finalHashtags = hashtagMatches.map(tag => tag.substring(1).toLowerCase());
      }
    }

    // Extraire les mentions du caption si pas fournies
    let finalMentions = mentions;
    if (caption && finalMentions.length === 0) {
      const mentionMatches = caption.match(/@[a-zA-Z0-9_]+/g);
      if (mentionMatches) {
        const usernames = mentionMatches.map(mention => mention.substring(1));
        const mentionResult = await db.query(
          'SELECT id FROM users WHERE username = ANY($1) AND is_active = true',
          [usernames]
        );
        finalMentions = mentionResult.rows.map(row => row.id);
      }
    }

    // Créer le post
    const result = await db.query(
      `INSERT INTO posts (user_id, caption, media_urls, media_type, location, hashtags, mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [userId, caption, JSON.stringify(mediaUrls), mediaType, location, finalHashtags, finalMentions]
    );

    const post = result.rows[0];

    // Mettre à jour les hashtags tendances
    if (finalHashtags.length > 0) {
      for (const hashtag of finalHashtags) {
        await db.query(
          `INSERT INTO trending_hashtags (hashtag, posts_count, trend_score, last_used_at)
           VALUES ($1, 1, 1, NOW())
           ON CONFLICT (hashtag) DO UPDATE SET
             posts_count = trending_hashtags.posts_count + 1,
             trend_score = trending_hashtags.trend_score + 1,
             last_used_at = NOW()`,
          [hashtag]
        );
      }
    }

    // Créer des notifications pour les mentions
    if (finalMentions.length > 0) {
      const notificationPromises = finalMentions.map(mentionedUserId => 
        db.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, post_id, title, message)
           VALUES ($1, $2, 'mention', $3, 'Mention dans un post', $4)`,
          [
            mentionedUserId, 
            userId, 
            post.id, 
            `${req.user.username} vous a mentionné dans un post`
          ]
        )
      );
      await Promise.all(notificationPromises);
    }

    // Invalider les caches du feed
    await cache.delPattern('feed:*');
    await cache.delPattern(`user_posts:${userId}*`);

    logger.info(`Nouveau post créé par ${req.user.username}: ${post.id}`);

    res.status(201).json({
      message: 'Post créé avec succès',
      post: {
        id: post.id,
        userId,
        caption,
        mediaUrls,
        mediaType,
        location,
        hashtags: finalHashtags,
        mentions: finalMentions,
        likesCount: 0,
        commentsCount: 0,
        createdAt: post.created_at
      }
    });
  })
);

/**
 * @route   GET /api/posts/feed
 * @desc    Obtenir le feed personnalisé
 * @access  Private
 */
router.get('/feed',
  requireAuth,
  validateRequest(postValidation.getFeed, 'query'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, cursor } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    // Clé de cache pour le feed
    const cacheKey = `feed:${userId}:${page}:${limit}`;
    
    // Essayer de récupérer depuis le cache
    let cachedFeed = await cache.get(cacheKey);
    if (cachedFeed && !cursor) {
      return res.json(cachedFeed);
    }

    // Construire la requête avec ou sans curseur
    let query, params;
    
    if (cursor) {
      // Pagination avec curseur (plus efficace pour les gros datasets)
      query = `
        SELECT p.id, p.user_id, p.caption, p.media_urls, p.media_type, p.location,
               p.hashtags, p.likes_count, p.comments_count, p.created_at,
               u.username, u.full_name, u.avatar_url, u.is_verified,
               CASE WHEN l.id IS NOT NULL THEN true ELSE false END as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = $1
        WHERE p.is_archived = false AND p.is_hidden = false AND u.is_active = true
          AND p.created_at < $2
          AND (
            p.user_id = $1 OR 
            p.user_id IN (
              SELECT following_id FROM follows 
              WHERE follower_id = $1 AND status = 'accepted'
            )
          )
        ORDER BY p.created_at DESC
        LIMIT $3`;
      params = [userId, cursor, limit];
    } else {
      // Pagination classique
      query = `
        SELECT p.id, p.user_id, p.caption, p.media_urls, p.media_type, p.location,
               p.hashtags, p.likes_count, p.comments_count, p.created_at,
               u.username, u.full_name, u.avatar_url, u.is_verified,
               CASE WHEN l.id IS NOT NULL THEN true ELSE false END as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = $1
        WHERE p.is_archived = false AND p.is_hidden = false AND u.is_active = true
          AND (
            p.user_id = $1 OR 
            p.user_id IN (
              SELECT following_id FROM follows 
              WHERE follower_id = $1 AND status = 'accepted'
            )
          )
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3`;
      params = [userId, limit, offset];
    }

    const result = await db.query(query, params);

    // Formater les posts
    const posts = result.rows.map(post => ({
      id: post.id,
      user: {
        id: post.user_id,
        username: post.username,
        fullName: post.full_name,
        avatarUrl: post.avatar_url,
        isVerified: post.is_verified
      },
      caption: post.caption,
      mediaUrls: post.media_urls,
      mediaType: post.media_type,
      location: post.location,
      hashtags: post.hashtags || [],
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      isLiked: post.is_liked,
      createdAt: post.created_at
    }));

    // Déterminer le curseur suivant
    const nextCursor = posts.length > 0 ? posts[posts.length - 1].createdAt : null;

    const response = {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasNext: posts.length === parseInt(limit),
        nextCursor
      }
    };

    // Mettre en cache si pas de curseur
    if (!cursor) {
      await cache.set(cacheKey, response, 300); // 5 minutes
    }

    res.json(response);
  })
);

/**
 * @route   GET /api/posts/explore
 * @desc    Obtenir les posts populaires/tendances
 * @access  Private
 */
router.get('/explore',
  requireAuth,
  validateRequest(postValidation.getFeed, 'query'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Clé de cache pour l'exploration
    const cacheKey = `explore:${page}:${limit}`;
    
    // Essayer de récupérer depuis le cache
    let cachedExplore = await cache.get(cacheKey);
    if (cachedExplore) {
      return res.json(cachedExplore);
    }

    // Posts populaires des 7 derniers jours
    const result = await db.query(
      `SELECT p.id, p.user_id, p.caption, p.media_urls, p.media_type, p.location,
              p.hashtags, p.likes_count, p.comments_count, p.created_at,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE WHEN l.id IS NOT NULL THEN true ELSE false END as is_liked,
              (p.likes_count * 2 + p.comments_count * 3) as engagement_score
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = $1
       WHERE p.created_at > NOW() - INTERVAL '7 days'
         AND p.is_archived = false AND p.is_hidden = false 
         AND u.is_active = true
         AND p.user_id != $1
         AND p.user_id NOT IN (
           SELECT following_id FROM follows 
           WHERE follower_id = $1 AND status = 'accepted'
         )
       ORDER BY engagement_score DESC, p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const posts = result.rows.map(post => ({
      id: post.id,
      user: {
        id: post.user_id,
        username: post.username,
        fullName: post.full_name,
        avatarUrl: post.avatar_url,
        isVerified: post.is_verified
      },
      caption: post.caption,
      mediaUrls: post.media_urls,
      mediaType: post.media_type,
      location: post.location,
      hashtags: post.hashtags || [],
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      isLiked: post.is_liked,
      createdAt: post.created_at,
      engagementScore: post.engagement_score
    }));

    const response = {
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasNext: posts.length === parseInt(limit)
      }
    };

    // Mettre en cache pour 10 minutes
    await cache.set(cacheKey, response, 600);

    res.json(response);
  })
);

/**
 * @route   GET /api/posts/:postId
 * @desc    Obtenir un post spécifique
 * @access  Public (avec auth optionnelle)
 */
router.get('/:postId',
  optionalAuth,
  validateRequest(paramValidation.postId, 'params'),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user?.id;

    const result = await db.query(
      `SELECT p.id, p.user_id, p.caption, p.media_urls, p.media_type, p.location,
              p.hashtags, p.mentions, p.likes_count, p.comments_count, p.created_at,
              u.username, u.full_name, u.avatar_url, u.is_verified, u.is_private,
              CASE WHEN l.id IS NOT NULL THEN true ELSE false END as is_liked,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON l.post_id = p.id AND l.user_id = $2
       LEFT JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $2
       WHERE p.id = $1 AND p.is_archived = false AND p.is_hidden = false 
         AND u.is_active = true`,
      [postId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Post non trouvé');
    }

    const post = result.rows[0];
    const isOwnPost = userId === post.user_id;

    // Vérifier les permissions pour les comptes privés
    if (post.is_private && !isOwnPost && !post.is_following && userId) {
      throw new ForbiddenError('Ce post provient d\'un compte privé');
    }

    // Récupérer les informations des utilisateurs mentionnés
    let mentionedUsers = [];
    if (post.mentions && post.mentions.length > 0) {
      const mentionsResult = await db.query(
        'SELECT id, username, full_name, avatar_url FROM users WHERE id = ANY($1)',
        [post.mentions]
      );
      mentionedUsers = mentionsResult.rows;
    }

    res.json({
      post: {
        id: post.id,
        user: {
          id: post.user_id,
          username: post.username,
          fullName: post.full_name,
          avatarUrl: post.avatar_url,
          isVerified: post.is_verified
        },
        caption: post.caption,
        mediaUrls: post.media_urls,
        mediaType: post.media_type,
        location: post.location,
        hashtags: post.hashtags || [],
        mentions: mentionedUsers,
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        isLiked: post.is_liked,
        createdAt: post.created_at
      }
    });
  })
);

/**
 * @route   PUT /api/posts/:postId
 * @desc    Modifier un post
 * @access  Private
 */
router.put('/:postId',
  requireAuth,
  validateRequest(paramValidation.postId, 'params'),
  validateRequest(postValidation.updatePost),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { caption, location, hashtags, mentions } = req.body;
    const userId = req.user.id;

    // Vérifier que le post existe et appartient à l'utilisateur
    const postResult = await db.query(
      'SELECT id, user_id, caption FROM posts WHERE id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (postResult.rows.length === 0) {
      throw new NotFoundError('Post non trouvé ou non autorisé');
    }

    // Construire la requête de mise à jour
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (caption !== undefined) {
      updates.push(`caption = $${paramCount++}`);
      values.push(caption);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (hashtags !== undefined) {
      updates.push(`hashtags = $${paramCount++}`);
      values.push(hashtags);
    }
    if (mentions !== undefined) {
      updates.push(`mentions = $${paramCount++}`);
      values.push(mentions);
    }

    if (updates.length === 0) {
      return res.json({ message: 'Aucune modification à apporter' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(postId);

    await db.query(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Invalider les caches
    await cache.delPattern('feed:*');
    await cache.delPattern(`user_posts:${userId}*`);
    await cache.del(`post:${postId}`);

    logger.info(`Post modifié par ${req.user.username}: ${postId}`);

    res.json({
      message: 'Post modifié avec succès'
    });
  })
);

/**
 * @route   DELETE /api/posts/:postId
 * @desc    Supprimer un post
 * @access  Private
 */
router.delete('/:postId',
  requireAuth,
  validateRequest(paramValidation.postId, 'params'),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    // Vérifier que le post existe et appartient à l'utilisateur
    const postResult = await db.query(
      'SELECT id, user_id FROM posts WHERE id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (postResult.rows.length === 0) {
      throw new NotFoundError('Post non trouvé ou non autorisé');
    }

    // Supprimer le post (cascade supprimera les likes, commentaires, etc.)
    await db.query('DELETE FROM posts WHERE id = $1', [postId]);

    // Invalider les caches
    await cache.delPattern('feed:*');
    await cache.delPattern(`user_posts:${userId}*`);
    await cache.del(`post:${postId}`);

    logger.info(`Post supprimé par ${req.user.username}: ${postId}`);

    res.json({
      message: 'Post supprimé avec succès'
    });
  })
);

/**
 * @route   POST /api/posts/:postId/like
 * @desc    Liker/unliker un post
 * @access  Private
 */
router.post('/:postId/like',
  requireAuth,
  validateRequest(paramValidation.postId, 'params'),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    // Vérifier que le post existe
    const postResult = await db.query(
      `SELECT p.id, p.user_id, u.username 
       FROM posts p 
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1 AND p.is_archived = false AND p.is_hidden = false`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      throw new NotFoundError('Post non trouvé');
    }

    const post = postResult.rows[0];

    // Vérifier si l'utilisateur a déjà liké
    const existingLike = await db.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    let action = '';

    if (existingLike.rows.length > 0) {
      // Unlike
      await db.query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
      action = 'unliked';
    } else {
      // Like
      await db.query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
      action = 'liked';

      // Créer une notification si ce n'est pas son propre post
      if (post.user_id !== userId) {
        await db.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, post_id, title, message)
           VALUES ($1, $2, 'like', $3, 'Nouveau like', $4)`,
          [
            post.user_id, 
            userId, 
            postId, 
            `${req.user.username} a aimé votre post`
          ]
        );
      }
    }

    // Invalider les caches
    await cache.delPattern('feed:*');
    await cache.del(`post:${postId}`);
    await cache.delPattern(`post_likes:${postId}*`);

    res.json({
      message: `Post ${action === 'liked' ? 'liké' : 'unliké'}`,
      action,
      isLiked: action === 'liked'
    });
  })
);

/**
 * @route   GET /api/posts/:postId/likes
 * @desc    Obtenir la liste des likes d'un post
 * @access  Private
 */
router.get('/:postId/likes',
  requireAuth,
  validateRequest(paramValidation.postId, 'params'),
  validateRequest(postValidation.getPostLikes, 'query'),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    // Vérifier que le post existe
    const postResult = await db.query(
      'SELECT id FROM posts WHERE id = $1 AND is_archived = false AND is_hidden = false',
      [postId]
    );

    if (postResult.rows.length === 0) {
      throw new NotFoundError('Post non trouvé');
    }

    // Récupérer les likes
    const likesResult = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following,
              l.created_at as liked_at
       FROM likes l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $1 AND f.status = 'accepted'
       WHERE l.post_id = $2 AND u.is_active = true
       ORDER BY l.created_at DESC
       LIMIT $3 OFFSET $4`,
      [currentUserId, postId, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM likes l
       JOIN users u ON l.user_id = u.id
       WHERE l.post_id = $1 AND u.is_active = true`,
      [postId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      likes: likesResult.rows.map(like => ({
        user: {
          id: like.id,
          username: like.username,
          fullName: like.full_name,
          avatarUrl: like.avatar_url,
          isVerified: like.is_verified,
          isFollowing: like.is_following
        },
        likedAt: like.liked_at
      })),
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

module.exports = router;