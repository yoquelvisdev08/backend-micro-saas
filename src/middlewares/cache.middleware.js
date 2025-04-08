const { redisClient } = require('../config/redis');
const { sendSuccessResponse } = require('../utils/response.utils');

/**
 * Middleware para cachear respuestas de API
 * @param {number} duration - Duración del caché en segundos (opcional, por defecto 60 segundos)
 * @returns {function} - Middleware Express
 */
exports.cacheResponse = (duration = 60) => {
  return async (req, res, next) => {
    // No aplicar caché en modo de desarrollo para facilitar las pruebas
    if (process.env.NODE_ENV === 'development' && req.query.no_cache === 'true') {
      return next();
    }

    // Saltar caché para métodos que no son GET
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generar clave única para caché basada en la URL y parámetros de consulta
      const cacheKey = `cache:${req.originalUrl}`;

      // Verificar si hay datos en caché
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Si existe caché, enviar respuesta directamente desde caché
        const data = JSON.parse(cachedData);
        res.set('X-Cache', 'HIT');
        return sendSuccessResponse(res, data.message, data.data);
      }

      // Si no hay caché, modificar el método res.send para guardar en caché
      const originalSend = res.send;
      res.send = function(body) {
        // Solo cachear respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Analizar el cuerpo JSON
          const parsedBody = JSON.parse(body);
          if (parsedBody.success) {
            // Guardar en caché
            redisClient.setEx(
              cacheKey,
              duration,
              JSON.stringify({
                message: parsedBody.message,
                data: parsedBody.data
              })
            ).catch(err => console.error('Redis cache error:', err));
          }
        }
        
        // Establecer encabezado de caché
        res.set('X-Cache', 'MISS');
        
        // Continuar con la respuesta original
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Middleware para invalidar caché cuando se modifican recursos
 * @param {string} keyPattern - Patrón de claves a invalidar (ej: 'users:*')
 * @returns {function} - Middleware Express
 */
exports.invalidateCache = (keyPattern) => {
  return async (req, res, next) => {
    // Guardar el método send original
    const originalSend = res.send;
    
    // Reemplazar el método send
    res.send = async function(body) {
      // Solo invalidar caché para respuestas exitosas y métodos que modifican datos
      const modifyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      
      if (modifyMethods.includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Obtener claves que coinciden con el patrón
          const keys = await redisClient.keys(keyPattern);
          
          // Si hay claves para eliminar
          if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Invalidated cache for pattern: ${keyPattern} (${keys.length} keys)`);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
      
      // Continuar con la respuesta original
      return originalSend.call(this, body);
    };
    
    next();
  };
}; 