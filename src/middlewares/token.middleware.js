/**
 * token.middleware.js
 * Middleware para gestionar tokens JWT
 */
const jwt = require('jsonwebtoken');

// Mantenemos un array en memoria para tokens inválidos (solo para la sesión actual)
// En producción, esto debería ser reemplazado por una solución persistente como Appwrite
const invalidTokens = new Set();

/**
 * Almacena un token JWT (simulando el almacenamiento)
 * @param {string} token - Token JWT
 * @param {Object} userData - Datos del usuario a almacenar
 * @param {number} expiryTime - Tiempo de expiración en segundos
 */
exports.storeToken = async (token, userData, expiryTime = 3600) => {
  try {
    // Ya no almacenamos en Redis, sino que validamos con JWT directamente
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

/**
 * Verifica un token
 * @param {string} token - Token JWT a verificar
 * @returns {Object|null} - Datos del usuario o null si no es válido
 */
exports.verifyTokenInRedis = async (token) => {
  try {
    // Verificar si el token está invalidado (logout)
    if (invalidTokens.has(token)) {
      return null;
    }
    
    // Verificar el token con JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

/**
 * Elimina un token (lo marca como inválido)
 * @param {string} token - Token JWT a eliminar
 */
exports.removeToken = async (token) => {
  try {
    // Agregamos el token a la lista de tokens inválidos
    invalidTokens.add(token);
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
};

/**
 * Crea un token JWT
 * @param {Object} user - Usuario para el que crear el token
 * @returns {string} - Token JWT generado
 */
exports.createAndStoreToken = async (user) => {
  // Obtener el tiempo de expiración de las variables de entorno o usar valor por defecto
  const jwtExpire = process.env.JWT_EXPIRES_IN || '24h';
  
  // Crear token JWT
  const token = jwt.sign(
    { id: user.$id || user.id || user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: jwtExpire }
  );
  
  return token;
}; 