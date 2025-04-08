// Archivo de prueba para identificar posibles errores
const dotenv = require('dotenv');
dotenv.config();

// Importar las configuraciones necesarias
console.log('Verificando configuración de Redis...');
const { connectRedis, getRedisClient } = require('./src/config/redis');

// Importar los middlewares
console.log('Verificando middlewares...');
const jwt = require('jsonwebtoken');
const tokenMiddleware = require('./src/middlewares/token.middleware');

// Prueba de conexión Redis
async function testRedisConnection() {
  console.log('Intentando conectar a Redis...');
  try {
    await connectRedis();
    console.log('Conexión a Redis establecida o ignorada si no está disponible.');
  } catch (error) {
    console.error('Error al conectar a Redis:', error);
  }
}

// Inicio de pruebas
(async () => {
  try {
    await testRedisConnection();
    console.log('Prueba completada con éxito');
    process.exit(0);
  } catch (err) {
    console.error('Error en la prueba:', err);
    process.exit(1);
  }
})(); 