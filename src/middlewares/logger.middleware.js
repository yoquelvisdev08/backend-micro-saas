const LogService = require('../services/log.service');
const crypto = require('crypto');

/**
 * Middleware that logs activity to the database
 * @param {String} type - Type of activity
 * @param {String} action - Action being performed
 * @param {String} message - Message to log (optional)
 * @returns {Function} - Express middleware function
 */
exports.logActivity = (type, action, message = null) => {
  return (req, res, next) => {
    // Only run if we have a user ID
    if (req.user && req.user.id) {
      // Generate appropriate message if not provided
      const logMessage = message || `${type}: ${action}`;
      
      // Extract basic info - only use fields we know exist in Appwrite
      const logData = {
        type,
        action,
        message: logMessage,
        userId: req.user.id,
        // Add IP address if available
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      };
      
      // Optional metadata with limited fields
      const metadata = {
        path: req.originalUrl,
        method: req.method
      };
      
      // Add metadata if we have it
      if (Object.keys(metadata).length > 0) {
        logData.metadata = metadata;
      }
      
      // Don't wait for log to be written, and don't throw if it fails
      LogService.createLog(logData).catch(err => {
        console.error('Error creating log:', err.message);
        // Don't throw - continue with request
      });
    }
    
    next();
  };
};

/**
 * Middleware to track API performance without creating logs
 * Useful for high-volume endpoints where full logging would be excessive
 */
exports.trackPerformance = () => {
  return (req, res, next) => {
    // Generate a unique request ID for tracking
    req.requestId = crypto.randomBytes(16).toString('hex');
    
    // Track request start time
    req.startTime = Date.now();
    
    // Continue to next middleware
    next();
  };
};

// No module.exports needed as we're using exports directly 