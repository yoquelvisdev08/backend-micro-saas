const logService = require('../services/log.service');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const logger = require('../utils/logger');

/**
 * @desc    Get logs for current user
 * @route   GET /api/logs
 * @access  Private
 */
exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, action } = req.query;
    
    // Prepare options for log query
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      type,
      action
    };
    
    // Get logs
    const result = await logService.getUserLogs(req.user.id, options);
    
    // Create response with pagination
    const response = {
      logs: result.logs,
      pagination: {
        total: result.total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(result.total / options.limit)
      }
    };
    
    sendSuccessResponse(res, 'Logs retrieved successfully', response);
  } catch (error) {
    logger.error('Error retrieving logs:', error);
    sendErrorResponse(res, 'Error retrieving logs', 500);
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
    const stats = await logService.getLogStats(req.user.id);
    
    sendSuccessResponse(res, 'Estadísticas de logs obtenidas exitosamente', { stats });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error obteniendo estadísticas de logs', 500);
  }
}; 