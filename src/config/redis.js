const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let redisEnabled = true;
let errorLogCount = 0;
const MAX_ERROR_LOGS = 3; // Número máximo de errores a mostrar

/**
 * Connects to Redis server
 */
const connectRedis = async () => {
  try {
    // Si Redis está deshabilitado por variables de entorno, salir inmediatamente
    if (process.env.DISABLE_REDIS === 'true') {
      logger.info('Redis está deshabilitado por configuración');
      redisEnabled = false;
      return null;
    }
    
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = redis.createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            // Si falla más de 5 veces, desactivamos Redis pero seguimos con la app
            logger.warn('Redis connection failed too many times, disabling Redis functionality');
            redisEnabled = false;
            return false; // Detener intentos de reconexión
          }
          return Math.min(retries * 500, 5000); // Espera incremental entre reintentos hasta 5 segundos
        }
      }
    });

    redisClient.on('error', (err) => {
      // Limitar el número de errores que se muestran para no inundar la consola
      if (errorLogCount < MAX_ERROR_LOGS) {
        logger.error('Redis Client Error', err);
        errorLogCount++;
        
        if (errorLogCount === MAX_ERROR_LOGS) {
          logger.warn('Suppressing further Redis connection errors...');
        }
      }
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis server');
      redisEnabled = true;
      errorLogCount = 0; // Reiniciar contador de errores al conectar
    });

    // Intentar conectar pero no detener la aplicación si falla
    try {
      await redisClient.connect();
    } catch (connectError) {
      logger.error('Could not connect to Redis, continuing without Redis functionality', connectError);
      redisEnabled = false;
    }
    
    return redisClient;
  } catch (error) {
    logger.error('Error configuring Redis:', error);
    redisEnabled = false;
    return null;
  }
};

/**
 * Get Redis client instance
 * @returns {Object|null} Redis client or null if disabled
 */
const getRedisClient = () => {
  if (!redisEnabled) {
    return null;
  }
  
  if (!redisClient) {
    logger.warn('Redis client requested but not initialized');
    return null;
  }
  
  return redisClient;
};

/**
 * Comprueba si Redis está conectado
 * @returns {boolean} - Estado de la conexión
 */
const isRedisConnected = () => {
  return redisEnabled && redisClient !== null && redisClient.isReady;
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected
}; 