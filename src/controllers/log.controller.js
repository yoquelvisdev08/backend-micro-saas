const LogService = require('../services/log.service');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');

/**
 * @desc    Get logs for the current user
 * @route   GET /api/logs
 * @access  Private
 */
exports.getLogs = async (req, res) => {
  try {
    // Extract query parameters for filtering and pagination
    const { 
      type, 
      action, 
      page = 1, 
      limit = 50, 
      startDate, 
      endDate 
    } = req.query;
    
    // Build filters object
    const filters = {};
    
    if (type) filters.type = type;
    if (action) filters.action = action;
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    
    // Get logs with pagination
    const result = await LogService.getLogs(
      req.user.id,
      filters,
      parseInt(limit),
      parseInt(page)
    );
    
    // Log this activity
    LogService.createLog({
      type: 'system',
      action: 'view',
      message: 'User viewed their activity logs',
      userId: req.user.id,
      metadata: { filters, pagination: result.pagination }
    });
    
    sendSuccessResponse(res, 'Logs obtenidos exitosamente', result);
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error obteniendo logs', 500);
  }
};

/**
 * @desc    Get log statistics for the current user
 * @route   GET /api/logs/stats
 * @access  Private
 */
exports.getLogStats = async (req, res) => {
  try {
    const stats = await LogService.getLogStats(req.user.id);
    
    sendSuccessResponse(res, 'Estadísticas de logs obtenidas exitosamente', { stats });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error obteniendo estadísticas de logs', 500);
  }
}; 