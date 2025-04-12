const LogService = require('../services/log.service');
const crypto = require('crypto');

/**
 * Middleware to log important API activities
 * @param {String} type - Type of log
 * @param {String} action - Action being performed
 * @param {String} message - Custom message (optional)
 * @param {Array} tags - Custom tags to add to the log (optional)
 */
const logActivity = (type, action, customMessage = null, tags = []) => {
  return async (req, res, next) => {
    // Generate a unique request ID for tracking
    const requestId = crypto.randomBytes(16).toString('hex');
    req.requestId = requestId;
    
    // Track request start time for performance monitoring
    const startTime = Date.now();
    
    // Store original response send method
    const originalSend = res.send;
    
    // Override response send method to capture response data
    res.send = function(data) {
      // Restore original send method to avoid infinite loops
      res.send = originalSend;
      
      // Calculate request duration
      const duration = Date.now() - startTime;
      
      // Extract status, default to success for 2xx, error for others
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error';
      
      // Only log if user is authenticated or explicitly specified
      if (req.user) {
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
        
        // Extract site ID if present in request params or body
        const siteId = req.params.siteId || (req.body && req.body.siteId) || null;
        
        // Extract relevant metadata without sensitive info
        const metadata = {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          headers: {
            contentType: req.headers['content-type'],
            userAgent: req.headers['user-agent'],
            accept: req.headers['accept']
          },
          // Include only necessary response data, avoid logging sensitive data
          responseMessage: responseData.message || null,
          queryParams: {...req.query},
          // Avoid logging sensitive body data
          hasBody: !!req.body
        };
        
        // Remove sensitive query params if present
        if (metadata.queryParams.password) metadata.queryParams.password = '[REDACTED]';
        if (metadata.queryParams.token) metadata.queryParams.token = '[REDACTED]';
        
        // Get client IP address
        const ip = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress;
        
        // Add performance/error details
        const details = {};
        
        // For errors, add error information
        if (status === 'error') {
          details.error = {
            code: res.statusCode,
            message: responseData.message || 'Unknown error'
          };
        }
        
        // Add request timing information
        details.timing = {
          duration,
          timestamp: new Date().toISOString()
        };
        
        // Log the activity with enhanced information
        LogService.createLog({
          type,
          action,
          message,
          userId: req.user.id,
          siteId,
          status,
          details,
          metadata,
          tags: Array.isArray(tags) ? tags : [],
          duration,
          ip,
          userAgent: req.headers['user-agent'],
          requestId
        }).catch(err => {
          console.error('Error logging activity:', err);
        });
      }
      
      // Continue with the original response
      return res.send(data);
    };
    
    next();
  };
};

/**
 * Middleware to track API performance without creating logs
 * Useful for high-volume endpoints where full logging would be excessive
 */
const trackPerformance = () => {
  return (req, res, next) => {
    // Generate a unique request ID for tracking
    req.requestId = crypto.randomBytes(16).toString('hex');
    
    // Track request start time
    req.startTime = Date.now();
    
    // Continue to next middleware
    next();
  };
};

module.exports = {
  logActivity,
  trackPerformance
}; 