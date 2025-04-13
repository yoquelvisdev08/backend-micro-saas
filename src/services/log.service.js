const { databases, DATABASE_ID, LOGS_COLLECTION_ID, Query, ID } = require('../config/appwrite');
const logger = require('../utils/logger');
const siteService = require('./site.service');
const os = require('os');

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
      
      // Solo incluir campos básicos que sabemos existen en Appwrite
      // Cualquier campo adicional será ignorado para evitar errores de estructura
      const logDocument = {
        type,
        action,
        message: message || `${type}:${action}`,
        userId,
        createdAt: new Date().toISOString()
      };
      
      // Manejar metadata de forma segura (solo si existe el campo en Appwrite)
      if (metadata && Object.keys(metadata).length > 0) {
        try {
          logDocument.metadata = typeof metadata === 'object' ? 
            JSON.stringify(metadata) : String(metadata);
        } catch (error) {
          logger.warn(`Error al procesar metadata, ignorando: ${error.message}`);
          // No incluir metadata si hay error
        }
      }
      
      // Solo añadir IP si se proporciona y existe en Appwrite
      if (ip) {
        logDocument.ip = ip;
      }
      
      logger.debug(`Creating log entry: ${type}:${action} for user ${userId}`);
      logger.debug(`Log document: ${JSON.stringify(logDocument)}`);
      
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
      // Crear un objeto base con campos que sabemos que existen
      const formattedLog = {
        id: log.$id,
        createdAt: log.$createdAt // Usar el campo interno de Appwrite
      };
      
      // Añadir solo los campos que existen en el documento
      if (log.type) formattedLog.type = log.type;
      if (log.action) formattedLog.action = log.action;
      if (log.message) formattedLog.message = log.message;
      if (log.userId) formattedLog.userId = log.userId;
      
      // Procesar metadata solo si existe
      if (log.metadata) {
        try {
          formattedLog.metadata = JSON.parse(log.metadata);
        } catch (error) {
          formattedLog.metadata = {}; // Si hay error al parsear, usar objeto vacío
        }
      } else {
        formattedLog.metadata = {};
      }
      
      // Añadir IP solo si existe
      if (log.ip) formattedLog.ip = log.ip;
      
      return formattedLog;
    } catch (error) {
      logger.error(`Error formatting log: ${error.message}`);
      // Return basic log if parsing fails
      return {
        id: log.$id,
        createdAt: log.$createdAt
      };
    }
  }

  /**
   * Calculate severity based on log type, action and status
   * @param {string} type - Log type 
   * @param {string} action - Log action
   * @param {string} status - Log status
   * @returns {string} - Severity level (low, medium, high, critical)
   */
  calculateSeverity(type, action, status) {
    if (status === 'error') {
      return type === 'auth' ? 'high' : 'medium';
    }
    
    if (type === 'error') return 'high';
    if (type === 'security') return 'high';
    if (type === 'admin') return 'medium';
    if (type === 'auth' && action === 'login') return 'medium';
    if (type === 'system' && action === 'error') return 'high';
    
    return 'low';
  }
  
  /**
   * Get geolocation data from IP (mock implementation)
   * In a production environment, this would use a real geolocation API
   * @param {string} ip - IP address
   * @returns {Object} - Geolocation data
   */
  async getGeolocationData(ip) {
    // Mock implementation
    return {
      country: 'Unknown',
      city: 'Unknown',
      coordinates: [0, 0]
    };
  }
  
  /**
   * Get logs for a user with advanced filtering
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} - Logs and pagination data
   */
  async getUserLogsAdvanced(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        siteId,
        action,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        type
      } = options;
      
      const queries = [Query.equal('userId', userId)];
      
      // Add date range filters
      if (startDate) {
        queries.push(Query.greaterThanEqual('createdAt', new Date(startDate).toISOString()));
      }
      
      if (endDate) {
        queries.push(Query.lessThanEqual('createdAt', new Date(endDate).toISOString()));
      }
      
      // Add type filter if provided
      if (type) {
        queries.push(Query.equal('type', type));
      }
      
      // Add action filter if provided
      if (action) {
        queries.push(Query.equal('action', action));
      }
      
      // Add siteId filter if provided
      if (siteId) {
        queries.push(Query.equal('siteId', siteId));
      }
      
      // Add status filter if provided
      if (status) {
        queries.push(Query.equal('status', status));
      }
      
      // Add search in message
      if (search) {
        queries.push(Query.search('message', search));
      }
      
      // Add sort options
      if (sortOrder.toLowerCase() === 'asc') {
        queries.push(Query.orderAsc(sortBy));
      } else {
        queries.push(Query.orderDesc(sortBy));
      }
      
      logger.debug(`Fetching logs for user: ${userId} with options: ${JSON.stringify(options)}`);
      
      const logs = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        queries,
        limit,
        (page - 1) * limit
      );
      
      logger.debug(`Found ${logs.total} logs for user ${userId}`);
      
      // Generate summary statistics
      const summary = await this.generateLogsSummary(userId, logs.documents);
      
      // Calculate pagination
      const totalPages = Math.ceil(logs.total / limit);
      const pagination = {
        total: logs.total,
        totalPages,
        currentPage: parseInt(page, 10),
        limit: parseInt(limit, 10),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };

      return {
        logs: logs.documents.map(this.formatLog),
        pagination,
        summary
      };
    } catch (error) {
      logger.error(`Error getting user logs: ${error.message}`);
      // Return empty results instead of throwing
      return {
        logs: [],
        pagination: {
          total: 0,
          totalPages: 0,
          currentPage: parseInt(options.page || 1, 10),
          limit: parseInt(options.limit || 10, 10),
          hasNextPage: false,
          hasPrevPage: false
        },
        summary: this.getEmptySummary()
      };
    }
  }
  
  /**
   * Generate summary statistics from logs
   * @param {string} userId - User ID
   * @param {Array} logs - Array of log documents
   * @returns {Object} - Summary statistics
   */
  async generateLogsSummary(userId, logs) {
    try {
      // Calculate success and error rates
      const totalLogs = logs.length;
      const successLogs = logs.filter(log => log.status === 'success').length;
      const errorLogs = logs.filter(log => log.status === 'error').length;
      
      const successRate = totalLogs ? (successLogs / totalLogs) * 100 : 0;
      const errorRate = totalLogs ? (errorLogs / totalLogs) * 100 : 0;
      
      // Calculate average response time
      const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const avgResponseTime = totalLogs ? totalDuration / totalLogs : 0;
      
      // Count actions
      const actionCounts = {};
      logs.forEach(log => {
        if (!actionCounts[log.action]) {
          actionCounts[log.action] = 0;
        }
        actionCounts[log.action]++;
      });
      
      // Get most common actions
      const mostCommonActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Count sites
      const siteCounts = {};
      logs.forEach(log => {
        if (log.siteId && log.siteName) {
          if (!siteCounts[log.siteId]) {
            siteCounts[log.siteId] = {
              siteId: log.siteId,
              siteName: log.siteName,
              count: 0
            };
          }
          siteCounts[log.siteId].count++;
        }
      });
      
      // Get most affected sites
      const mostAffectedSites = Object.values(siteCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Count severity levels
      const severityDistribution = {
        low: logs.filter(log => log.severity === 'low').length,
        medium: logs.filter(log => log.severity === 'medium').length,
        high: logs.filter(log => log.severity === 'high').length,
        critical: logs.filter(log => log.severity === 'critical').length
      };
      
      return {
        totalLogs,
        successRate,
        errorRate,
        avgResponseTime,
        mostCommonActions,
        mostAffectedSites,
        severityDistribution
      };
    } catch (error) {
      logger.error(`Error generating logs summary: ${error.message}`);
      return this.getEmptySummary();
    }
  }

  /**
   * Get empty summary structure
   * @returns {Object} - Empty summary
   */
  getEmptySummary() {
    return {
      totalLogs: 0,
      successRate: 0,
      errorRate: 0,
      avgResponseTime: 0,
      mostCommonActions: [],
      mostAffectedSites: [],
      severityDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };
  }
  
  /**
   * Export logs to JSON format
   * @param {Array} logs - Array of logs
   * @returns {string} - JSON string
   */
  exportToJSON(logs) {
    return JSON.stringify(logs, null, 2);
  }
  
  /**
   * Export logs to CSV format
   * @param {Array} logs - Array of logs
   * @returns {string} - CSV string
   */
  exportToCSV(logs) {
    if (!logs || logs.length === 0) {
      return 'id,type,action,message,userId,siteId,siteName,status,severity,createdAt\n';
    }
    
    // Create CSV header row
    const header = Object.keys(logs[0]).join(',');
    
    // Create CSV data rows
    const rows = logs.map(log => {
      return Object.values(log)
        .map(value => {
          // Handle special cases and ensure proper CSV formatting
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',');
    });
    
    return [header, ...rows].join('\n');
  }
  
  /**
   * Sanitize a stack trace to remove sensitive information
   * @param {string} stack - The error stack trace
   * @returns {string} - Sanitized stack trace
   */
  sanitizeStackTrace(stack) {
    if (!stack) return null;
    
    // Remove absolute file paths to avoid leaking server information
    const sanitized = stack
      .split('\n')
      .map(line => {
        // Keep the error message and function names, but simplify file paths
        return line.replace(/\(\/.*\/([^\/]+:\d+:\d+)\)/g, '($1)');
      })
      .join('\n');
    
    return sanitized;
  }
  
  /**
   * Get memory usage information
   * @returns {Object} - Memory usage stats
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // RSS in MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // Heap total in MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // Heap used in MB
      external: Math.round(memUsage.external / 1024 / 1024) // External in MB
    };
  }
  
  /**
   * Get performance threshold for a specific type and action
   * @param {string} type - Log type
   * @param {string} action - Log action
   * @returns {number} - Threshold in milliseconds
   */
  getPerformanceThreshold(type, action) {
    // Default threshold: 1000ms (1 second)
    const defaultThreshold = 1000;
    
    // Specific thresholds for different operations
    const thresholds = {
      'auth:login': 2000,
      'auth:register': 3000,
      'site:create': 2500,
      'site:update': 2000,
      'site:delete': 1500,
      'site:check': 5000,
      'admin:': 3000
    };
    
    // Check for specific type:action combination
    const key = `${type}:${action}`;
    return thresholds[key] || defaultThreshold;
  }
  
  /**
   * Parse user agent string to extract device information
   * @param {string} userAgent - User agent string
   * @returns {Object} - Device information
   */
  parseUserAgent(userAgent) {
    if (!userAgent) return { type: 'unknown', browser: 'unknown', os: 'unknown' };
    
    try {
      // Simple device type detection
      let type = 'desktop';
      if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
        type = 'mobile';
      } else if (/tablet|ipad/i.test(userAgent)) {
        type = 'tablet';
      }
      
      // Simple browser detection
      let browser = 'unknown';
      if (/chrome/i.test(userAgent)) {
        browser = 'Chrome';
      } else if (/firefox/i.test(userAgent)) {
        browser = 'Firefox';
      } else if (/safari/i.test(userAgent)) {
        browser = 'Safari';
      } else if (/msie|trident/i.test(userAgent)) {
        browser = 'IE';
      } else if (/edge/i.test(userAgent)) {
        browser = 'Edge';
      }
      
      // Simple OS detection
      let os = 'unknown';
      if (/windows/i.test(userAgent)) {
        os = 'Windows';
      } else if (/macintosh|mac os/i.test(userAgent)) {
        os = 'MacOS';
      } else if (/linux/i.test(userAgent)) {
        os = 'Linux';
      } else if (/android/i.test(userAgent)) {
        os = 'Android';
      } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        os = 'iOS';
      }
      
      return { type, browser, os };
    } catch (error) {
      logger.warn(`Error parsing user agent: ${error.message}`);
      return { type: 'unknown', browser: 'unknown', os: 'unknown' };
    }
  }
}

module.exports = new LogService(); 