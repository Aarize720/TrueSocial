/**
 * Routes pour la gestion des commentaires
 * Création, lecture, mise à jour, suppression, likes
 */

const express = require('express');
const { db, cache } = require('../config/database');
const { requireAuth } = require('../config/passport');
const { asyncHandler, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { commentValidation, paramValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/comments
 * @desc    Créer un nouveau commentaire
 * @access  Private
 */
router.post('/',
  requireAuth,
  validateRequest(commentValidation.createComment),
  asyncHandler(async (req, res) => {
    const { postId, content, parentId } = req.body;
    const userId = req.user.id;

    // Vérifier que le post existe
    const postResult = await db.query(
      `SELECT p.id, p.user_id, u.username, u.is_private,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $2
       WHERE p.id = $1 AND p.is_archived = false AND p.is_hidden = false`,
      [postId, userId]
    );

    if (postResult.rows.length === 0) {
      throw new NotFoundError('Post non trouvé');
    }

    const post = postResult.rows[0];
    const isOwnPost = userId === post.user_id;

    // Vérifier les permissions pour les comptes privés
    if (post.is_private && !isOwnPost && !post.is_following) {
      throw new ForbiddenError('Vous ne pouvez pas commenter ce post');
    }

    // Si c'est une réponse, vérifier que le commentaire parent existe
    if (parentId) {
      const parentResult = await db.query(
        'SELECT id, user_id FROM comments WHERE id = $1 AND post_id = $2',
        [parentId, postId]
      );

      if (parentResult.rows.length === 0) {
        throw new NotFoundError('Commentaire parent non trouvé');
      }
    }

    // Créer le commentaire
    const result = await db.query(
      `INSERT INTO comments (user_id, post_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, postId, parentId, content]
    );

    const comment = result.rows[0];

    // Créer une notification pour le propriétaire du post (si différent)
    if (post.user_id !== userId) {
      await db.query(
        `INSERT INTO notifications (recipient_id, sender_id, type, post_id, comment_id, title, message)
         VALUES ($1, $2, 'comment', $3, $4, 'Nouveau commentaire', $5)`,
        [
          post.user_id,
          userId,
          postId,
          comment.id,
          `${req.user.username} a commenté votre post`
        ]
      );
    }

    // Si c'est une réponse, notifier l'auteur du commentaire parent
    if (parentId) {
      const parentComment = await db.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [parentId]
      );

      if (parentComment.rows.length > 0 && parentComment.rows[0].user_id !== userId) {
        await db.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, post_id, comment_id, title, message)
           VALUES ($1, $2, 'comment', $3, $4, 'Réponse à votre commentaire', $5)`,
          [
            parentComment.rows[0].user_id,
            userId,
            postId,
            comment.id,
            `${req.user.username} a répondu à votre commentaire`
          ]
        );
      }
    }

    // Invalider les caches
    await cache.delPattern(`post_comments:${postId}*`);
    await cache.del(`post:${postId}`);

    logger.info(`Nouveau commentaire par ${req.user.username} sur le post ${postId}`);

    res.status(201).json({
      message: 'Commentaire créé avec succès',
      comment: {
        id: comment.id,
        userId,
        postId,
        parentId,
        content,
        likesCount: 0,
        repliesCount: 0,
        createdAt: comment.created_at,
        user: {
          id: userId,
          username: req.user.username,
          fullName: req.user.full_name,
          avatarUrl: req.user.avatar_url,
          isVerified: req.user.is_verified
        }
      }
    });
  })
);

/**
 * @route   GET /api/comments/post/:postId
 * @desc    Obtenir les commentaires d'un post
 * @access  Private
 */
router.get('/post/:postId',
  requireAuth,
  validateRequest(paramValidation.postId, 'params'),
  validateRequest(commentValidation.getComments, 'query'),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 20, parentId } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Vérifier que le post existe et qu'on peut le voir
    const postResult = await db.query(
      `SELECT p.id, p.user_id, u.is_private,
              CASE 
                WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true 
                ELSE false 
              END as is_following
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $2
       WHERE p.id = $1 AND p.is_archived = false AND p.is_hidden = false`,
      [postId, userId]
    );

    if (postResult.rows.length === 0) {
      throw new NotFoundError('Post non trouvé');
    }

    const post = postResult.rows[0];
    const isOwnPost = userId === post.user_id;

    // Vérifier les permissions
    if (post.is_private && !isOwnPost && !post.is_following) {
      throw new ForbiddenError('Vous ne pouvez pas voir les commentaires de ce post');
    }

    // Construire la requête selon si on veut les commentaires principaux ou les réponses
    let whereClause = 'c.post_id = $1 AND c.is_hidden = false AND u.is_active = true';
    let params = [postId];

    if (parentId) {
      whereClause += ' AND c.parent_id = $2';
      params.push(parentId);
    } else {
      whereClause += ' AND c.parent_id IS NULL';
    }

    params.push(userId, limit, offset);

    const result = await db.query(
      `SELECT c.id, c.user_id, c.post_id, c.parent_id, c.content, c.likes_count,
              c.replies_count, c.created_at, c.updated_at,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE WHEN cl.id IS NOT NULL THEN true ELSE false END as is_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON cl.comment_id = c.id AND cl.user_id = $3
       WHERE ${whereClause}
       ORDER BY c.created_at ASC
       LIMIT $4 OFFSET $5`,
      params
    );

    // Compter le total
    const countParams = parentId ? [postId, parentId] : [postId];
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.is_hidden = false AND u.is_active = true
         ${parentId ? 'AND c.parent_id = $2' : 'AND c.parent_id IS NULL'}`,
      countParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Formater les commentaires
    const comments = result.rows.map(comment => ({
      id: comment.id,
      userId: comment.user_id,
      postId: comment.post_id,
      parentId: comment.parent_id,
      content: comment.content,
      likesCount: comment.likes_count,
      repliesCount: comment.replies_count,
      isLiked: comment.is_liked,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: {
        id: comment.user_id,
        username: comment.username,
        fullName: comment.full_name,
        avatarUrl: comment.avatar_url,
        isVerified: comment.is_verified
      }
    }));

    res.json({
      comments,
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
 * @route   PUT /api/comments/:commentId
 * @desc    Modifier un commentaire
 * @access  Private
 */
router.put('/:commentId',
  requireAuth,
  validateRequest(paramValidation.commentId, 'params'),
  validateRequest(commentValidation.updateComment),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Vérifier que le commentaire existe et appartient à l'utilisateur
    const commentResult = await db.query(
      'SELECT id, user_id, post_id FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentResult.rows.length === 0) {
      throw new NotFoundError('Commentaire non trouvé ou non autorisé');
    }

    const comment = commentResult.rows[0];

    // Mettre à jour le commentaire
    await db.query(
      'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2',
      [content, commentId]
    );

    // Invalider les caches
    await cache.delPattern(`post_comments:${comment.post_id}*`);

    logger.info(`Commentaire modifié par ${req.user.username}: ${commentId}`);

    res.json({
      message: 'Commentaire modifié avec succès'
    });
  })
);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Supprimer un commentaire
 * @access  Private
 */
router.delete('/:commentId',
  requireAuth,
  validateRequest(paramValidation.commentId, 'params'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Vérifier que le commentaire existe et appartient à l'utilisateur
    const commentResult = await db.query(
      'SELECT id, user_id, post_id FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentResult.rows.length === 0) {
      throw new NotFoundError('Commentaire non trouvé ou non autorisé');
    }

    const comment = commentResult.rows[0];

    // Supprimer le commentaire (cascade supprimera les réponses et likes)
    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);

    // Invalider les caches
    await cache.delPattern(`post_comments:${comment.post_id}*`);
    await cache.del(`post:${comment.post_id}`);

    logger.info(`Commentaire supprimé par ${req.user.username}: ${commentId}`);

    res.json({
      message: 'Commentaire supprimé avec succès'
    });
  })
);

/**
 * @route   POST /api/comments/:commentId/like
 * @desc    Liker/unliker un commentaire
 * @access  Private
 */
router.post('/:commentId/like',
  requireAuth,
  validateRequest(paramValidation.commentId, 'params'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Vérifier que le commentaire existe
    const commentResult = await db.query(
      `SELECT c.id, c.user_id, c.post_id, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.is_hidden = false AND u.is_active = true`,
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      throw new NotFoundError('Commentaire non trouvé');
    }

    const comment = commentResult.rows[0];

    // Vérifier si l'utilisateur a déjà liké
    const existingLike = await db.query(
      'SELECT id FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
      [userId, commentId]
    );

    let action = '';

    if (existingLike.rows.length > 0) {
      // Unlike
      await db.query(
        'DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
        [userId, commentId]
      );
      action = 'unliked';
    } else {
      // Like
      await db.query(
        'INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)',
        [userId, commentId]
      );
      action = 'liked';

      // Créer une notification si ce n'est pas son propre commentaire
      if (comment.user_id !== userId) {
        await db.query(
          `INSERT INTO notifications (recipient_id, sender_id, type, comment_id, title, message)
           VALUES ($1, $2, 'like', $3, 'Like sur commentaire', $4)`,
          [
            comment.user_id,
            userId,
            commentId,
            `${req.user.username} a aimé votre commentaire`
          ]
        );
      }
    }

    // Invalider les caches
    await cache.delPattern(`post_comments:${comment.post_id}*`);

    res.json({
      message: `Commentaire ${action === 'liked' ? 'liké' : 'unliké'}`,
      action,
      isLiked: action === 'liked'
    });
  })
);

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Obtenir les réponses d'un commentaire
 * @access  Private
 */
router.get('/:commentId/replies',
  requireAuth,
  validateRequest(paramValidation.commentId, 'params'),
  validateRequest(commentValidation.getComments, 'query'),
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Vérifier que le commentaire parent existe
    const parentResult = await db.query(
      'SELECT id, post_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (parentResult.rows.length === 0) {
      throw new NotFoundError('Commentaire non trouvé');
    }

    const parentComment = parentResult.rows[0];

    // Récupérer les réponses
    const result = await db.query(
      `SELECT c.id, c.user_id, c.post_id, c.parent_id, c.content, c.likes_count,
              c.replies_count, c.created_at, c.updated_at,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              CASE WHEN cl.id IS NOT NULL THEN true ELSE false END as is_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON cl.comment_id = c.id AND cl.user_id = $1
       WHERE c.parent_id = $2 AND c.is_hidden = false AND u.is_active = true
       ORDER BY c.created_at ASC
       LIMIT $3 OFFSET $4`,
      [userId, commentId, limit, offset]
    );

    // Compter le total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.parent_id = $1 AND c.is_hidden = false AND u.is_active = true`,
      [commentId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const replies = result.rows.map(reply => ({
      id: reply.id,
      userId: reply.user_id,
      postId: reply.post_id,
      parentId: reply.parent_id,
      content: reply.content,
      likesCount: reply.likes_count,
      repliesCount: reply.replies_count,
      isLiked: reply.is_liked,
      createdAt: reply.created_at,
      updatedAt: reply.updated_at,
      user: {
        id: reply.user_id,
        username: reply.username,
        fullName: reply.full_name,
        avatarUrl: reply.avatar_url,
        isVerified: reply.is_verified
      }
    }));

    res.json({
      replies,
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