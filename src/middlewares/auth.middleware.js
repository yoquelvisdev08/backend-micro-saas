const jwt = require('jsonwebtoken');
const { databases, DATABASE_ID, USERS_COLLECTION_ID, Query } = require('../config/appwrite');
const { sendErrorResponse } = require('../utils/response.utils');
const logger = require('../utils/logger');

// Protect routes - verifies JWT token and attaches user to request
exports.protect = async (req, res, next) => {
  let token;

  // Check if auth header exists and has Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    logger.warn('No token provided in request');
    return sendErrorResponse(res, 'Not authorized to access this route', 401);
  }

  try {
    // Use the same JWT secret as in auth.service.js
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info(`Token verified for user ID: ${decoded.id}`);
    
    // Get user from Appwrite database
    let user;
    
    try {
      // Try direct document lookup by ID
      user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        decoded.id
      );
      logger.info(`User found: ${user.$id}`);
    } catch (error) {
      logger.error(`Error retrieving user: ${error.message}`);
      return sendErrorResponse(res, 'User not found', 401);
    }
    
    // Add user to request with default role
    req.user = {
      id: user.$id,
      email: Array.isArray(user.email) ? user.email[0] : user.email, // Handle email as array
      // Always use 'user' as default role since we don't store roles in Appwrite
      role: 'user',
      name: user.name
    };
    
    logger.info(`User authenticated: ${user.$id}`);
    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    return sendErrorResponse(res, 'Not authorized to access this route', 401);
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('No user object in request');
      return sendErrorResponse(res, 'Not authorized to access this route', 401);
    }

    // We always use 'user' role as default
    const userRole = 'user';
    logger.info(`Checking authorization for user ${req.user.id} with role: ${userRole}`);

    if (!roles.includes(userRole)) {
      logger.warn(`Access denied: User ${req.user.id} with role ${userRole} tried to access route restricted to ${roles.join(', ')}`);
      return sendErrorResponse(
        res,
        `Access denied: Required roles: ${roles.join(', ')}`,
        403
      );
    }
    
    logger.info(`User ${req.user.id} authorized for role: ${userRole}`);
    next();
  };
};