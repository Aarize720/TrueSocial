/**
 * Configuration des connexions base de données
 * PostgreSQL et Redis
 */

const { Pool } = require('pg');
const { createClient } = require('redis');
const { logger } = require('../utils/logger');

// Configuration PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Nombre maximum de connexions dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Pool de connexions PostgreSQL
const pool = new Pool(dbConfig);

// Client Redis
let redisClient = null;

/**
 * Connexion à PostgreSQL
 */
async function connectDB() {
  try {
    // Test de connexion
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info(`PostgreSQL connecté: ${result.rows[0].now}`);
    return pool;
  } catch (error) {
    logger.error('Erreur connexion PostgreSQL:', error);
    throw error;
  }
}

/**
 * Connexion à Redis
 */
async function connectRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server refuse la connexion');
          return new Error('Redis server refuse la connexion');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Timeout de retry Redis atteint');
          return new Error('Timeout de retry Redis atteint');
        }
        if (options.attempt > 10) {
          logger.error('Nombre maximum de tentatives Redis atteint');
          return undefined;
        }
        // Reconnexion après délai
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Erreur Redis:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecté');
    });

    redisClient.on('ready', () => {
      logger.info('Redis prêt');
    });

    redisClient.on('end', () => {
      logger.info('Redis connexion fermée');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Erreur connexion Redis:', error);
    throw error;
  }
}

/**
 * Fermeture des connexions
 */
async function closeDB() {
  try {
    await pool.end();
    logger.info('Pool PostgreSQL fermé');
  } catch (error) {
    logger.error('Erreur fermeture PostgreSQL:', error);
  }
}

async function closeRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Client Redis fermé');
    }
  } catch (error) {
    logger.error('Erreur fermeture Redis:', error);
  }
}

/**
 * Utilitaires pour les requêtes
 */
const db = {
  /**
   * Exécuter une requête SQL
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Requête exécutée en ${duration}ms:`, { text, params });
      }
      
      return result;
    } catch (error) {
      logger.error('Erreur requête SQL:', { text, params, error: error.message });
      throw error;
    }
  },

  /**
   * Exécuter une transaction
   */
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Obtenir un client pour des opérations complexes
   */
  async getClient() {
    return await pool.connect();
  }
};

/**
 * Utilitaires Redis
 */
const cache = {
  /**
   * Obtenir une valeur du cache
   */
  async get(key) {
    try {
      if (!redisClient) return null;
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Erreur cache get:', error);
      return null;
    }
  },

  /**
   * Définir une valeur dans le cache
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!redisClient) return false;
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Erreur cache set:', error);
      return false;
    }
  },

  /**
   * Supprimer une clé du cache
   */
  async del(key) {
    try {
      if (!redisClient) return false;
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Erreur cache del:', error);
      return false;
    }
  },

  /**
   * Supprimer plusieurs clés par pattern
   */
  async delPattern(pattern) {
    try {
      if (!redisClient) return false;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Erreur cache delPattern:', error);
      return false;
    }
  },

  /**
   * Incrémenter une valeur
   */
  async incr(key, ttl = 3600) {
    try {
      if (!redisClient) return 0;
      const value = await redisClient.incr(key);
      if (value === 1) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error('Erreur cache incr:', error);
      return 0;
    }
  },

  /**
   * Ajouter à une liste
   */
  async lpush(key, value, ttl = 3600) {
    try {
      if (!redisClient) return false;
      await redisClient.lPush(key, JSON.stringify(value));
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Erreur cache lpush:', error);
      return false;
    }
  },

  /**
   * Obtenir une liste
   */
  async lrange(key, start = 0, end = -1) {
    try {
      if (!redisClient) return [];
      const values = await redisClient.lRange(key, start, end);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error('Erreur cache lrange:', error);
      return [];
    }
  },

  /**
   * Ajouter à un set
   */
  async sadd(key, value, ttl = 3600) {
    try {
      if (!redisClient) return false;
      await redisClient.sAdd(key, JSON.stringify(value));
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Erreur cache sadd:', error);
      return false;
    }
  },

  /**
   * Obtenir les membres d'un set
   */
  async smembers(key) {
    try {
      if (!redisClient) return [];
      const values = await redisClient.sMembers(key);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error('Erreur cache smembers:', error);
      return [];
    }
  }
};

module.exports = {
  pool,
  db,
  cache,
  redisClient: () => redisClient,
  connectDB,
  connectRedis,
  closeDB,
  closeRedis
};