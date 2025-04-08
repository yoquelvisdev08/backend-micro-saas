const { sendErrorResponse } = require('../utils/response.utils');
const LogService = require('../services/log.service');

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error('Global error handler:', err);
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';
  let errorType = 'server_error';
  
  // Customize error response based on error type
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
    errorType = 'validation_error';
  } else if (err.name === 'CastError') {
    // Mongoose cast error
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errorType = 'cast_error';
  } else if (err.code === 11000) {
    // Mongoose duplicate key error
    statusCode = 400;
    message = 'Duplicate field value entered';
    errorType = 'duplicate_error';
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    message = 'Invalid token';
    errorType = 'auth_error';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401;
    message = 'Token expired';
    errorType = 'auth_error';
  }
  
  // Log the error to the database
  if (req.user) {
    LogService.createLog({
      type: 'error',
      action: 'error',
      message: `Error: ${message}`,
      userId: req.user.id,
      metadata: {
        errorType,
        path: req.originalUrl,
        method: req.method,
        statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    }).catch(logErr => {
      console.error('Error logging the error to database:', logErr);
    });
  }
  
  // Send error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorResponse(res, message, statusCode, {
      error: err.name,
      stack: err.stack,
      errorType
    });
  } else {
    // In production, don't send stack trace
    sendErrorResponse(res, message, statusCode, { errorType });
  }
};

module.exports = errorHandler; 