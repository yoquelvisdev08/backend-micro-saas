/**
 * Wrapper para manejar errores en funciones asíncronas de controladores
 * @param {Function} fn - Función asíncrona a envolver
 * @returns {Function} - Función envuelta con manejo de errores
 */
exports.catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}; 