const User = require('../models/user.model');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const LogService = require('../services/log.service');
const tokenMiddleware = require('../middlewares/token.middleware');
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

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(res, 'Email already in use', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Create token and store in Redis
    const token = await tokenMiddleware.createAndStoreToken(user);
    logger.info(`Usuario registrado y token almacenado en Redis: ${email}`);

    // Log the registration
    LogService.createLog({
      type: 'auth',
      action: 'register',
      message: `User registered: ${user.email}`,
      userId: user._id,
      metadata: { name: user.name, email: user.email }
    });

    sendSuccessResponse(
      res,
      'User registered successfully',
      { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
      201
    );
  } catch (error) {
    console.error(error);
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

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendErrorResponse(res, 'Invalid credentials', 401);
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendErrorResponse(res, 'Invalid credentials', 401);
    }

    // Create token and store in Redis
    const token = await tokenMiddleware.createAndStoreToken(user);
    logger.info(`Usuario autenticado y token almacenado en Redis: ${email}`);

    // Log the login
    LogService.createLog({
      type: 'auth',
      action: 'login',
      message: `User logged in: ${user.email}`,
      userId: user._id,
      metadata: { email: user.email },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    sendSuccessResponse(
      res,
      'Login successful',
      { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    );
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error during login', 500);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Log the profile access
    LogService.createLog({
      type: 'auth',
      action: 'view',
      message: 'User viewed their profile',
      userId: req.user.id,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    sendSuccessResponse(
      res, 
      'User fetched successfully', 
      { user: { id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan } }
    );
  } catch (error) {
    console.error(error);
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
    // Get token from auth header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Remove token from Redis
      const tokenRemoved = await tokenMiddleware.removeToken(token);
      logger.info(`Token eliminado de Redis: ${tokenRemoved ? 'Éxito' : 'No encontrado'}`);
    }
    
    // Log the logout
    LogService.createLog({
      type: 'auth',
      action: 'logout',
      message: 'User logged out',
      userId: req.user.id,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    
    sendSuccessResponse(res, 'Logged out successfully', null);
  } catch (error) {
    console.error('Logout error:', error);
    sendErrorResponse(res, 'Error during logout', 500);
  }
}; 