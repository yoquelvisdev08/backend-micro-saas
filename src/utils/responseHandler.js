/**
 * Response Handler Utility
 * Provides consistent response formatting functions for the API
 */

/**
 * Send a successful response with standardized format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {Object|Array} data - Response data
 * @param {string} message - Optional success message
 * @returns {Object} Formatted response
 */
const sendResponse = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send an error response with standardized format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} errors - Optional detailed errors
 * @returns {Object} Formatted error response
 */
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  sendResponse,
  sendErrorResponse
}; 