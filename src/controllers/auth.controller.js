const authService = require('../services/auth.service');
const LogService = require('../services/log.service');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const logger = require('../utils/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
      return sendErrorResponse(res, 'Please provide name, email and password', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendErrorResponse(res, 'Please provide a valid email address', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return sendErrorResponse(res, 'Password must be at least 8 characters long', 400);
    }

    logger.info(`Attempting to register user: ${email}`);

    // Register the user via auth service
    const { user, token } = await authService.register(name, email, password);
    
    logger.info(`User registered successfully: ${email}`);

    // Log the registration
    LogService.createLog({
      type: 'auth',
      action: 'register',
      message: `User registered: ${email}`,
      userId: user.id,
      metadata: { name: user.name, email: user.email }
    }).catch(err => {
      logger.error('Error logging registration:', err);
    });

    sendSuccessResponse(
      res,
      'User registered successfully',
      { token, user },
      201
    );
  } catch (error) {
    logger.error('Error registering user:', error);
    sendErrorResponse(res, 'Error registering user', 500);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return sendErrorResponse(res, 'Please provide email and password', 400);
    }

    logger.info(`Attempting login for user: ${email}`);

    // Login via auth service
    const { token, user } = await authService.createSession(email, password);
    
    logger.info(`User logged in successfully: ${email}`);

    // Log the login
    LogService.createLog({
      type: 'auth',
      action: 'login',
      message: `User logged in: ${email}`,
      userId: user.id,
      metadata: { email },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).catch(err => {
      logger.error('Error logging login:', err);
    });

    sendSuccessResponse(
      res,
      'Login successful',
      { token, user }
    );
  } catch (error) {
    logger.error('Error during login:', error);
    sendErrorResponse(res, 'Invalid credentials', 401);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);

    // Log the profile access
    LogService.createLog({
      type: 'auth',
      action: 'view',
      message: 'User viewed their profile',
      userId: req.user.id,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).catch(err => {
      logger.error('Error logging profile view:', err);
    });

    sendSuccessResponse(
      res, 
      'User fetched successfully', 
      { user }
    );
  } catch (error) {
    logger.error('Error fetching user:', error);
    sendErrorResponse(res, 'Error fetching user', 500);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // Logout via auth service
    await authService.logout();
    
    // Log the logout
    LogService.createLog({
      type: 'auth',
      action: 'logout',
      message: 'User logged out',
      userId: req.user.id,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).catch(err => {
      logger.error('Error logging logout:', err);
    });
    
    sendSuccessResponse(res, 'Logged out successfully', null);
  } catch (error) {
    logger.error('Logout error:', error);
    sendErrorResponse(res, 'Error during logout', 500);
  }
}; 