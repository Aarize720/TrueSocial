/**
 * TrueSocial Backend Server
 * Point d'entrée principal de l'API
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

// Import des modules internes
const { connectDB: connectLegacyDB, connectRedis } = require('./config/database');
const { prisma, connectDB: connectPrisma, disconnectDB: disconnectPrisma } = require('./config/prisma');
const { setupPassport } = require('./config/passport');
const { logger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { setupWebSocket } = require('./websocket/socketHandler');

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const storyRoutes = require('./routes/stories');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);

// Configuration CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Configuration Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.WS_CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Middlewares globaux
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate limiting global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Configuration Passport
setupPassport();

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'TrueSocial API',
    version: '1.0.0',
    documentation: '/api/docs',
    status: 'running'
  });
});

// Middleware de gestion des erreurs
app.use(notFoundHandler);
app.use(errorHandler);

// Configuration WebSocket
setupWebSocket(io);

// Fonction de démarrage du serveur
async function startServer() {
  try {
    logger.info('🚀 Démarrage du serveur TrueSocial...');

    // Connexion à Prisma (prioritaire)
    try {
      await connectPrisma();
      logger.info('✅ Connexion Prisma établie');
    } catch (error) {
      logger.error('❌ Erreur connexion Prisma:', error.message);
      logger.warn('⚠️  Tentative de connexion avec l\'ancien système PostgreSQL...');
      
      try {
        await connectLegacyDB();
        logger.info('✅ Connexion PostgreSQL (legacy) établie');
      } catch (legacyError) {
        logger.error('❌ Impossible de se connecter à la base de données');
        logger.error('💡 Assurez-vous que PostgreSQL est installé et que la base de données existe');
        logger.error('💡 Exécutez: psql -U postgres -f setup-database.sql');
        throw legacyError;
      }
    }

    // Connexion à Redis (optionnelle)
    try {
      await connectRedis();
      logger.info('✅ Connexion Redis établie');
    } catch (error) {
      logger.warn('⚠️  Redis non disponible, certaines fonctionnalités seront limitées');
      logger.warn('💡 Pour installer Redis: https://redis.io/download');
    }

    // Démarrage du serveur
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info('');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`🎉 Serveur TrueSocial démarré avec succès!`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 API: http://localhost:${PORT}/api`);
      logger.info(`🏥 Health: http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
      logger.info(`📊 Prisma Studio: npm run prisma:studio`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('');
    });

    // Gestion gracieuse de l'arrêt
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('');
    logger.error('═══════════════════════════════════════════════════════');
    logger.error('❌ ERREUR FATALE - Impossible de démarrer le serveur');
    logger.error('═══════════════════════════════════════════════════════');
    logger.error(error);
    logger.error('');
    logger.error('📋 CHECKLIST DE DÉPANNAGE:');
    logger.error('  1. PostgreSQL est-il installé? → psql --version');
    logger.error('  2. La base de données existe-t-elle? → psql -U postgres -f setup-database.sql');
    logger.error('  3. Le fichier .env est-il configuré? → DATABASE_URL=...');
    logger.error('  4. Prisma est-il généré? → npm run prisma:generate');
    logger.error('  5. Les migrations sont-elles appliquées? → npm run prisma:migrate');
    logger.error('');
    process.exit(1);
  }
}

// Fonction d'arrêt gracieux
async function gracefulShutdown(signal) {
  logger.info(`📴 Signal ${signal} reçu, arrêt du serveur...`);
  
  server.close(async () => {
    logger.info('🔌 Serveur HTTP fermé');
    
    try {
      // Fermer Prisma
      await disconnectPrisma();
      logger.info('💾 Prisma déconnecté');
      
      // Fermer les connexions legacy
      const { closeDB, closeRedis } = require('./config/database');
      await closeDB();
      await closeRedis();
      logger.info('💾 Connexions legacy fermées');
      
      process.exit(0);
    } catch (error) {
      logger.error('❌ Erreur lors de la fermeture:', error);
      process.exit(1);
    }
  });

  // Force l'arrêt après 10 secondes
  setTimeout(() => {
    logger.error('⏰ Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Démarrer le serveur
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };