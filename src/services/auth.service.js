const bcrypt = require('bcryptjs');
const { account, databases, DATABASE_ID, USERS_COLLECTION_ID, Query, ID } = require('../config/appwrite');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

/**
 * Auth Service - Handles all authentication operations with Appwrite
 */
class AuthService {
  /**
   * Register a new user
   * @param {string} name - User's name
   * @param {string} email - User's email
   * @param {string} password - User's password (will be hashed)
   * @returns {Object} - Created user details and session
   */
  async register(name, email, password) {
    try {
      logger.info(`Attempting to register user with email: ${email}`);
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create minimal user data with email as array (as required by Appwrite)
      const userData = {
        name,
        email: [email],  // Convert to array as required by Appwrite
        password: hashedPassword
      };
      
      logger.info(`Creating user with data structure. Fields: ${Object.keys(userData).join(', ')}`);
      logger.info(`Email is being sent as array: ${JSON.stringify(userData.email)}`);
      
      // Generate a unique ID for the new user
      const userId = ID.unique();
      logger.info(`Generated user ID: ${userId}`);
      
      // Create a new user document in Appwrite database
      const user = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        userData
      );
      
      logger.info(`User created successfully with ID: ${user.$id}`);
      
      // Generate JWT token with secret
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
      const token = jwt.sign(
        { id: user.$id, email: user.email[0] },  // Use first email in the array
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
      );
      
      logger.info(`Generated JWT token for user ${user.$id}`);
      
      // Return user data and token
      return {
        user: {
          id: user.$id,
          name: user.name,
          email: user.email[0]  // Return first email in the array
        },
        token
      };
    } catch (error) {
      logger.error('Error in register service:', error);
      
      // Add more detailed logging for debugging
      if (error.response) {
        logger.error(`Appwrite error details: ${JSON.stringify(error.response)}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Create a session (login)
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Object} - Session data and user details
   */
  async createSession(email, password) {
    try {
      logger.info(`Attempting to log in user with email: ${email}`);
      
      // Find the user by email (which is stored as an array in Appwrite)
      const users = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.search('email', email)]  // Search in email array
      );
      
      if (users.total === 0) {
        logger.warn(`No user found with email: ${email}`);
        throw new Error('Invalid credentials');
      }
      
      const user = users.documents[0];
      logger.info(`Found user with ID: ${user.$id}`);
      
      // Verify the password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(`Invalid password for user: ${user.$id}`);
        throw new Error('Invalid credentials');
      }
      
      // Generate JWT token with secret
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
      const token = jwt.sign(
        { id: user.$id, email: user.email[0] },  // Use first email in the array
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
      );
      
      logger.info(`Login successful for user: ${user.$id}`);
      
      return {
        token,
        user: {
          id: user.$id,
          name: user.name,
          email: user.email[0]  // Return first email in the array
        }
      };
    } catch (error) {
      logger.error('Error in createSession service:', error);
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} - User details
   */
  async getUserById(userId) {
    try {
      logger.info(`Getting user by ID: ${userId}`);
      
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      );
      
      logger.info(`Retrieved user: ${user.$id}`);
      
      return {
        id: user.$id,
        name: user.name,
        email: user.email[0]  // Return first email in the array
      };
    } catch (error) {
      logger.error(`Error in getUserById service for ID ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Logout a user
   * @returns {boolean} - Success status
   */
  async logout() {
    logger.info('User logged out');
    return true;
  }
}

module.exports = new AuthService(); 