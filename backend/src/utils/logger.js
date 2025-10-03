/**
 * Configuration du système de logging avec Winston
 */

const winston = require('winston');
const path = require('path');

// Créer le répertoire de logs s'il n'existe pas
const fs = require('fs');
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuration des formats de log
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// Configuration des transports
const transports = [];

// Console (toujours actif en développement)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

// Fichier pour tous les logs
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    format: logFormat,
    level: process.env.LOG_LEVEL || 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  })
);

// Fichier séparé pour les erreurs
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    format: logFormat,
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  })
);

// Créer le logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'truesocial-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  // Ne pas quitter sur les erreurs non gérées
  exitOnError: false
});

// Logger spécialisé pour les requêtes HTTP
const httpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'truesocial-http'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      maxsize: 5242880,
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Logger pour les WebSockets
const wsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'truesocial-websocket'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'websocket.log'),
      maxsize: 5242880,
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Logger pour la base de données
const dbLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'truesocial-database'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'database.log'),
      maxsize: 5242880,
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Fonctions utilitaires pour le logging
const loggers = {
  /**
   * Logger principal de l'application
   */
  logger,

  /**
   * Logger pour les requêtes HTTP
   */
  httpLogger,

  /**
   * Logger pour les WebSockets
   */
  wsLogger,

  /**
   * Logger pour la base de données
   */
  dbLogger,

  /**
   * Log d'une requête HTTP
   */
  logRequest: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || null,
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      httpLogger.error('HTTP Error', logData);
    } else {
      httpLogger.info('HTTP Request', logData);
    }
  },

  /**
   * Log d'une connexion WebSocket
   */
  logWebSocket: (event, data = {}) => {
    wsLogger.info(`WebSocket ${event}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log d'une requête base de données
   */
  logDatabase: (query, params, duration, error = null) => {
    const logData = {
      query: query.substring(0, 200), // Limiter la taille
      params: params ? JSON.stringify(params).substring(0, 100) : null,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    if (error) {
      dbLogger.error('Database Error', { ...logData, error: error.message });
    } else if (duration > 1000) {
      dbLogger.warn('Slow Query', logData);
    } else {
      dbLogger.info('Database Query', logData);
    }
  },

  /**
   * Log d'une erreur avec contexte
   */
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log d'un événement de sécurité
   */
  logSecurity: (event, details = {}) => {
    logger.warn(`Security Event: ${event}`, {
      ...details,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Log de performance
   */
  logPerformance: (operation, duration, details = {}) => {
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString()
    };

    if (duration > 5000) {
      logger.warn('Performance Issue', logData);
    } else {
      logger.info('Performance Metric', logData);
    }
  }
};

// En production, ajouter des transports supplémentaires si nécessaire
if (process.env.NODE_ENV === 'production') {
  // Exemple: intégration avec des services externes comme Sentry, LogDNA, etc.
  
  // Console en production pour Docker logs
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    level: 'info'
  }));
}

module.exports = loggers;