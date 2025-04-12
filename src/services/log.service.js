const { databases, DATABASE_ID, LOGS_COLLECTION_ID, Query, ID } = require('../config/appwrite');
const logger = require('../utils/logger');

/**
 * Log Service - Handles all log operations with Appwrite
 */
class LogService {
  /**
   * Create a new log entry
   * @param {Object} logData - Log data
   * @returns {Object} - Created log
   */
  async createLog(logData) {
    try {
      const { type, action, message, userId, metadata = {}, ip = null } = logData;
      
      // Validate required fields
      if (!type || !action || !userId) {
        logger.warn('Missing required fields for log creation');
        return null;
      }
      
      // Prepare log document with minimal fields - no createdAt
      const logDocument = {
        type,
        action,
        message: message || `${type}:${action}`,
        userId,
        // Ensure metadata is a string
        metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : String(metadata)
      };
      
      // Only add IP if provided
      if (ip) {
        logDocument.ip = ip;
      }
      
      logger.debug(`Creating log entry: ${type}:${action} for user ${userId}`);
      
      const log = await databases.createDocument(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        ID.unique(),
        logDocument
      );
      
      logger.debug(`Log created successfully with ID: ${log.$id}`);
      
      return this.formatLog(log);
    } catch (error) {
      logger.error(`Error creating log: ${error.message}`);
      
      // Log additional details if available
      if (error.response) {
        logger.error(`Appwrite error details: ${JSON.stringify(error.response)}`);
      }
      
      // Don't throw to prevent breaking app flow
      return null;
    }
  }
  
  /**
   * Get logs for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} - List of logs
   */
  async getUserLogs(userId, options = {}) {
    try {
      const { limit = 100, page = 1 } = options;
      
      const queries = [Query.equal('userId', userId)];
      
      // Add type filter if provided
      if (options.type) {
        queries.push(Query.equal('type', options.type));
      }
      
      // Add action filter if provided
      if (options.action) {
        queries.push(Query.equal('action', options.action));
      }
      
      // Sort by $createdAt descending (special Appwrite field)
      queries.push(Query.orderDesc('$createdAt'));
      
      logger.debug(`Fetching logs for user: ${userId}`);
      
      const logs = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queries,
        limit,
        (page - 1) * limit
      );
      
      logger.debug(`Found ${logs.total} logs for user ${userId}`);
      
      return {
        total: logs.total,
        logs: logs.documents.map(this.formatLog)
      };
    } catch (error) {
      logger.error(`Error getting user logs: ${error.message}`);
      // Return empty results instead of throwing
      return {
        total: 0,
        logs: []
      };
    }
  }
  
  /**
   * Get all logs (admin only)
   * @param {Object} options - Query options
   * @returns {Array} - List of logs
   */
  async getAllLogs(options = {}) {
    try {
      const { limit = 100, page = 1 } = options;
      
      const queries = [];
      
      // Add userId filter if provided
      if (options.userId) {
        queries.push(Query.equal('userId', options.userId));
      }
      
      // Add type filter if provided
      if (options.type) {
        queries.push(Query.equal('type', options.type));
      }
      
      // Add action filter if provided
      if (options.action) {
        queries.push(Query.equal('action', options.action));
      }
      
      // Sort by $createdAt descending (special Appwrite field)
      queries.push(Query.orderDesc('$createdAt'));
      
      logger.debug('Fetching all logs');
      
      const logs = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queries,
        limit,
        (page - 1) * limit
      );
      
      logger.debug(`Found ${logs.total} logs total`);
      
      return {
        total: logs.total,
        logs: logs.documents.map(this.formatLog)
      };
    } catch (error) {
      logger.error(`Error getting all logs: ${error.message}`);
      // Return empty results instead of throwing
      return {
        total: 0,
        logs: []
      };
    }
  }
  
  /**
   * Count logs for a user
   * @param {string} userId - User ID
   * @returns {number} - Count of logs
   */
  async countUserLogs(userId) {
    try {
      logger.debug(`Counting logs for user: ${userId}`);
      
      const logs = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      logger.debug(`Found ${logs.total} logs for user ${userId}`);
      
      return logs.total;
    } catch (error) {
      logger.error(`Error counting user logs: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Format log data from Appwrite format
   * @param {Object} log - Log from Appwrite
   * @returns {Object} - Formatted log
   */
  formatLog(log) {
    try {
      return {
        id: log.$id,
        type: log.type,
        action: log.action,
        message: log.message,
        userId: log.userId,
        metadata: log.metadata ? JSON.parse(log.metadata) : {},
        ip: log.ip,
        createdAt: log.$createdAt // Use Appwrite's internal $createdAt field
      };
    } catch (error) {
      logger.error(`Error formatting log: ${error.message}`);
      // Return basic log if parsing fails
      return {
        id: log.$id,
        type: log.type,
        action: log.action,
        message: log.message,
        userId: log.userId,
        metadata: {},
        createdAt: log.$createdAt // Use Appwrite's internal $createdAt field
      };
    }
  }
}

module.exports = new LogService(); 