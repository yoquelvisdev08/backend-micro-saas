/**
 * token.middleware.js
 * Middleware para gestionar tokens JWT con Redis
 */
const { getRedisClient, isRedisConnected } = require('../config/redis');
const jwt = require('jsonwebtoken');

/**
 * Almacena un token JWT en Redis
 * @param {string} token - Token JWT
 * @param {Object} userData - Datos del usuario a almacenar
 * @param {number} expiryTime - Tiempo de expiración en segundos
 */
exports.storeToken = async (token, userData, expiryTime = 3600) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient || !isRedisConnected()) {
      console.log('Redis no disponible para almacenar token, continuando sin caché');
      return false;
    }
    
    const redisKey = `token:${token}`;
    
    // Solo almacenar datos no sensibles
    const safeUserData = {
      id: userData._id || userData.id,
      email: userData.email,
      role: userData.role
    };
    
    await redisClient.setEx(redisKey, expiryTime, JSON.stringify(safeUserData));
    return true;
  } catch (error) {
    console.error('Error storing token in Redis:', error);
    return false;
  }
};

/**
 * Verifica un token en Redis
 * @param {string} token - Token JWT a verificar
 * @returns {Object|null} - Datos del usuario o null si no es válido
 */
exports.verifyTokenInRedis = async (token) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient || !isRedisConnected()) {
      return null;
    }
    
    const redisKey = `token:${token}`;
    
    const userData = await redisClient.get(redisKey);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error verifying token in Redis:', error);
    return null;
  }
};

/**
 * Elimina un token de Redis
 * @param {string} token - Token JWT a eliminar
 */
exports.removeToken = async (token) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient || !isRedisConnected()) {
      return false;
    }
    
    const redisKey = `token:${token}`;
    
    await redisClient.del(redisKey);
    return true;
  } catch (error) {
    console.error('Error removing token from Redis:', error);
    return false;
  }
};

/**
 * Crea un token JWT y lo almacena en Redis
 * @param {Object} user - Usuario para el que crear el token
 * @returns {string} - Token JWT generado
 */
exports.createAndStoreToken = async (user) => {
  // Obtener el tiempo de expiración de las variables de entorno o usar valor por defecto
  const jwtExpire = process.env.JWT_EXPIRE || '24h';
  const jwtExpireSeconds = typeof jwtExpire === 'string' && jwtExpire.endsWith('h') 
    ? parseInt(jwtExpire) * 3600 
    : 86400; // 24 horas por defecto
  
  // Crear token JWT
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: jwtExpire }
  );
  
  // Almacenar en Redis (si está disponible)
  await this.storeToken(token, user, jwtExpireSeconds);
  
  return token;
}; 