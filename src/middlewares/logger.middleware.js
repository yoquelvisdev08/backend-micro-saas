const LogService = require('../services/log.service');

/**
 * Middleware to log important API activities
 * @param {String} type - Type of log
 * @param {String} action - Action being performed
 * @param {String} message - Custom message (optional)
 */
const logActivity = (type, action, customMessage = null) => {
  return async (req, res, next) => {
    // Store original response send method
    const originalSend = res.send;
    
    // Override response send method to capture response data
    res.send = function(data) {
      // Restore original send method to avoid infinite loops
      res.send = originalSend;
      
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Extract response data if it's JSON
        let responseData = {};
        try {
          if (typeof data === 'string') {
            responseData = JSON.parse(data);
          } else {
            responseData = data;
          }
        } catch (error) {
          // If not valid JSON, just continue without response data
        }
        
        // Create log entry
        const message = customMessage || 
                       `User performed ${action} operation on ${req.originalUrl}`;
        
        // Extract relevant metadata without sensitive info
        const metadata = {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          // Include only necessary response data, avoid logging sensitive data
          responseMessage: responseData.message || null
        };
        
        // Get client IP address
        const ip = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress;
        
        // Log the activity
        LogService.createLog({
          type,
          action,
          message,
          userId: req.user.id,
          metadata,
          ip
        });
      }
      
      // Continue with the original response
      return res.send(data);
    };
    
    next();
  };
};

module.exports = {
  logActivity
}; 