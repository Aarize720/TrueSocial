/**
 * Middleware de gestion des erreurs
 */

const { logger } = require('../utils/logger');

/**
 * Middleware pour les routes non trouvées (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Middleware de gestion globale des erreurs
 */
const errorHandler = (err, req, res, next) => {
  // Log de l'erreur avec contexte
  const errorContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query
  };

  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    ...errorContext
  });

  // Déterminer le code de statut
  let statusCode = err.status || err.statusCode || 500;
  
  // Messages d'erreur selon le type
  let message = err.message || 'Erreur serveur interne';
  let code = err.code || 'INTERNAL_ERROR';

  // Gestion des erreurs spécifiques
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Données invalides';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
    statusCode = 401;
    message = 'Token d\'authentification invalide';
    code = 'UNAUTHORIZED';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Format d\'ID invalide';
    code = 'INVALID_ID';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Cette ressource existe déjà';
    code = 'DUPLICATE_RESOURCE';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Référence invalide';
    code = 'INVALID_REFERENCE';
  } else if (err.code === '23502') { // PostgreSQL not null violation
    statusCode = 400;
    message = 'Champ requis manquant';
    code = 'MISSING_REQUIRED_FIELD';
  }

  // Réponse d'erreur
  const errorResponse = {
    error: message,
    code,
    status: statusCode,
    timestamp: new Date().toISOString()
  };

  // En développement, inclure plus de détails
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Ajouter des détails spécifiques selon le type d'erreur
  if (err.name === 'ValidationError' && err.details) {
    errorResponse.validationErrors = err.details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Wrapper pour les fonctions async afin de capturer les erreurs
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Créer une erreur personnalisée
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreurs spécifiques communes
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Ressource') {
    super(`${resource} non trouvée`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Accès non autorisé') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit de ressource') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Trop de requêtes') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Middleware de validation des données
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new ValidationError('Données invalides', details));
    }

    // Remplacer les données par les données validées et nettoyées
    req[property] = value;
    next();
  };
};

/**
 * Middleware de gestion des timeouts
 */
const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout:', {
          method: req.method,
          url: req.originalUrl,
          timeout: `${timeout}ms`
        });
        
        res.status(408).json({
          error: 'Timeout de la requête',
          code: 'REQUEST_TIMEOUT',
          timeout: `${timeout}ms`
        });
      }
    }, timeout);

    // Nettoyer le timer quand la réponse est envoyée
    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validateRequest,
  timeoutHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError
};