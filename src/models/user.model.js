const { databases, DATABASE_ID, USERS_COLLECTION_ID, ID, Query } = require('../config/appwrite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User model - Defines interface for user data management using Appwrite
 */
const UserModel = {
  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    try {
      // Validaciones básicas
      if (!userData.name) {
        throw new Error('Please provide a name');
      }
      
      if (!userData.email) {
        throw new Error('Please provide an email');
      }
      
      if (!userData.password || userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Verificar si ya existe un usuario con el mismo email
      const existingUsers = await databases.listDocuments(
        DATABASE_ID, 
        USERS_COLLECTION_ID,
        [Query.equal('email', userData.email)]
      );
      
      if (existingUsers.total > 0) {
        throw new Error('Email already in use');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Crear nuevo usuario
      const newUser = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        ID.unique(),
        {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role || 'user',
          plan: userData.plan || 'free',
          webhookUrl: userData.webhookUrl || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object>} User document
   */
  async findById(id) {
    try {
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id
      );
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Find user by ID and include password (for auth)
   * @param {string} id - User ID
   * @returns {Promise<Object>} User document with password
   */
  async findByIdWithPassword(id) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id
      );
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User document without password
   */
  async findByEmail(email) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', email)]
      );
      
      if (response.total === 0) {
        return null;
      }
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = response.documents[0];
      return userWithoutPassword;
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Find user by email with password (for auth)
   * @param {string} email - User email
   * @returns {Promise<Object>} User document with password
   */
  async findByEmailWithPassword(email) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.equal('email', email)]
      );
      
      if (response.total === 0) {
        return null;
      }
      
      return response.documents[0];
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async update(id, updateData) {
    try {
      // Si hay contraseña, hashearla
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }
      
      // Ensure we're not modifying createdAt
      const { createdAt, ...updates } = updateData;
      
      // Always update the updatedAt timestamp
      updates.updatedAt = new Date().toISOString();
      
      const updated = await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id,
        updates
      );
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = updated;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        id
      );
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Count documents based on query
   * @param {Object} query - Query object
   * @returns {Promise<number>} Count of matching documents
   */
  async countDocuments(query = {}) {
    try {
      const queryParams = [];
      
      // Convert query object to Appwrite query format
      Object.entries(query).forEach(([key, value]) => {
        if (key === 'createdAt' && value.$gte) {
          queryParams.push(Query.greaterThanEqual('createdAt', value.$gte.toISOString()));
        } else {
          queryParams.push(Query.equal(key, value));
        }
      });
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        queryParams
      );
      
      return response.total;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Generate signed JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { id: user.$id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  },
  
  /**
   * Match password with stored hash
   * @param {string} enteredPassword - Password attempt
   * @param {string} storedPassword - Stored hashed password
   * @returns {Promise<boolean>} Match result
   */
  async matchPassword(enteredPassword, storedPassword) {
    return await bcrypt.compare(enteredPassword, storedPassword);
  }
};

module.exports = UserModel; 