const { sendSuccessResponse } = require('../utils/response.utils');

// Caché en memoria simple (solo para desarrollo)
// En producción, esto debería ser reemplazado por una solución persistente y escalable
const memoryCache = new Map();

/**
 * Middleware para cachear respuestas de API en memoria
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
      const cachedData = memoryCache.get(cacheKey);
      
      if (cachedData && cachedData.expiry > Date.now()) {
        // Si existe caché y no ha expirado, enviar respuesta directamente desde caché
        const data = cachedData.data;
        res.set('X-Cache', 'HIT');
        return sendSuccessResponse(res, data.message, data.data);
      }

      // Si no hay caché o ha expirado, modificar el método res.send para guardar en caché
      const originalSend = res.send;
      res.send = function(body) {
        // Solo cachear respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Analizar el cuerpo JSON
          try {
            const parsedBody = JSON.parse(body);
            if (parsedBody.success) {
              // Guardar en caché con tiempo de expiración
              memoryCache.set(cacheKey, {
                data: {
                  message: parsedBody.message,
                  data: parsedBody.data
                },
                expiry: Date.now() + (duration * 1000)
              });
            }
          } catch (e) {
            console.error('Error parsing response body for cache:', e);
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
          // Convertir patrón simple con asteriscos a RegExp
          const regex = new RegExp(keyPattern.replace('*', '.*'));
          
          // Eliminar claves que coinciden con el patrón
          let count = 0;
          for (const key of memoryCache.keys()) {
            if (regex.test(key)) {
              memoryCache.delete(key);
              count++;
            }
          }
          
          if (count > 0) {
            console.log(`Invalidated cache for pattern: ${keyPattern} (${count} keys)`);
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