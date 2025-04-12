const logService = require('../services/log.service');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * @desc    Get logs for current user with advanced filtering and pagination
 * @route   GET /api/logs
 * @access  Private
 */
exports.getLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type,
      action,
      startDate,
      endDate,
      siteId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      format,
      severity,
      tags,
      detailed = false
    } = req.query;
    
    // Generate request ID for tracing
    const requestId = crypto.randomBytes(16).toString('hex');
    
    // Validate input parameters
    const validatedPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const validatedLimit = parseInt(limit, 10) > 0 && parseInt(limit, 10) <= 100 ? parseInt(limit, 10) : 10;
    
    // Parse tags if provided
    const parsedTags = tags ? tags.split(',') : undefined;
    
    // Prepare options for log query
    const options = {
      page: validatedPage,
      limit: validatedLimit,
      type,
      action,
      startDate,
      endDate,
      siteId,
      status,
      search,
      sortBy,
      sortOrder,
      severity,
      tags: parsedTags,
      detailed: detailed === 'true' || detailed === true
    };
    
    // Add cache header with short TTL for frequently updated data
    res.set('Cache-Control', 'private, max-age=60');
    
    // Track request start time for performance monitoring
    const startTime = Date.now();
    
    // Get logs with pagination and summary
    const result = await logService.getUserLogs(req.user.id, options);
    
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Check for anomalies in the results
    const anomalies = await detectAnomalies(result.logs);
    if (anomalies.length > 0) {
      result.anomalies = anomalies;
    }
    
    // Check if export format is requested
    if (format) {
      let exportData;
      let contentType;
      let filename;
      
      if (format.toLowerCase() === 'json') {
        exportData = logService.exportToJSON(result.logs);
        contentType = 'application/json';
        filename = `logs_export_${Date.now()}.json`;
      } else if (format.toLowerCase() === 'csv') {
        exportData = logService.exportToCSV(result.logs);
        contentType = 'text/csv';
        filename = `logs_export_${Date.now()}.csv`;
      } else {
        return sendErrorResponse(res, 'Unsupported export format. Use "json" or "csv".', 400);
      }
      
      // Log this export action
      await logService.createLog({
        type: 'system',
        action: 'export',
        message: `User exported logs in ${format} format`,
        userId: req.user.id,
        metadata: { 
          format, 
          filters: options,
          count: result.logs.length
        },
        requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        duration
      });
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(exportData);
    }
    
    // Create standard response
    const response = {
      success: true,
      message: 'Logs retrieved successfully',
      data: {
        logs: result.logs,
        pagination: result.pagination,
        summary: result.summary,
        anomalies: result.anomalies || []
      }
    };
    
    // Log the view action with detailed metadata
    await logService.createLog({
      type: 'system',
      action: 'view',
      message: `User viewed logs with ${result.logs.length} results`,
      userId: req.user.id,
      metadata: { 
        filters: options,
        resultCount: result.logs.length,
        page: validatedPage,
        limit: validatedLimit
      },
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      duration
    });
    
    sendSuccessResponse(res, 'Logs retrieved successfully', response.data);
  } catch (error) {
    logger.error('Error retrieving logs:', error);
    
    // Log the error
    await logService.createLog({
      type: 'error',
      action: 'view',
      message: `Error retrieving logs: ${error.message}`,
      userId: req.user.id,
      status: 'error',
      details: {
        error: {
          message: error.message,
          stack: error.stack
        }
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    sendErrorResponse(res, 'Error retrieving logs: ' + error.message, 500);
  }
};

/**
 * Detect anomalies in logs
 * @param {Array} logs - Array of logs
 * @returns {Array} - Detected anomalies
 */
async function detectAnomalies(logs) {
  const anomalies = [];
  
  try {
    // 1. Check for unusual error rates
    const errorLogs = logs.filter(log => log.status === 'error');
    const errorRate = logs.length > 0 ? (errorLogs.length / logs.length) * 100 : 0;
    
    if (errorRate > 20) {
      anomalies.push({
        type: 'high_error_rate',
        message: `High error rate detected: ${errorRate.toFixed(2)}%`,
        severity: 'medium',
        details: {
          errorRate,
          threshold: 20,
          errorCount: errorLogs.length,
          totalCount: logs.length
        }
      });
    }
    
    // 2. Check for repeated errors of the same type
    const errorTypes = {};
    errorLogs.forEach(log => {
      const errorKey = `${log.type}:${log.action}`;
      errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([errorKey, count]) => {
      if (count >= 3) {
        anomalies.push({
          type: 'repeated_error',
          message: `Multiple occurrences of error type: ${errorKey}`,
          severity: 'high',
          details: {
            errorType: errorKey,
            count,
            threshold: 3
          }
        });
      }
    });
    
    // 3. Check for slow operations
    const slowLogs = logs.filter(log => log.duration > 2000);
    if (slowLogs.length > 0) {
      anomalies.push({
        type: 'slow_operations',
        message: `${slowLogs.length} operations have high latency (>2000ms)`,
        severity: 'medium',
        details: {
          count: slowLogs.length,
          operations: slowLogs.map(log => ({
            id: log.id,
            type: log.type,
            action: log.action,
            duration: log.duration
          })).slice(0, 5) // Limit to first 5
        }
      });
    }
    
    return anomalies;
  } catch (error) {
    logger.error('Error detecting anomalies:', error);
    return [];
  }
}

/**
 * @desc    Get logs for all users (admin only)
 * @route   GET /api/logs/admin
 * @access  Private (Admin)
 */
exports.getAllLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type,
      action,
      startDate,
      endDate,
      siteId,
      userId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      format,
      severity,
      tags,
      detailed = false
    } = req.query;
    
    // Generate request ID for tracing
    const requestId = crypto.randomBytes(16).toString('hex');
    
    // Validate input parameters
    const validatedPage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const validatedLimit = parseInt(limit, 10) > 0 && parseInt(limit, 10) <= 100 ? parseInt(limit, 10) : 10;
    
    // Parse tags if provided
    const parsedTags = tags ? tags.split(',') : undefined;
    
    // Prepare options for log query
    const options = {
      page: validatedPage,
      limit: validatedLimit,
      type,
      action,
      startDate,
      endDate,
      siteId,
      userId,
      status,
      search,
      sortBy,
      sortOrder,
      severity,
      tags: parsedTags,
      detailed: detailed === 'true' || detailed === true
    };
    
    // Add cache header with short TTL for frequently updated data
    res.set('Cache-Control', 'private, max-age=60');
    
    // Track request start time for performance monitoring
    const startTime = Date.now();
    
    // Get logs with pagination and summary
    const result = await logService.getAllLogs(options);
    
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Check for anomalies in the results
    const anomalies = await detectAnomalies(result.logs);
    if (anomalies.length > 0) {
      result.anomalies = anomalies;
    }
    
    // Check if export format is requested
    if (format) {
      let exportData;
      let contentType;
      let filename;
      
      if (format.toLowerCase() === 'json') {
        exportData = logService.exportToJSON(result.logs);
        contentType = 'application/json';
        filename = `all_logs_export_${Date.now()}.json`;
      } else if (format.toLowerCase() === 'csv') {
        exportData = logService.exportToCSV(result.logs);
        contentType = 'text/csv';
        filename = `all_logs_export_${Date.now()}.csv`;
      } else {
        return sendErrorResponse(res, 'Unsupported export format. Use "json" or "csv".', 400);
      }
      
      // Log this admin export action
      await logService.createLog({
        type: 'admin',
        action: 'export',
        message: `Admin exported all logs in ${format} format`,
        userId: req.user.id,
        metadata: { 
          format, 
          filters: options,
          count: result.logs.length
        },
        requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        duration
      });
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(exportData);
    }
    
    // Create standard response
    const response = {
      success: true,
      message: 'All logs retrieved successfully',
      data: {
        logs: result.logs,
        pagination: result.pagination,
        summary: result.summary,
        anomalies: result.anomalies || []
      }
    };
    
    // Log the admin view action
    await logService.createLog({
      type: 'admin',
      action: 'view',
      message: `Admin viewed all logs with ${result.logs.length} results`,
      userId: req.user.id,
      metadata: { 
        filters: options,
        resultCount: result.logs.length,
        page: validatedPage,
        limit: validatedLimit
      },
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      duration
    });
    
    sendSuccessResponse(res, 'All logs retrieved successfully', response.data);
  } catch (error) {
    logger.error('Error retrieving all logs:', error);
    
    // Log the error
    await logService.createLog({
      type: 'error',
      action: 'admin',
      message: `Error retrieving all logs: ${error.message}`,
      userId: req.user.id,
      status: 'error',
      details: {
        error: {
          message: error.message,
          stack: error.stack
        }
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    sendErrorResponse(res, 'Error retrieving all logs: ' + error.message, 500);
  }
};

/**
 * @desc    Create a log (internal use only)
 * @access  Private
 */
exports.createLog = async (logData) => {
  try {
    return await logService.createLog(logData);
  } catch (error) {
    logger.error('Error creating log:', error);
    return null;
  }
};

/**
 * @desc    Get log statistics for the current user
 * @route   GET /api/logs/stats
 * @access  Private
 */
exports.getLogStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const stats = await logService.getLogStats(req.user.id, { period });
    
    sendSuccessResponse(res, 'Estadísticas de logs obtenidas exitosamente', { stats });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de logs:', error);
    sendErrorResponse(res, 'Error obteniendo estadísticas de logs: ' + error.message, 500);
  }
};

/**
 * @desc    Export logs in CSV or JSON format
 * @route   GET /api/logs/export
 * @access  Private
 */
exports.exportLogs = async (req, res) => {
  try {
    const { 
      format = 'json', 
      type,
      action,
      startDate,
      endDate,
      siteId,
      status
    } = req.query;
    
    // Prepare options for log query - no pagination for export
    const options = {
      page: 1,
      limit: 1000, // Use a higher limit for exports
      type,
      action,
      startDate,
      endDate,
      siteId,
      status,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    
    // Get logs without pagination
    const result = await logService.getUserLogs(req.user.id, options);
    
    let exportData;
    let contentType;
    let filename;
    
    if (format.toLowerCase() === 'json') {
      exportData = logService.exportToJSON(result.logs);
      contentType = 'application/json';
      filename = `logs_export_${Date.now()}.json`;
    } else if (format.toLowerCase() === 'csv') {
      exportData = logService.exportToCSV(result.logs);
      contentType = 'text/csv';
      filename = `logs_export_${Date.now()}.csv`;
    } else {
      return sendErrorResponse(res, 'Unsupported export format. Use "json" or "csv".', 400);
    }
    
    // Log this export action
    await logService.createLog({
      type: 'system',
      action: 'export',
      message: `User exported logs in ${format} format`,
      userId: req.user.id,
      metadata: { format, filters: options }
    });
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(exportData);
  } catch (error) {
    logger.error('Error exporting logs:', error);
    sendErrorResponse(res, 'Error exporting logs: ' + error.message, 500);
  }
}; 