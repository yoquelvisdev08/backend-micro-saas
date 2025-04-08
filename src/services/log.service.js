const mongoose = require('mongoose');
const Log = require('../models/log.model');
const WebhookService = require('./webhook.service');

/**
 * Service to register activity logs in the system
 */
class LogService {
  /**
   * Create a new log entry
   * @param {Object} logData - Log data
   * @param {String} logData.type - Type of log (auth, site, system, error)
   * @param {String} logData.action - Action performed (login, register, create, update, delete, etc)
   * @param {String} logData.message - Log message
   * @param {String} logData.userId - User ID associated with the log
   * @param {Object} logData.metadata - Additional metadata (optional)
   * @param {String} logData.ip - IP address (optional)
   * @param {Boolean} logData.sendWebhook - Whether to send webhook notification (default: true)
   * @returns {Promise<Object>} - Created log
   */
  static async createLog(logData) {
    try {
      // Extract webhook flag and default to true if not specified
      const { sendWebhook = true, ...logEntryData } = logData;
      
      // Create the log entry
      const log = await Log.create(logEntryData);
      
      // Check if a webhook notification should be sent
      if (sendWebhook && logEntryData.userId) {
        // Send webhook notification asynchronously
        // We don't await the result to avoid blocking the main flow
        this.sendLogWebhook(logEntryData.userId, log).catch(err => {
          // Just log webhook errors, don't throw
          console.error('Webhook notification error:', err.message);
        });
      }
      
      return log;
    } catch (error) {
      console.error('Error creating log:', error);
      // Even if logging fails, we don't want to break the main application flow
      return null;
    }
  }

  /**
   * Send log data to user's webhook if configured
   * @param {String} userId - User ID
   * @param {Object} log - Log data
   * @returns {Promise<Object>} - Webhook response
   */
  static async sendLogWebhook(userId, log) {
    // Prepare data payload for webhook
    const webhookData = {
      event: 'log_created',
      log: {
        id: log._id,
        type: log.type,
        action: log.action,
        message: log.message,
        timestamp: log.createdAt || new Date(),
        metadata: log.metadata || {}
      }
    };
    
    // Send webhook notification
    return WebhookService.sendWebhook(userId, webhookData);
  }

  /**
   * Get logs for a specific user
   * @param {String} userId - User ID
   * @param {Object} filters - Optional filters
   * @param {Number} limit - Number of logs to return (default: 50)
   * @param {Number} page - Page number for pagination (default: 1)
   * @returns {Promise<Object>} - Logs with pagination info
   */
  static async getLogs(userId, filters = {}, limit = 50, page = 1) {
    try {
      const query = { userId, ...filters };
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        Log.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Log.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting logs:', error);
      throw error;
    }
  }

  /**
   * Get logs statistics for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Log statistics
   */
  static async getLogStats(userId) {
    try {
      const stats = await Log.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { 
          $group: { 
            _id: { type: '$type', action: '$action' },
            count: { $sum: 1 }
          } 
        },
        {
          $group: {
            _id: '$_id.type',
            actions: { 
              $push: { 
                action: '$_id.action', 
                count: '$count' 
              } 
            },
            total: { $sum: '$count' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting log statistics:', error);
      throw error;
    }
  }
}

module.exports = LogService; 