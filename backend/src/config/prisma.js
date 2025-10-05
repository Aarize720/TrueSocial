/**
 * Configuration Prisma Client
 * Singleton pour gérer la connexion à la base de données
 */

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

// Configuration du client Prisma
const prismaClientOptions = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
};

// Singleton pour éviter les connexions multiples en développement
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaClientOptions);
} else {
  // En développement, utiliser une variable globale pour éviter les reconnexions
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaClientOptions);
  }
  prisma = global.prisma;
}

// Logger les requêtes en développement
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Logger les erreurs
prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

// Logger les infos
prisma.$on('info', (e) => {
  logger.info('Prisma Info:', e.message);
});

// Logger les warnings
prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e.message);
});

/**
 * Connexion à la base de données
 */
async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('✅ Prisma connecté à PostgreSQL');
    
    // Test de connexion
    await prisma.$queryRaw`SELECT NOW()`;
    logger.info('✅ Test de connexion réussi');
    
    return prisma;
  } catch (error) {
    logger.error('❌ Erreur connexion Prisma:', error);
    throw error;
  }
}

/**
 * Déconnexion de la base de données
 */
async function disconnectDB() {
  try {
    await prisma.$disconnect();
    logger.info('Prisma déconnecté');
  } catch (error) {
    logger.error('Erreur déconnexion Prisma:', error);
    throw error;
  }
}

/**
 * Vérifier la santé de la connexion
 */
async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Health check failed:', error);
    return false;
  }
}

/**
 * Utilitaires pour les transactions
 */
const db = {
  /**
   * Exécuter une transaction
   */
  async transaction(callback) {
    return await prisma.$transaction(callback);
  },

  /**
   * Exécuter une requête SQL brute
   */
  async queryRaw(query, ...params) {
    return await prisma.$queryRaw(query, ...params);
  },

  /**
   * Exécuter une requête SQL brute non typée
   */
  async executeRaw(query, ...params) {
    return await prisma.$executeRaw(query, ...params);
  },

  // Accès direct aux modèles
  user: prisma.user,
  post: prisma.post,
  comment: prisma.comment,
  like: prisma.like,
  follow: prisma.follow,
  story: prisma.story,
  storyView: prisma.storyView,
  notification: prisma.notification,
  savedPost: prisma.savedPost,
  trendingHashtag: prisma.trendingHashtag,
  conversation: prisma.conversation,
  conversationMember: prisma.conversationMember,
  message: prisma.message,
};

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
  await disconnectDB();
});

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  prisma,
  db,
  connectDB,
  disconnectDB,
  healthCheck,
};