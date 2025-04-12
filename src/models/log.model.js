const { databases, DATABASE_ID, LOGS_COLLECTION_ID, ID, Query } = require('../config/appwrite');

/**
 * Log model - Defines interface for log data management using Appwrite
 */
const LogModel = {
  /**
   * Create a new log entry
   * @param {Object} logData - Log data to create
   * @returns {Promise<Object>} Created log
   */
  async create(logData) {
    try {
      // Validaciones básicas
      if (!logData.type || !['auth', 'site', 'system', 'error', 'test'].includes(logData.type)) {
        throw new Error('El tipo de log debe ser válido');
      }
      
      if (!logData.action) {
        throw new Error('La acción es requerida');
      }
      
      if (!logData.message) {
        throw new Error('El mensaje es requerido');
      }
      
      if (!logData.userId) {
        throw new Error('UserId es requerido');
      }
      
      // Crear log
      const newLog = await databases.createDocument(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        ID.unique(),
        {
          type: logData.type,
          action: logData.action,
          message: logData.message,
          userId: logData.userId,
          metadata: logData.metadata || {},
          ip: logData.ip || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      
      return newLog;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Find log by ID
   * @param {string} id - Log ID
   * @returns {Promise<Object>} Log document
   */
  async findById(id) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        id
      );
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Find logs by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Options like limit, sort
   * @returns {Promise<Array>} Array of logs
   */
  async findByUserId(userId, options = {}) {
    try {
      const queries = [Query.equal('userId', userId)];
      
      // Add sort if provided
      if (options.sort === '-createdAt') {
        queries.push(Query.orderDesc('createdAt'));
      } else if (options.sort === 'createdAt') {
        queries.push(Query.orderAsc('createdAt'));
      }
      
      // Add limit if provided
      if (options.limit) {
        queries.push(Query.limit(options.limit));
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queries
      );
      
      return response.documents;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Find one log by query
   * @param {Object} query - Query object
   * @param {Object} options - Options like sort
   * @returns {Promise<Object>} Log document
   */
  async findOne(query = {}, options = {}) {
    try {
      const queryParams = [];
      
      // Convert query object to Appwrite query format
      Object.entries(query).forEach(([key, value]) => {
        queryParams.push(Query.equal(key, value));
      });
      
      // Add sort if provided
      if (options.sort === '-createdAt') {
        queryParams.push(Query.orderDesc('createdAt'));
      } else if (options.sort === 'createdAt') {
        queryParams.push(Query.orderAsc('createdAt'));
      }
      
      // Always limit to 1 since we only want one document
      queryParams.push(Query.limit(1));
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queryParams
      );
      
      return response.total > 0 ? response.documents[0] : null;
    } catch (error) {
      return null;
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
        queryParams.push(Query.equal(key, value));
      });
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queryParams
      );
      
      return response.total;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Delete logs matching a query
   * @param {Object} query - Query conditions
   * @returns {Promise<boolean>} Success status
   */
  async deleteMany(query = {}) {
    try {
      const queryParams = [];
      
      // Convert query object to Appwrite query format
      Object.entries(query).forEach(([key, value]) => {
        queryParams.push(Query.equal(key, value));
      });
      
      // Primero necesitamos obtener todos los IDs
      const response = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queryParams
      );
      
      // Eliminar cada documento individualmente (Appwrite no tiene deleteMany)
      for (const doc of response.documents) {
        await databases.deleteDocument(
          DATABASE_ID,
          LOGS_COLLECTION_ID,
          doc.$id
        );
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = LogModel; 