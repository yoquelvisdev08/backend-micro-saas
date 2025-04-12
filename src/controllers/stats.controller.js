const { databases, DATABASE_ID, LOGS_COLLECTION_ID, SITES_COLLECTION_ID, Query, ID } = require('../config/appwrite');
const LogService = require('../services/log.service');
const statsService = require('../services/stats.service');
const { catchAsync } = require('../utils/errorHandler');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const logger = require('../utils/logger');

/**
 * Get activity counts by day for the last 7 days using Appwrite
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - Activity by day
 */
const getLastWeekActivity = async (userId) => {
  // Get date 7 days ago
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  logger.debug(`Getting activity since ${lastWeek.toISOString()} for user ${userId}`);
  
  // Get logs from the last 7 days
  const logsResponse = await databases.listDocuments(
    DATABASE_ID,
    LOGS_COLLECTION_ID,
    [
      Query.equal('userId', userId),
      Query.greaterThanEqual('createdAt', lastWeek.toISOString()),
      Query.limit(500) // Increase limit to ensure we get enough data
    ]
  );
  
  const logs = logsResponse.documents;
  logger.debug(`Found ${logs.length} activity logs for user ${userId}`);
  
  // Process the results to get a structured format
  const activityByDay = {};
  
  // Initialize the structure with all dates in the last week
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    activityByDay[dateStr] = {
      total: 0,
      actions: {}
    };
  }
  
  // Fill with actual data
  logs.forEach(log => {
    const date = new Date(log.createdAt).toISOString().split('T')[0];
    const { type, action } = log;
    
    if (!activityByDay[date]) {
      activityByDay[date] = {
        total: 0,
        actions: {}
      };
    }
    
    // Increment total for the day
    activityByDay[date].total += 1;
    
    // Add or increment action count
    const actionKey = `${type}:${action}`;
    if (!activityByDay[date].actions[actionKey]) {
      activityByDay[date].actions[actionKey] = 0;
    }
    activityByDay[date].actions[actionKey] += 1;
  });
  
  // Convert to array sorted by date
  return Object.entries(activityByDay)
    .map(([date, data]) => ({
      date,
      ...data
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Objeto con todas las funciones del controlador
const statsController = {
  /**
   * Get statistics for the current user
   * @route GET /api/stats
   * @access Private
   */
  getStats: async (req, res) => {
    try {
      const userId = req.user.id;
      logger.debug(`Getting statistics for user ${userId}`);

      // Execute multiple queries in parallel for better performance
      const [sitesCount, logsData, lastWeekActivity] = await Promise.all([
        // Count total sites for the user
        databases.listDocuments(
          DATABASE_ID,
          SITES_COLLECTION_ID,
          [Query.equal('userId', userId)]
        ).then(response => response.total),
        
        // Get logs for the user to count and find last login
        databases.listDocuments(
          DATABASE_ID,
          LOGS_COLLECTION_ID,
          [
            Query.equal('userId', userId),
            Query.orderDesc('createdAt'),
            Query.limit(100)
          ]
        ),
        
        // Get activity counts by day for the last 7 days
        getLastWeekActivity(userId)
      ]);

      // Find the last login from logs
      const lastLogin = logsData.documents.find(log => 
        log.type === 'auth' && log.action === 'login'
      );

      // Format the statistics
      const stats = {
        sites: {
          total: sitesCount
        },
        logs: {
          total: logsData.total
        },
        user: {
          lastLogin: lastLogin ? lastLogin.createdAt : null
        },
        activity: {
          lastWeek: lastWeekActivity
        }
      };

      // Log this activity
      LogService.createLog({
        type: 'system',
        action: 'view',
        message: 'User viewed their statistics',
        userId: req.user.id,
        createdAt: new Date().toISOString()
      }).catch(err => {
        logger.error('Error logging statistics view:', err);
      });

      sendSuccessResponse(res, 'Estadísticas obtenidas exitosamente', { stats });
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      sendErrorResponse(res, 'Error obteniendo estadísticas', 500);
    }
  },

  /**
   * Get activity distribution for the current user
   * @route GET /api/stats/activity
   * @access Private
   */
  getActivityDistribution: async (req, res) => {
    try {
      const userId = req.user.id;
      logger.debug(`Getting activity distribution for user ${userId}`);
      
      // Get all logs for the user
      const logsResponse = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.limit(500) // Increase limit to get enough data for analysis
        ]
      );
      
      const logs = logsResponse.documents;
      logger.debug(`Found ${logs.length} logs for activity distribution`);
      
      // Process logs to get activity distribution
      const typeActionCount = {};
      
      logs.forEach(log => {
        const { type, action } = log;
        
        if (!typeActionCount[type]) {
          typeActionCount[type] = {
            actions: {},
            total: 0
          };
        }
        
        if (!typeActionCount[type].actions[action]) {
          typeActionCount[type].actions[action] = 0;
        }
        
        typeActionCount[type].actions[action] += 1;
        typeActionCount[type].total += 1;
      });
      
      // Convert to array format
      const distribution = Object.entries(typeActionCount).map(([type, data]) => {
        return {
          _id: type,
          actions: Object.entries(data.actions).map(([action, count]) => ({ action, count })),
          total: data.total
        };
      }).sort((a, b) => b.total - a.total);
      
      // Log this activity
      LogService.createLog({
        type: 'system',
        action: 'view',
        message: 'User viewed activity distribution',
        userId: req.user.id,
        createdAt: new Date().toISOString()
      }).catch(err => {
        logger.error('Error logging activity distribution view:', err);
      });
      
      sendSuccessResponse(res, 'Distribución de actividad obtenida exitosamente', { distribution });
    } catch (error) {
      logger.error('Error obteniendo distribución de actividad:', error);
      sendErrorResponse(res, 'Error obteniendo distribución de actividad', 500);
    }
  },

  /**
   * Get statistics for the authenticated user
   * @route GET /api/stats/user
   * @access Private - Authenticated users only
   */
  getUserStats: catchAsync(async (req, res) => {
    // Get stats for the authenticated user (from req.user.id)
    const stats = await statsService.getUserStats(req.user.id);
    
    // Log this activity
    LogService.createLog({
      type: 'user',
      action: 'view',
      message: 'User viewed personal statistics',
      userId: req.user.id,
      createdAt: new Date().toISOString()
    }).catch(err => {
      logger.error('Error logging user stats view:', err);
    });
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  }),

  /**
   * Get statistics for a specific user (admin only)
   * @route GET /api/stats/user/:userId
   * @access Private - Admin only
   */
  getUserStatsById: catchAsync(async (req, res) => {
    const { userId } = req.params;
    const stats = await statsService.getUserStats(userId);
    
    // Log this admin activity
    LogService.createLog({
      type: 'admin',
      action: 'view',
      message: `Admin viewed user statistics for user ${userId}`,
      userId: req.user.id,
      createdAt: new Date().toISOString()
    }).catch(err => {
      logger.error('Error logging admin user stats view:', err);
    });
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  }),

  /**
   * Get platform-wide statistics
   * @route GET /api/stats/admin
   * @access Private - Admin only
   */
  getAdminStats: catchAsync(async (req, res) => {
    const stats = await statsService.getAdminStats();
    
    // Log this admin activity
    LogService.createLog({
      type: 'admin',
      action: 'view',
      message: 'Admin viewed platform statistics',
      userId: req.user.id,
      createdAt: new Date().toISOString()
    }).catch(err => {
      logger.error('Error logging admin stats view:', err);
    });
    
    res.status(200).json({
      status: 'success',
      data: stats
    });
  })
};

// Exportamos el objeto del controlador
module.exports = statsController; 