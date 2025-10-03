/**
 * Gestionnaire WebSocket pour les fonctionnalités temps réel
 * Notifications, likes, commentaires, messages
 */

const jwt = require('jsonwebtoken');
const { db, cache } = require('../config/database');
const { wsLogger } = require('../utils/logger');

// Map pour stocker les connexions utilisateur
const userConnections = new Map();

/**
 * Configuration du serveur WebSocket
 */
function setupWebSocket(io) {
  // Middleware d'authentification WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Token d\'authentification requis'));
      }

      // Vérifier le token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Récupérer les informations utilisateur
      const result = await db.query(
        'SELECT id, username, full_name, avatar_url, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return next(new Error('Utilisateur non trouvé ou inactif'));
      }

      socket.user = result.rows[0];
      next();
    } catch (error) {
      wsLogger.error('Erreur authentification WebSocket:', error);
      next(new Error('Token invalide'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    const user = socket.user;
    
    wsLogger.info('Nouvelle connexion WebSocket', {
      userId: user.id,
      username: user.username,
      socketId: socket.id
    });

    // Ajouter la connexion à la map
    if (!userConnections.has(user.id)) {
      userConnections.set(user.id, new Set());
    }
    userConnections.get(user.id).add(socket);

    // Rejoindre la room personnelle de l'utilisateur
    socket.join(`user:${user.id}`);

    // Mettre à jour le statut en ligne
    updateUserOnlineStatus(user.id, true);

    // Événements WebSocket
    setupSocketEvents(socket, io);

    // Gestion de la déconnexion
    socket.on('disconnect', (reason) => {
      wsLogger.info('Déconnexion WebSocket', {
        userId: user.id,
        username: user.username,
        socketId: socket.id,
        reason
      });

      // Retirer la connexion de la map
      const userSockets = userConnections.get(user.id);
      if (userSockets) {
        userSockets.delete(socket);
        if (userSockets.size === 0) {
          userConnections.delete(user.id);
          // Mettre à jour le statut hors ligne après un délai
          setTimeout(() => {
            if (!userConnections.has(user.id)) {
              updateUserOnlineStatus(user.id, false);
            }
          }, 30000); // 30 secondes de grâce
        }
      }
    });
  });

  return io;
}

/**
 * Configuration des événements WebSocket
 */
function setupSocketEvents(socket, io) {
  const user = socket.user;

  // Événement: Rejoindre une room spécifique
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    wsLogger.info(`Utilisateur ${user.username} a rejoint la room ${roomId}`);
  });

  // Événement: Quitter une room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    wsLogger.info(`Utilisateur ${user.username} a quitté la room ${roomId}`);
  });

  // Événement: Like en temps réel
  socket.on('like_post', async (data) => {
    try {
      const { postId, isLiked } = data;
      
      // Récupérer les informations du post
      const postResult = await db.query(
        'SELECT user_id FROM posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length > 0) {
        const postOwnerId = postResult.rows[0].user_id;
        
        // Notifier le propriétaire du post (si différent)
        if (postOwnerId !== user.id) {
          io.to(`user:${postOwnerId}`).emit('post_liked', {
            postId,
            isLiked,
            user: {
              id: user.id,
              username: user.username,
              fullName: user.full_name,
              avatarUrl: user.avatar_url
            },
            timestamp: new Date().toISOString()
          });
        }

        // Notifier tous les utilisateurs qui regardent ce post
        io.to(`post:${postId}`).emit('post_like_update', {
          postId,
          isLiked,
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      wsLogger.error('Erreur like_post WebSocket:', error);
      socket.emit('error', { message: 'Erreur lors du traitement du like' });
    }
  });

  // Événement: Nouveau commentaire
  socket.on('new_comment', async (data) => {
    try {
      const { postId, commentId, content, parentId } = data;
      
      // Récupérer les informations du post
      const postResult = await db.query(
        'SELECT user_id FROM posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length > 0) {
        const postOwnerId = postResult.rows[0].user_id;
        
        const commentData = {
          id: commentId,
          postId,
          parentId,
          content,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            avatarUrl: user.avatar_url
          },
          timestamp: new Date().toISOString()
        };

        // Notifier le propriétaire du post
        if (postOwnerId !== user.id) {
          io.to(`user:${postOwnerId}`).emit('new_comment', commentData);
        }

        // Notifier tous les utilisateurs qui regardent ce post
        io.to(`post:${postId}`).emit('comment_added', commentData);

        // Si c'est une réponse, notifier l'auteur du commentaire parent
        if (parentId) {
          const parentResult = await db.query(
            'SELECT user_id FROM comments WHERE id = $1',
            [parentId]
          );

          if (parentResult.rows.length > 0 && parentResult.rows[0].user_id !== user.id) {
            io.to(`user:${parentResult.rows[0].user_id}`).emit('comment_reply', commentData);
          }
        }
      }
    } catch (error) {
      wsLogger.error('Erreur new_comment WebSocket:', error);
      socket.emit('error', { message: 'Erreur lors du traitement du commentaire' });
    }
  });

  // Événement: Nouveau follower
  socket.on('new_follow', async (data) => {
    try {
      const { followedUserId, status } = data;
      
      const followData = {
        follower: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          avatarUrl: user.avatar_url
        },
        status, // 'accepted' ou 'pending'
        timestamp: new Date().toISOString()
      };

      // Notifier l'utilisateur suivi
      io.to(`user:${followedUserId}`).emit('new_follower', followData);
    } catch (error) {
      wsLogger.error('Erreur new_follow WebSocket:', error);
      socket.emit('error', { message: 'Erreur lors du traitement du follow' });
    }
  });

  // Événement: Story vue
  socket.on('story_viewed', async (data) => {
    try {
      const { storyId, storyOwnerId } = data;
      
      const viewData = {
        storyId,
        viewer: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          avatarUrl: user.avatar_url
        },
        timestamp: new Date().toISOString()
      };

      // Notifier le propriétaire de la story
      if (storyOwnerId !== user.id) {
        io.to(`user:${storyOwnerId}`).emit('story_view', viewData);
      }
    } catch (error) {
      wsLogger.error('Erreur story_viewed WebSocket:', error);
      socket.emit('error', { message: 'Erreur lors du traitement de la vue de story' });
    }
  });

  // Événement: Typing indicator (pour les messages futurs)
  socket.on('typing_start', (data) => {
    const { conversationId } = data;
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('typing_stop', (data) => {
    const { conversationId } = data;
    socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
  });

  // Événement: Demande de statut en ligne
  socket.on('get_online_status', async (data) => {
    try {
      const { userIds } = data;
      const onlineStatus = {};
      
      for (const userId of userIds) {
        onlineStatus[userId] = userConnections.has(userId);
      }
      
      socket.emit('online_status', onlineStatus);
    } catch (error) {
      wsLogger.error('Erreur get_online_status WebSocket:', error);
    }
  });

  // Événement: Heartbeat pour maintenir la connexion
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
}

/**
 * Mettre à jour le statut en ligne d'un utilisateur
 */
async function updateUserOnlineStatus(userId, isOnline) {
  try {
    await db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [userId]
    );

    // Mettre en cache le statut en ligne
    await cache.set(`user_online:${userId}`, isOnline, 300); // 5 minutes
    
    wsLogger.info(`Statut utilisateur mis à jour: ${userId} - ${isOnline ? 'en ligne' : 'hors ligne'}`);
  } catch (error) {
    wsLogger.error('Erreur mise à jour statut en ligne:', error);
  }
}

/**
 * Envoyer une notification en temps réel
 */
async function sendRealtimeNotification(userId, notification) {
  try {
    const userSockets = userConnections.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach(socket => {
        socket.emit('notification', notification);
      });
      
      wsLogger.info(`Notification temps réel envoyée à ${userId}`, {
        type: notification.type,
        title: notification.title
      });
    }
  } catch (error) {
    wsLogger.error('Erreur envoi notification temps réel:', error);
  }
}

/**
 * Diffuser un événement à tous les utilisateurs connectés
 */
function broadcastToAll(event, data) {
  try {
    userConnections.forEach((sockets, userId) => {
      sockets.forEach(socket => {
        socket.emit(event, data);
      });
    });
    
    wsLogger.info(`Événement diffusé à tous: ${event}`);
  } catch (error) {
    wsLogger.error('Erreur diffusion globale:', error);
  }
}

/**
 * Obtenir le nombre d'utilisateurs connectés
 */
function getConnectedUsersCount() {
  return userConnections.size;
}

/**
 * Obtenir la liste des utilisateurs connectés
 */
function getConnectedUsers() {
  return Array.from(userConnections.keys());
}

/**
 * Vérifier si un utilisateur est connecté
 */
function isUserConnected(userId) {
  return userConnections.has(userId);
}

/**
 * Envoyer un message à un utilisateur spécifique
 */
function sendToUser(userId, event, data) {
  try {
    const userSockets = userConnections.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach(socket => {
        socket.emit(event, data);
      });
      return true;
    }
    return false;
  } catch (error) {
    wsLogger.error('Erreur envoi message utilisateur:', error);
    return false;
  }
}

module.exports = {
  setupWebSocket,
  sendRealtimeNotification,
  broadcastToAll,
  getConnectedUsersCount,
  getConnectedUsers,
  isUserConnected,
  sendToUser
};