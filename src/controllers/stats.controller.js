const mongoose = require('mongoose');
const Site = require('../models/site.model');
const Log = require('../models/log.model');
const User = require('../models/user.model');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const LogService = require('../services/log.service');

/**
 * @desc    Get statistics for the current user
 * @route   GET /api/stats
 * @access  Private
 */
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Execute multiple queries in parallel for better performance
    const [
      sitesCount,
      logsCount,
      lastLogin,
      lastWeekActivity
    ] = await Promise.all([
      // Count total sites for the user
      Site.countDocuments({ userId }),
      
      // Count total logs for the user
      Log.countDocuments({ userId }),
      
      // Get the last login timestamp
      Log.findOne({ 
        userId, 
        type: 'auth', 
        action: 'login' 
      }).sort({ createdAt: -1 }).select('createdAt'),
      
      // Get activity counts by day for the last 7 days
      getLastWeekActivity(userId)
    ]);

    // Format the statistics
    const stats = {
      sites: {
        total: sitesCount
      },
      logs: {
        total: logsCount
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
      userId: req.user.id
    });

    sendSuccessResponse(res, 'Estadísticas obtenidas exitosamente', { stats });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error obteniendo estadísticas', 500);
  }
};

/**
 * Get activity counts by day for the last 7 days
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - Activity by day
 */
const getLastWeekActivity = async (userId) => {
  // Get date 7 days ago
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  // MongoDB aggregation to get counts by day and action
  const result = await Log.aggregate([
    { 
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: lastWeek }
      }
    },
    {
      $group: {
        _id: {
          date: { 
            $dateToString: { 
              format: '%Y-%m-%d', 
              date: '$createdAt' 
            } 
          },
          type: '$type',
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

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
  result.forEach(item => {
    const { date, type, action } = item._id;
    const count = item.count;
    
    if (!activityByDay[date]) {
      activityByDay[date] = {
        total: 0,
        actions: {}
      };
    }
    
    // Increment total for the day
    activityByDay[date].total += count;
    
    // Add or increment action count
    const actionKey = `${type}:${action}`;
    if (!activityByDay[date].actions[actionKey]) {
      activityByDay[date].actions[actionKey] = 0;
    }
    activityByDay[date].actions[actionKey] += count;
  });
  
  // Convert to array sorted by date
  return Object.entries(activityByDay)
    .map(([date, data]) => ({
      date,
      ...data
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * @desc    Get activity distribution for the current user
 * @route   GET /api/stats/activity
 * @access  Private
 */
exports.getActivityDistribution = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get activity distribution by type and action
    const distribution = await Log.aggregate([
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
      },
      { $sort: { total: -1 } }
    ]);
    
    sendSuccessResponse(res, 'Distribución de actividad obtenida exitosamente', { distribution });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error obteniendo distribución de actividad', 500);
  }
}; 