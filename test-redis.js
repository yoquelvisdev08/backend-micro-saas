// Script para probar la implementación de Redis
const dotenv = require('dotenv');
dotenv.config();

const redis = require('redis');
const logger = require('./src/utils/logger');
const { connectRedis, getRedisClient, isRedisConnected } = require('./src/config/redis');
const tokenMiddleware = require('./src/middlewares/token.middleware');

// Función para simular un usuario
const mockUser = {
  _id: '123456789012345678901234',
  name: 'Usuario de Prueba',
  email: 'test@example.com',
  role: 'user'
};

// Función para probar la creación y almacenamiento de tokens
async function testTokenOperations() {
  logger.info('Iniciando pruebas de Redis con tokens...');
  
  // 1. Conectar a Redis
  logger.info('Conectando a Redis...');
  await connectRedis();
  
  if (!isRedisConnected()) {
    logger.error('No se pudo conectar a Redis. Abortando pruebas.');
    process.exit(1);
  }
  
  // 2. Crear un token y almacenarlo en Redis
  logger.info('Creando un token de prueba...');
  const token = await tokenMiddleware.createAndStoreToken(mockUser);
  logger.info(`Token creado: ${token.substring(0, 20)}...`);
  
  // 3. Verificar que el token está en Redis
  logger.info('Verificando el token en Redis...');
  const userData = await tokenMiddleware.verifyTokenInRedis(token);
  
  if (userData) {
    logger.info('Token verificado correctamente en Redis');
    logger.info('Datos almacenados:', userData);
  } else {
    logger.error('El token no se encontró en Redis');
  }
  
  // 4. Eliminar el token de Redis
  logger.info('Eliminando el token de Redis...');
  const removed = await tokenMiddleware.removeToken(token);
  logger.info(`Token eliminado: ${removed ? 'Sí' : 'No'}`);
  
  // 5. Verificar nuevamente que el token ya no está en Redis
  logger.info('Verificando que el token ya no existe en Redis...');
  const userDataAfterRemoval = await tokenMiddleware.verifyTokenInRedis(token);
  
  if (!userDataAfterRemoval) {
    logger.info('Token eliminado correctamente');
  } else {
    logger.error('¡Error! El token sigue en Redis');
  }
  
  // 6. Obtener estadísticas de Redis
  const redisClient = getRedisClient();
  if (redisClient) {
    logger.info('Estadísticas de Redis:');
    try {
      const info = await redisClient.info();
      logger.info(`Versión de Redis: ${info.split('\n').find(line => line.startsWith('redis_version'))}`);
      logger.info(`Clientes conectados: ${info.split('\n').find(line => line.startsWith('connected_clients'))}`);
    } catch (error) {
      logger.error('Error al obtener estadísticas de Redis:', error);
    }
  }
  
  logger.info('Pruebas completadas exitosamente.');
}

// Ejecutar pruebas y salir
(async () => {
  try {
    await testTokenOperations();
    process.exit(0);
  } catch (err) {
    logger.error('Error en las pruebas:', err);
    process.exit(1);
  }
})(); 