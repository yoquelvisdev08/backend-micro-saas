const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { databases, DATABASE_ID, USERS_COLLECTION_ID, Query, ID } = require('../config/appwrite.test');

/**
 * Auth Test Service - Handles authentication for testing with Appwrite
 */
class AuthTestService {
  /**
   * Register a test user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user and token
   */
  async register(userData) {
    const { name, email, password } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      const error = new Error('Email already in use');
      error.statusCode = 400;
      throw error;
    }
    
    // Create timestamp
    const timestamp = new Date().toISOString();
    
    try {
      // Create user in Appwrite - modify schema to match collection structure
      const docId = ID.unique();
      const user = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        docId,
        {
          name: name,
          email: email, // This will be handled based on the collection schema
          password: hashedPassword,
          role: 'user',
          plan: 'free',
          createdAt: timestamp,
          updatedAt: timestamp
        }
      );
      
      // Generate JWT token
      const token = this.generateToken(user.$id, user.role);
      
      return {
        user: {
          id: user.$id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Inspect the actual collection structure
      try {
        const collection = await databases.getCollection(DATABASE_ID, USERS_COLLECTION_ID);
        console.log('Collection structure:', collection);
      } catch (e) {
        console.error('Error fetching collection structure:', e);
      }
      
      throw error;
    }
  }
  
  /**
   * Login a test user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - User data and token
   */
  async login(email, password) {
    try {
      // Get user
      const user = await this.getUserByEmail(email);
      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }
      
      // Generate token
      const token = this.generateToken(user.$id, user.role);
      
      return {
        user: {
          id: user.$id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} - User or null
   */
  async getUserById(id) {
    try {
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id
      );
      
      return {
        id: user.$id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }
  
  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - User or null
   */
  async getUserByEmail(email) {
    try {
      const users = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', email)]
      );
      
      if (users.total === 0) {
        return null;
      }
      
      return users.documents[0];
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }
  
  /**
   * Generate JWT token
   * @param {string} id - User ID
   * @param {string} role - User role
   * @returns {string} - JWT token
   */
  generateToken(id, role) {
    return jwt.sign(
      { id, role },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );
  }
  
  /**
   * Cleanup all test users
   */
  async cleanup() {
    try {
      const users = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID
      );
      
      for (const user of users.documents) {
        await databases.deleteDocument(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          user.$id
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error cleaning up test users:', error);
      return false;
    }
  }
}

module.exports = new AuthTestService(); 