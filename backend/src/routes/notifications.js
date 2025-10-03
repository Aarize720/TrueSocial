/**
 * Routes pour la gestion des notifications
 * Lecture, marquage comme lu, suppression
 */

const express = require('express');
const { db, cache } = require('../config/database');
const { requireAuth } = require('../config/passport');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { notificationValidation, paramValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Obtenir les notifications de l'utilisateur
 * @access  Private
 */
router.get('/',
  requireAuth,
  validateRequest(notificationValidation.getNotifications, 'query'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Construire la requête avec filtre optionnel pour les non lues
    let whereClause = 'n.recipient_id = $1';
    let params = [userId];

    if (unreadOnly === 'true' || unreadOnly === true) {
      whereClause += ' AND n.is_read = false';
    }

    params.push(limit, offset);

    // Récupérer les notifications avec les détails des entités liées
    const result = await db.query(
      `SELECT n.id, n.type, n.title, n.message, n.data, n.is_read, n.created_at,
              -- Informations de l'expéditeur
              sender.id as sender_id, sender.username as sender_username,
              sender.full_name as sender_full_name, sender.avatar_url as sender_avatar_url,
              sender.is_verified as sender_is_verified,
              -- Informations du post lié
              p.id as post_id, p.media_urls as post_media_urls, p.media_type as post_media_type,
              -- Informations du commentaire lié
              c.id as comment_id, c.content as comment_content,
              -- Informations de la story liée
              s.id as story_id, s.media_url as story_media_url
       FROM notifications n
       LEFT JOIN users sender ON n.sender_id = sender.id
       LEFT JOIN posts p ON n.post_id = p.id
       LEFT JOIN comments c ON n.comment_id = c.id
       LEFT JOIN stories s ON n.story_id = s.id
       WHERE ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    // Compter le total
    const countParams = unreadOnly === 'true' || unreadOnly === true ? [userId] : [userId];
    const countWhereClause = unreadOnly === 'true' || unreadOnly === true ? 
      'recipient_id = $1 AND is_read = false' : 'recipient_id = $1';

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM notifications WHERE ${countWhereClause}`,
      countParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Formater les notifications
    const notifications = result.rows.map(notification => {
      const formatted = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        sender: notification.sender_id ? {
          id: notification.sender_id,
          username: notification.sender_username,
          fullName: notification.sender_full_name,
          avatarUrl: notification.sender_avatar_url,
          isVerified: notification.sender_is_verified
        } : null
      };

      // Ajouter les détails selon le type de notification
      if (notification.post_id) {
        formatted.post = {
          id: notification.post_id,
          mediaUrls: notification.post_media_urls,
          mediaType: notification.post_media_type
        };
      }

      if (notification.comment_id) {
        formatted.comment = {
          id: notification.comment_id,
          content: notification.comment_content
        };
      }

      if (notification.story_id) {
        formatted.story = {
          id: notification.story_id,
          mediaUrl: notification.story_media_url
        };
      }

      return formatted;
    });

    res.json({
      notifications,
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
 * @route   GET /api/notifications/unread-count
 * @desc    Obtenir le nombre de notifications non lues
 * @access  Private
 */
router.get('/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Clé de cache pour le compteur
    const cacheKey = `unread_notifications:${userId}`;
    
    // Essayer de récupérer depuis le cache
    let unreadCount = await cache.get(cacheKey);
    
    if (unreadCount === null) {
      // Compter les notifications non lues
      const result = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND is_read = false',
        [userId]
      );
      
      unreadCount = parseInt(result.rows[0].count);
      
      // Mettre en cache pour 1 minute
      await cache.set(cacheKey, unreadCount, 60);
    }

    res.json({
      unreadCount
    });
  })
);

/**
 * @route   PUT /api/notifications/mark-read
 * @desc    Marquer des notifications comme lues
 * @access  Private
 */
router.put('/mark-read',
  requireAuth,
  validateRequest(notificationValidation.markAsRead),
  asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    // Vérifier que toutes les notifications appartiennent à l'utilisateur
    const verifyResult = await db.query(
      'SELECT id FROM notifications WHERE id = ANY($1) AND recipient_id = $2',
      [notificationIds, userId]
    );

    if (verifyResult.rows.length !== notificationIds.length) {
      throw new NotFoundError('Certaines notifications n\'ont pas été trouvées');
    }

    // Marquer comme lues
    const result = await db.query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW() 
       WHERE id = ANY($1) AND recipient_id = $2 AND is_read = false
       RETURNING id`,
      [notificationIds, userId]
    );

    const updatedCount = result.rows.length;

    // Invalider le cache du compteur
    await cache.del(`unread_notifications:${userId}`);

    logger.info(`${updatedCount} notifications marquées comme lues pour ${req.user.username}`);

    res.json({
      message: `${updatedCount} notifications marquées comme lues`,
      updatedCount
    });
  })
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Marquer toutes les notifications comme lues
 * @access  Private
 */
router.put('/mark-all-read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Marquer toutes les notifications non lues comme lues
    const result = await db.query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW() 
       WHERE recipient_id = $1 AND is_read = false
       RETURNING id`,
      [userId]
    );

    const updatedCount = result.rows.length;

    // Invalider le cache du compteur
    await cache.del(`unread_notifications:${userId}`);

    logger.info(`Toutes les notifications (${updatedCount}) marquées comme lues pour ${req.user.username}`);

    res.json({
      message: `${updatedCount} notifications marquées comme lues`,
      updatedCount
    });
  })
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Supprimer une notification
 * @access  Private
 */
router.delete('/:notificationId',
  requireAuth,
  validateRequest(paramValidation.notificationId, 'params'),
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Vérifier que la notification existe et appartient à l'utilisateur
    const result = await db.query(
      'DELETE FROM notifications WHERE id = $1 AND recipient_id = $2 RETURNING id',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification non trouvée');
    }

    // Invalider le cache du compteur
    await cache.del(`unread_notifications:${userId}`);

    logger.info(`Notification supprimée par ${req.user.username}: ${notificationId}`);

    res.json({
      message: 'Notification supprimée avec succès'
    });
  })
);

/**
 * @route   DELETE /api/notifications
 * @desc    Supprimer toutes les notifications lues
 * @access  Private
 */
router.delete('/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Supprimer toutes les notifications lues
    const result = await db.query(
      'DELETE FROM notifications WHERE recipient_id = $1 AND is_read = true RETURNING id',
      [userId]
    );

    const deletedCount = result.rows.length;

    logger.info(`${deletedCount} notifications lues supprimées pour ${req.user.username}`);

    res.json({
      message: `${deletedCount} notifications supprimées`,
      deletedCount
    });
  })
);

/**
 * @route   GET /api/notifications/settings
 * @desc    Obtenir les paramètres de notification (à implémenter)
 * @access  Private
 */
router.get('/settings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Pour l'instant, retourner des paramètres par défaut
    // Dans une version future, ces paramètres pourraient être stockés en base
    const defaultSettings = {
      likes: true,
      comments: true,
      follows: true,
      mentions: true,
      stories: true,
      emailNotifications: false,
      pushNotifications: true
    };

    res.json({
      settings: defaultSettings
    });
  })
);

/**
 * @route   PUT /api/notifications/settings
 * @desc    Mettre à jour les paramètres de notification (à implémenter)
 * @access  Private
 */
router.put('/settings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settings = req.body;

    // Pour l'instant, juste retourner les paramètres reçus
    // Dans une version future, les sauvegarder en base de données
    
    logger.info(`Paramètres de notification mis à jour pour ${req.user.username}`);

    res.json({
      message: 'Paramètres mis à jour avec succès',
      settings
    });
  })
);

/**
 * Fonction utilitaire pour créer une notification
 * (utilisée par d'autres modules)
 */
async function createNotification({
  recipientId,
  senderId,
  type,
  title,
  message,
  postId = null,
  commentId = null,
  storyId = null,
  data = null
}) {
  try {
    const result = await db.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, title, message, post_id, comment_id, story_id, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [recipientId, senderId, type, title, message, postId, commentId, storyId, data]
    );

    // Invalider le cache du compteur de notifications non lues
    await cache.del(`unread_notifications:${recipientId}`);

    return result.rows[0];
  } catch (error) {
    logger.error('Erreur lors de la création de notification:', error);
    throw error;
  }
}

/**
 * Fonction utilitaire pour créer des notifications en lot
 */
async function createBulkNotifications(notifications) {
  try {
    const values = [];
    const placeholders = [];
    let paramCount = 1;

    notifications.forEach((notif, index) => {
      const placeholder = `($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, $${paramCount + 6}, $${paramCount + 7}, $${paramCount + 8})`;
      placeholders.push(placeholder);
      
      values.push(
        notif.recipientId,
        notif.senderId,
        notif.type,
        notif.title,
        notif.message,
        notif.postId || null,
        notif.commentId || null,
        notif.storyId || null,
        notif.data || null
      );
      
      paramCount += 9;
    });

    if (placeholders.length === 0) return [];

    const result = await db.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, title, message, post_id, comment_id, story_id, data)
       VALUES ${placeholders.join(', ')}
       RETURNING id, recipient_id, created_at`,
      values
    );

    // Invalider les caches des compteurs pour tous les destinataires
    const recipientIds = [...new Set(notifications.map(n => n.recipientId))];
    const cachePromises = recipientIds.map(id => cache.del(`unread_notifications:${id}`));
    await Promise.all(cachePromises);

    return result.rows;
  } catch (error) {
    logger.error('Erreur lors de la création de notifications en lot:', error);
    throw error;
  }
}

// Exporter les fonctions utilitaires
module.exports = router;
module.exports.createNotification = createNotification;
module.exports.createBulkNotifications = createBulkNotifications;