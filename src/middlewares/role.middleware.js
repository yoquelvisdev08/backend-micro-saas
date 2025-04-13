const { sendErrorResponse } = require('../utils/responseHandler');

/**
 * Middleware to check if user has admin role
 * @returns {Function} Middleware function
 */
exports.isAdmin = (req, res, next) => {
  // Check if user exists and has role admin
  if (!req.user || req.user.role !== 'admin') {
    return sendErrorResponse(res, 403, 'Access denied: Admin role required');
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
      return sendErrorResponse(res, 401, 'You must be logged in to access this resource');
    }
    
    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(
        res, 
        403,
        `Access denied: Required role: ${role}`
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
        403,
        `Access denied: Required roles: ${roles.join(', ')}`
      );
    }
    
    next();
  };
};

/**
 * Middleware to check if user is the owner of a resource or an admin
 * @param {Function|String} resourceType - Function to extract user ID or string specifying resource type
 * @returns {Function} Middleware function
 */
exports.isResourceOwnerOrAdmin = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Admins can access any resource
      if (req.user.role === 'admin') {
        return next();
      }
      
      let resourceUserId;
      
      // Handle different ways to specify how to get the resource user ID
      if (typeof resourceType === 'function') {
        // If a function was provided, call it to get the user ID
        resourceUserId = await resourceType(req);
      } else if (typeof resourceType === 'string') {
        // If a string was provided, use it as the resource type
        switch (resourceType) {
          case 'site':
            // For sites, get the user ID from the site record
            // Use the resource ID from req.params.id or req.params.siteId
            const siteId = req.params.id || req.params.siteId;
            if (!siteId) {
              return sendErrorResponse(res, 400, 'Site ID is required');
            }
            
            try {
              // Get the site from the database using SiteModel or appropriate service
              const SiteModel = require('../models/site.model');
              const site = await SiteModel.getById(siteId);
              
              if (!site) {
                return sendErrorResponse(res, 404, 'Site not found');
              }
              
              resourceUserId = site.userId || site.user_id || site.ownerId || site.$ownerId;
            } catch (error) {
              console.error('Error getting site:', error);
              return sendErrorResponse(res, 500, 'Error retrieving site information');
            }
            break;
            
          // Add cases for other resource types as needed
          default:
            return sendErrorResponse(res, 500, `Unknown resource type: ${resourceType}`);
        }
      } else if (req.resourceId && req.resourceType) {
        // If resourceId and resourceType were set on the request object
        const resourceId = req.resourceId;
        const resourceTypeName = req.resourceType;
        
        switch (resourceTypeName) {
          case 'site':
            try {
              const SiteModel = require('../models/site.model');
              const site = await SiteModel.getById(resourceId);
              
              if (!site) {
                return sendErrorResponse(res, 404, 'Site not found');
              }
              
              resourceUserId = site.userId || site.user_id || site.ownerId || site.$ownerId;
            } catch (error) {
              console.error('Error getting site:', error);
              return sendErrorResponse(res, 500, 'Error retrieving site information');
            }
            break;
            
          // Add cases for other resource types as needed
          default:
            return sendErrorResponse(res, 500, `Unknown resource type: ${resourceTypeName}`);
        }
      } else {
        return sendErrorResponse(res, 500, 'Invalid resource specification');
      }
      
      // Check if the user is the owner of the resource
      if (resourceUserId && resourceUserId.toString() === req.user.id.toString()) {
        return next();
      }
      
      // If not the owner, deny access
      return sendErrorResponse(res, 403, 'Access denied: Not the resource owner');
    } catch (error) {
      console.error('Error in resource owner check:', error);
      return sendErrorResponse(res, 500, 'Error checking resource ownership');
    }
  };
}; 