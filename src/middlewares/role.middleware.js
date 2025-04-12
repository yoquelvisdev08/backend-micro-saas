const { sendErrorResponse } = require('../utils/response.utils');

/**
 * Middleware to check if user has admin role
 * @returns {Function} Middleware function
 */
exports.isAdmin = (req, res, next) => {
  // Check if user exists and has role admin
  if (!req.user || req.user.role !== 'admin') {
    return sendErrorResponse(res, 'Access denied: Admin role required', 403);
  }
  
  next();
};

/**
 * Middleware to restrict access to specific roles
 * @param {String} role - Required role (or roles separated by comma)
 * @returns {Function} Middleware function
 */
exports.restrictTo = (role) => {
  const roles = role.split(',').map(r => r.trim());
  
  return (req, res, next) => {
    // Check if user exists and has the required role
    if (!req.user) {
      return sendErrorResponse(res, 'You must be logged in to access this resource', 401);
    }
    
    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(
        res, 
        `Access denied: Required role: ${role}`, 
        403
      );
    }
    
    next();
  };
};

/**
 * Middleware to check if user has specific roles
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
exports.hasRoles = (roles) => {
  return (req, res, next) => {
    // Check if user exists and has one of the allowed roles
    if (!req.user || !roles.includes(req.user.role)) {
      return sendErrorResponse(
        res, 
        `Access denied: Required roles: ${roles.join(', ')}`, 
        403
      );
    }
    
    next();
  };
};

/**
 * Middleware to check if user is the owner of a resource or an admin
 * @param {Function} getResourceUserId - Function to extract user ID from resource
 * @returns {Function} Middleware function
 */
exports.isResourceOwnerOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // Admins can access any resource
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Get the user ID from the resource
      const resourceUserId = await getResourceUserId(req);
      
      // Check if the user is the owner of the resource
      if (resourceUserId && resourceUserId.toString() === req.user.id.toString()) {
        return next();
      }
      
      // If not the owner, deny access
      return sendErrorResponse(res, 'Access denied: Not the resource owner', 403);
    } catch (error) {
      console.error('Error in resource owner check:', error);
      return sendErrorResponse(res, 'Error checking resource ownership', 500);
    }
  };
}; 