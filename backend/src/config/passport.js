/**
 * Configuration Passport.js pour l'authentification
 * JWT et OAuth (Google, Facebook)
 */

const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db } = require('./database');
const { logger } = require('../utils/logger');

/**
 * Configuration de la stratégie JWT
 */
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  algorithms: ['HS256']
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Vérifier si l'utilisateur existe et est actif
    const result = await db.query(
      'SELECT id, username, email, full_name, avatar_url, is_verified, is_active FROM users WHERE id = $1 AND is_active = true',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return done(null, false, { message: 'Utilisateur non trouvé ou inactif' });
    }

    const user = result.rows[0];
    
    // Mettre à jour la dernière activité
    await db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    return done(null, user);
  } catch (error) {
    logger.error('Erreur stratégie JWT:', error);
    return done(error, false);
  }
}));

/**
 * Configuration de la stratégie Google OAuth
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Vérifier si l'utilisateur existe déjà avec cet ID Google
      let result = await db.query(
        'SELECT * FROM users WHERE google_id = $1',
        [profile.id]
      );

      if (result.rows.length > 0) {
        // Utilisateur existant avec Google ID
        const user = result.rows[0];
        
        // Mettre à jour les informations si nécessaire
        await db.query(
          `UPDATE users SET 
           full_name = COALESCE($1, full_name),
           avatar_url = COALESCE($2, avatar_url),
           last_active_at = NOW()
           WHERE id = $3`,
          [
            profile.displayName,
            profile.photos?.[0]?.value,
            user.id
          ]
        );

        return done(null, user);
      }

      // Vérifier si un utilisateur existe avec le même email
      result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [profile.emails[0].value]
      );

      if (result.rows.length > 0) {
        // Lier le compte Google à l'utilisateur existant
        const user = result.rows[0];
        
        await db.query(
          `UPDATE users SET 
           google_id = $1,
           avatar_url = COALESCE($2, avatar_url),
           last_active_at = NOW()
           WHERE id = $3`,
          [
            profile.id,
            profile.photos?.[0]?.value,
            user.id
          ]
        );

        return done(null, user);
      }

      // Créer un nouveau utilisateur
      const username = await generateUniqueUsername(profile.displayName || profile.emails[0].value.split('@')[0]);
      
      result = await db.query(
        `INSERT INTO users (
          username, email, full_name, avatar_url, google_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *`,
        [
          username,
          profile.emails[0].value,
          profile.displayName,
          profile.photos?.[0]?.value,
          profile.id
        ]
      );

      const newUser = result.rows[0];
      logger.info(`Nouvel utilisateur créé via Google: ${newUser.username}`);
      
      return done(null, newUser);
    } catch (error) {
      logger.error('Erreur stratégie Google:', error);
      return done(error, null);
    }
  }));
}

/**
 * Générer un nom d'utilisateur unique
 */
async function generateUniqueUsername(baseName) {
  // Nettoyer le nom de base
  let username = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  if (username.length < 3) {
    username = 'user' + username;
  }

  // Vérifier l'unicité
  let counter = 0;
  let finalUsername = username;

  while (true) {
    const result = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [finalUsername]
    );

    if (result.rows.length === 0) {
      return finalUsername;
    }

    counter++;
    finalUsername = `${username}${counter}`;

    // Éviter les boucles infinies
    if (counter > 1000) {
      finalUsername = `${username}${Date.now()}`;
      break;
    }
  }

  return finalUsername;
}

/**
 * Sérialisation pour les sessions (si utilisé)
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query(
      'SELECT id, username, email, full_name, avatar_url, is_verified FROM users WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return done(null, false);
    }

    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Middleware d'authentification JWT
 */
const requireAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Erreur authentification:', err);
      return res.status(500).json({ 
        error: 'Erreur serveur lors de l\'authentification' 
      });
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Token d\'authentification invalide ou expiré',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Middleware d'authentification optionnelle
 */
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) {
      logger.error('Erreur authentification optionnelle:', err);
    }
    
    // Même si l'authentification échoue, on continue
    req.user = user || null;
    next();
  })(req, res, next);
};

/**
 * Middleware de vérification des rôles (pour futures fonctionnalités admin)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentification requise' 
      });
    }

    // Pour l'instant, tous les utilisateurs ont le même rôle
    // Cette fonction peut être étendue pour gérer des rôles admin, modérateur, etc.
    next();
  };
};

/**
 * Configuration initiale de Passport
 */
function setupPassport() {
  // Initialiser Passport (sans sessions pour une API stateless)
  return passport.initialize();
}

module.exports = {
  setupPassport,
  requireAuth,
  optionalAuth,
  requireRole,
  passport
};