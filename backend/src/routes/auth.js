/**
 * Routes d'authentification
 * Inscription, connexion, OAuth, gestion des tokens
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const { db, cache } = require('../config/database');
const { requireAuth } = require('../config/passport');
const { asyncHandler, ValidationError, UnauthorizedError, ConflictError } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/errorHandler');
const { authValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Rate limiting spécifique pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: {
    error: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
    code: 'AUTH_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 inscriptions par IP par heure
  message: {
    error: 'Trop d\'inscriptions, réessayez dans 1 heure',
    code: 'REGISTER_RATE_LIMIT'
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 */
router.post('/register', 
  registerLimiter,
  validateRequest(authValidation.register),
  asyncHandler(async (req, res) => {
    const { username, email, password, fullName } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('Un utilisateur avec cet email ou nom d\'utilisateur existe déjà');
    }

    // Hasher le mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, email, full_name, avatar_url, is_verified, created_at`,
      [username, email, passwordHash, fullName]
    );

    const user = result.rows[0];

    // Générer les tokens JWT
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    // Stocker le refresh token en cache
    await cache.set(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 3600); // 30 jours

    logger.info(`Nouvel utilisateur inscrit: ${user.username} (${user.email})`);

    res.status(201).json({
      message: 'Inscription réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion utilisateur
 * @access  Public
 */
router.post('/login',
  authLimiter,
  validateRequest(authValidation.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const result = await db.query(
      `SELECT id, username, email, password_hash, full_name, avatar_url, 
              is_verified, is_active, last_active_at
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    const user = result.rows[0];

    // Vérifier si le compte est actif
    if (!user.is_active) {
      throw new UnauthorizedError('Compte désactivé');
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    // Mettre à jour la dernière activité
    await db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Générer les tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    // Stocker le refresh token
    await cache.set(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 3600);

    logger.info(`Utilisateur connecté: ${user.username}`);

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        lastActiveAt: user.last_active_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renouveler le token d'accès
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token requis');
  }

  try {
    // Vérifier le refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Token invalide');
    }

    // Vérifier que le token est en cache
    const cachedToken = await cache.get(`refresh_token:${decoded.userId}`);
    if (cachedToken !== refreshToken) {
      throw new UnauthorizedError('Refresh token invalide ou expiré');
    }

    // Récupérer les informations utilisateur
    const result = await db.query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw new UnauthorizedError('Utilisateur non trouvé ou inactif');
    }

    const user = result.rows[0];

    // Générer un nouveau token d'accès
    const newAccessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      accessToken: newAccessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token invalide ou expiré');
    }
    throw error;
  }
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion utilisateur
 * @access  Private
 */
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Supprimer le refresh token du cache
  await cache.del(`refresh_token:${userId}`);

  logger.info(`Utilisateur déconnecté: ${req.user.username}`);

  res.json({
    message: 'Déconnexion réussie'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT id, username, email, full_name, bio, avatar_url, website, phone,
            is_verified, is_private, posts_count, followers_count, following_count,
            created_at, last_active_at
     FROM users 
     WHERE id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  const user = result.rows[0];

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      website: user.website,
      phone: user.phone,
      isVerified: user.is_verified,
      isPrivate: user.is_private,
      postsCount: user.posts_count,
      followersCount: user.followers_count,
      followingCount: user.following_count,
      createdAt: user.created_at,
      lastActiveAt: user.last_active_at
    }
  });
}));

/**
 * @route   POST /api/auth/change-password
 * @desc    Changer le mot de passe
 * @access  Private
 */
router.post('/change-password',
  requireAuth,
  validateRequest(authValidation.changePassword),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Récupérer le mot de passe actuel
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Utilisateur non trouvé');
    }

    const user = result.rows[0];

    // Vérifier le mot de passe actuel
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Mot de passe actuel incorrect');
    }

    // Hasher le nouveau mot de passe
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Invalider tous les refresh tokens
    await cache.del(`refresh_token:${userId}`);

    logger.info(`Mot de passe changé pour l'utilisateur: ${req.user.username}`);

    res.json({
      message: 'Mot de passe changé avec succès'
    });
  })
);

/**
 * @route   GET /api/auth/google
 * @desc    Authentification Google OAuth
 * @access  Public
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback Google OAuth
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  asyncHandler(async (req, res) => {
    const user = req.user;

    // Générer les tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    // Stocker le refresh token
    await cache.set(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 3600);

    logger.info(`Utilisateur connecté via Google: ${user.username}`);

    // Rediriger vers le frontend avec les tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
  })
);

module.exports = router;