/**
 * Custom error class with status code
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a Not Found error
 * @param {string} resource - Resource name
 * @returns {AppError} - Not found error
 */
const notFound = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404);
};

/**
 * Create a Bad Request error
 * @param {string} message - Error message
 * @returns {AppError} - Bad request error
 */
const badRequest = (message = 'Bad request') => {
  return new AppError(message, 400);
};

/**
 * Create an Unauthorized error
 * @param {string} message - Error message
 * @returns {AppError} - Unauthorized error
 */
const unauthorized = (message = 'Unauthorized access') => {
  return new AppError(message, 401);
};

/**
 * Create a Forbidden error
 * @param {string} message - Error message
 * @returns {AppError} - Forbidden error
 */
const forbidden = (message = 'Forbidden access') => {
  return new AppError(message, 403);
};

/**
 * Create a Server Error
 * @param {string} message - Error message
 * @returns {AppError} - Server error
 */
const serverError = (message = 'Internal server error') => {
  return new AppError(message, 500);
};

module.exports = {
  AppError,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  serverError
}; 