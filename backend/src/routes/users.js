/**
 * Routes pour la gestion des utilisateurs
 * Profils, followers, following, recherche
 */

const express = require('express');
const { db, cache } = require('../config/database');
const { requireAuth, optionalAuth } = require('../config/passport');
const { asyncHandler, NotFoundError, ForbiddenError, ConflictError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { userValidation, paramValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/users/search
 * @desc    Rechercher des utilisateurs
 * @access  Private
 */
router.get('/search',
  requireAuth,
  validateRequest(userValidation.searchUsers, 'query'),
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    // Recherche avec tri par pertinence
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              u.followers_count, u.posts_count,
              CASE 
                WHEN f.id IS NOT NULL THEN true 
                ELSE false 
              END as is_following,
              CASE 
                WHEN fr.id IS NOT NULL THEN true 
                ELSE false 
              END as follows_you,
              -- Score de pertinence
              CASE 
                WHEN u.username ILIKE $1 THEN 3
                WHEN u.full_name ILIKE $1 THEN 2
                WHEN u.username ILIKE $2 OR u.full_name ILIKE $2 THEN 1
                ELSE 0
              END as relevance_score
       FROM users u
       LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $3 AND f.status = 'accepted'
       LEFT JOIN follows fr ON fr.follower_id = u.id AND fr.following_id = $3 AND fr.status = 'accepted'
       WHERE u.is_active = true 
         AND u.id != $3
         AND (u.username ILIKE $2 OR u.full_name ILIKE $2)
       ORDER BY relevance_score DESC, u.followers_count DESC, u.username ASC
       LIMIT $4 OFFSET $5`,
      [`${q}%`, `%${q}%`, currentUserId, limit, offset]
    );

    // Compter le total pour la pagination
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM users u
       WHERE u.is_active = true 
         AND u.id != $1
         AND (u.username ILIKE $2 OR u.full_name ILIKE $2)`,
      [currentUserId, `%${q}%`]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        followersCount: user.followers_count,
        postsCount: user.posts_count,
        isFollowing: user.is_following,
        followsYou: user.follows_you
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

/**
 * @route   GET /api/users/:username
 * @desc    Obtenir le profil d'un utilisateur par nom d'utilisateur
 * @access  Public (avec auth optionnelle)
 */
router.get('/:username',
  optionalAuth,
  validateRequest(paramValidation.username, 'params'),
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    // Récupérer le profil utilisateur
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url, u.website,
              u.is_verified, u.is_private, u.posts_count, u.followers_count, 
              u.following_count, u.created_at,
              CASE 
                WHEN f.id IS NOT NULL THEN 
                  CASE f.status 
                    WHEN 'accepted' THEN 'following'
                    WHEN 'pending' THEN 'requested'
                    ELSE 'not_following'
                  END
                ELSE 'not_following'
              END as follow_status,
              CASE 
                WHEN fr.id IS NOT NULL AND fr.status = 'accepted' THEN true 
                ELSE false 
              END as follows_you
       FROM users u
       LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = $2
       LEFT JOIN follows fr ON fr.follower_id = u.id AND fr.following_id = $2 AND fr.status = 'accepted'
       WHERE u.username = $1 AND u.is_active = true`,
      [username, currentUserId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const user = result.rows[0];
    const isOwnProfile = currentUserId === user.id;

    // Vérifier si on peut voir le profil (compte privé)
    const canViewProfile = isOwnProfile || 
                          !user.is_private || 
                          user.follow_status === 'following';

    // Récupérer les posts récents si autorisé
    let recentPosts = [];
    if (canViewProfile) {
      const postsResult = await db.query(
        `SELECT p.id, p.media_urls, p.media_type, p.likes_count, p.comments_count,
                p.created_at
         FROM posts p
         WHERE p.user_id = $1 AND p.is_archived = false AND p.is_hidden = false
         ORDER BY p.created_at DESC
         LIMIT 12`,
        [user.id]
      );

      recentPosts = postsResult.rows.map(post => ({
        id: post.id,
        mediaUrls: post.media_urls,
        mediaType: post.media_type,
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        createdAt: post.created_at
      }));
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        website: user.website,
        isVerified: user.is_verified,
        isPrivate: user.is_private,
        postsCount: user.posts_count,
        followersCount: user.followers_count,
        followingCount: user.following_count,
        createdAt: user.created_at,
        followStatus: user.follow_status,
        followsYou: user.follows_you,
        isOwnProfile,
        canViewProfile
      },
      recentPosts: canViewProfile ? recentPosts : []
    });
  })
);

/**
 * @route   PUT /api/users/profile
 * @desc    Mettre à jour son profil
 * @access  Private
 */
router.put('/profile',
  requireAuth,
  validateRequest(userValidation.updateProfile),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { fullName, bio, website, phone, isPrivate } = req.body;

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (website !== undefined) {
      updates.push(`website = $${paramCount++}`);
      values.push(website);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (isPrivate !== undefined) {
      updates.push(`is_private = $${paramCount++}`);
      values.push(isPrivate);
    }

    if (updates.length === 0) {
      return res.json({ message: 'Aucune modification à apporter' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, full_name, bio, avatar_url, website, phone, 
                 is_verified, is_private, updated_at`,
      values
    );

    const updatedUser = result.rows[0];

    // Invalider le cache du profil
    await cache.del(`user_profile:${userId}`);
    await cache.del(`user_profile:${req.user.username}`);

    logger.info(`Profil mis à jour pour l'utilisateur: ${req.user.username}`);

    res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.full_name,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatar_url,
        website: updatedUser.website,
        phone: updatedUser.phone,
        isVerified: updatedUser.is_verified,
        isPrivate: updatedUser.is_private,
        updatedAt: updatedUser.updated_at
      }
    });
  })
);

/**
 * @route   POST /api/users/:userId/follow
 * @desc    Suivre/ne plus suivre un utilisateur
 * @access  Private
 */
router.post('/:userId/follow',
  requireAuth,
  validateRequest(paramValidation.userId, 'params'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const followerId = req.user.id;

    if (userId === followerId) {
      throw new ForbiddenError('Vous ne pouvez pas vous suivre vous-même');
    }

    // Vérifier que l'utilisateur à suivre existe
    const targetUserResult = await db.query(
      'SELECT id, username, is_private FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const targetUser = targetUserResult.rows[0];

    // Vérifier si une relation existe déjà
    const existingFollow = await db.query(
      'SELECT id, status FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    let action = '';
    let status = 'accepted';

    if (existingFollow.rows.length > 0) {
      // Relation existe, la supprimer (unfollow)
      await db.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, userId]
      );
      action = 'unfollowed';
    } else {
      // Nouvelle relation
      if (targetUser.is_private) {
        status = 'pending';
        action = 'requested';
      } else {
        status = 'accepted';
        action = 'followed';
      }

      await db.query(
        'INSERT INTO follows (follower_id, following_id, status) VALUES ($1, $2, $3)',
        [followerId, userId, status]
      );

      // Créer une notification si accepté directement
      if (status === 'accepted') {
        await db.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, title, message)
           VALUES ($1, $2, 'follow', 'Nouveau follower', $3)`,
          [userId, followerId, `${req.user.username} a commencé à vous suivre`]
        );
      } else {
        // Notification de demande de suivi
        await db.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, title, message)
           VALUES ($1, $2, 'follow_request', 'Demande de suivi', $3)`,
          [userId, followerId, `${req.user.username} souhaite vous suivre`]
        );
      }
    }

    // Invalider les caches
    await cache.delPattern(`user_followers:${userId}*`);
    await cache.delPattern(`user_following:${followerId}*`);
    await cache.del(`user_profile:${userId}`);
    await cache.del(`user_profile:${targetUser.username}`);

    logger.info(`${req.user.username} ${action} ${targetUser.username}`);

    res.json({
      message: `Utilisateur ${action === 'unfollowed' ? 'non suivi' : 
                action === 'requested' ? 'demande envoyée' : 'suivi'}`,
      action,
      status: action === 'unfollowed' ? null : status
    });
  })
);

/**
 * @route   GET /api/users/:userId/followers
 * @desc    Obtenir la liste des followers d'un utilisateur
 * @access  Private
 */
router.get('/:userId/followers',
  requireAuth,
  validateRequest(paramValidation.userId, 'params'),
  validateRequest(userValidation.getFollowers, 'query'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    // Vérifier que l'utilisateur existe et qu'on peut voir ses followers
    const userResult = await db.query(
      `SELECT u.id, u.username, u.is_private,
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

    // Vérifier les permissions
    if (user.is_private && !isOwnProfile && !user.is_following) {
      throw new ForbiddenError('Profil privé');
    }

    // Récupérer les followers
    const followersResult = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              u.followers_count,
              CASE 
                WHEN f2.id IS NOT NULL AND f2.status = 'accepted' THEN true 
                ELSE false 
              END as is_following,
              CASE 
                WHEN f3.id IS NOT NULL AND f3.status = 'accepted' THEN true 
                ELSE false 
              END as follows_you,
              f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN follows f2 ON f2.following_id = u.id AND f2.follower_id = $1 AND f2.status = 'accepted'
       LEFT JOIN follows f3 ON f3.follower_id = u.id AND f3.following_id = $1 AND f3.status = 'accepted'
       WHERE f.following_id = $2 AND f.status = 'accepted' AND u.is_active = true
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $4`,
      [currentUserId, userId, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1 AND f.status = 'accepted' AND u.is_active = true`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      followers: followersResult.rows.map(follower => ({
        id: follower.id,
        username: follower.username,
        fullName: follower.full_name,
        avatarUrl: follower.avatar_url,
        isVerified: follower.is_verified,
        followersCount: follower.followers_count,
        isFollowing: follower.is_following,
        followsYou: follower.follows_you,
        followedAt: follower.followed_at
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

/**
 * @route   GET /api/users/:userId/following
 * @desc    Obtenir la liste des utilisateurs suivis
 * @access  Private
 */
router.get('/:userId/following',
  requireAuth,
  validateRequest(paramValidation.userId, 'params'),
  validateRequest(userValidation.getFollowing, 'query'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    // Vérifier que l'utilisateur existe et qu'on peut voir qui il suit
    const userResult = await db.query(
      `SELECT u.id, u.username, u.is_private,
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

    // Vérifier les permissions
    if (user.is_private && !isOwnProfile && !user.is_following) {
      throw new ForbiddenError('Profil privé');
    }

    // Récupérer les utilisateurs suivis
    const followingResult = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified,
              u.followers_count,
              CASE 
                WHEN f2.id IS NOT NULL AND f2.status = 'accepted' THEN true 
                ELSE false 
              END as is_following,
              CASE 
                WHEN f3.id IS NOT NULL AND f3.status = 'accepted' THEN true 
                ELSE false 
              END as follows_you,
              f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN follows f2 ON f2.following_id = u.id AND f2.follower_id = $1 AND f2.status = 'accepted'
       LEFT JOIN follows f3 ON f3.follower_id = u.id AND f3.following_id = $1 AND f3.status = 'accepted'
       WHERE f.follower_id = $2 AND f.status = 'accepted' AND u.is_active = true
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $4`,
      [currentUserId, userId, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1 AND f.status = 'accepted' AND u.is_active = true`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      following: followingResult.rows.map(following => ({
        id: following.id,
        username: following.username,
        fullName: following.full_name,
        avatarUrl: following.avatar_url,
        isVerified: following.is_verified,
        followersCount: following.followers_count,
        isFollowing: following.is_following,
        followsYou: following.follows_you,
        followedAt: following.followed_at
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