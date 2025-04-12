/**
 * Clase personalizada para errores de la aplicación
 * @extends Error
 */
class AppError extends Error {
  /**
   * Crea una instancia de AppError
   * @param {string} message - Mensaje de error
   * @param {number} statusCode - Código de estado HTTP
   */
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError; 