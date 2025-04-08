const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const tokenMiddleware = require('./token.middleware');
const { sendErrorResponse } = require('../utils/response.utils');

// Protect routes
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
    return sendErrorResponse(res, 'Not authorized to access this route', 401);
  }

  try {
    // First check if token is in Redis cache
    const userFromRedis = await tokenMiddleware.verifyTokenInRedis(token);
    
    if (userFromRedis) {
      // If found in Redis cache, set user and continue
      req.user = userFromRedis;
      return next();
    }
    
    // If not in Redis, verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 401);
    }
    
    // Store token in Redis for future requests
    await tokenMiddleware.storeToken(token, user);
    
    // Add user to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    next();
  } catch (err) {
    return sendErrorResponse(res, 'Not authorized to access this route', 401);
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(res, 'Not authorized to access this route', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(
        res,
        `User role ${req.user.role} is not authorized to access this route`,
        403
      );
    }
    next();
  };
};