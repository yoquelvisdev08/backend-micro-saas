const { databases, DATABASE_ID, USERS_COLLECTION_ID, LOGS_COLLECTION_ID, SITES_COLLECTION_ID, Query } = require('../config/appwrite');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const statsService = {
  /**
   * Get statistics for a specific user
   * @param {string} userId - The ID of the user
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      
      logger.debug(`Getting user stats for ${userId}`);

      // Check if user exists
      const userDoc = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId
      ).catch(() => null);
      
      if (!userDoc) {
        throw new AppError('User not found', 404);
      }

      // Get site count
      const sitesResponse = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      // Get logs
      const logsResponse = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );
      
      // Get activity by types
      const activityByType = {};
      logsResponse.documents.forEach(log => {
        if (!activityByType[log.type]) {
          activityByType[log.type] = 0;
        }
        activityByType[log.type]++;
      });
      
      // Get recent activity
      const recentActivity = logsResponse.documents.slice(0, 10);

      return {
        user: {
          id: userDoc.$id,
          name: userDoc.name,
          email: userDoc.email,
          joinedAt: userDoc.$createdAt
        },
        stats: {
          siteCount: sitesResponse.total,
          logCount: logsResponse.total,
          activityByType
        },
        recentActivity: recentActivity.map(log => ({
          id: log.$id,
          type: log.type,
          action: log.action,
          message: log.message,
          timestamp: log.$createdAt
        }))
      };
    } catch (error) {
      logger.error(`Error getting user stats: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get platform-wide statistics for admin users
   * @returns {Promise<Object>} Admin statistics
   */
  async getAdminStats() {
    try {
      logger.debug('Getting admin stats');
      
      // Get total users count
      const usersResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      // Get new users in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsersResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [
          Query.greaterThanEqual('$createdAt', thirtyDaysAgo.toISOString()),
          Query.limit(1)
        ]
      );
      
      // Get total sites and logs
      const sitesResponse = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      const logsResponse = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      // Get content created in last 30 days
      const newSitesResponse = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [
          Query.greaterThanEqual('$createdAt', thirtyDaysAgo.toISOString()),
          Query.limit(1)
        ]
      );
      
      const newLogsResponse = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        [
          Query.greaterThanEqual('$createdAt', thirtyDaysAgo.toISOString()),
          Query.limit(1)
        ]
      );
      
      // Get most active users (limited functionality due to Appwrite limitations)
      // We need to get all logs and process them in memory
      const allLogsResponse = await databases.listDocuments(
        DATABASE_ID,
        LOGS_COLLECTION_ID,
        [Query.limit(1000)]
      );
      
      const userActivityMap = {};
      allLogsResponse.documents.forEach(log => {
        if (!userActivityMap[log.userId]) {
          userActivityMap[log.userId] = {
            userId: log.userId,
            activityCount: 0
          };
        }
        userActivityMap[log.userId].activityCount++;
      });
      
      // Convert to array and sort
      const mostActiveUsers = Object.values(userActivityMap)
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10);
      
      // Get user details for most active users
      const activeUsersWithDetails = await Promise.all(
        mostActiveUsers.map(async (user) => {
          try {
            const userDoc = await databases.getDocument(
              DATABASE_ID,
              USERS_COLLECTION_ID,
              user.userId
            );
            
            return {
              id: userDoc.$id,
              name: userDoc.name,
              email: userDoc.email,
              activityCount: user.activityCount
            };
          } catch (error) {
            // User may have been deleted
            logger.warn(`Could not get user details for ${user.userId}: ${error.message}`);
            return {
              id: user.userId,
              name: 'Unknown User',
              email: 'deleted@example.com',
              activityCount: user.activityCount
            };
          }
        })
      );

      return {
        userStats: {
          totalUsers: usersResponse.total,
          newUsers: newUsersResponse.total,
          mostActiveUsers: activeUsersWithDetails
        },
        contentStats: {
          totalSites: sitesResponse.total,
          totalLogs: logsResponse.total,
          newSites: newSitesResponse.total,
          newLogs: newLogsResponse.total
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Error getting admin stats: ${error.message}`);
      throw new AppError('Error fetching admin statistics', 500);
    }
  }
};

module.exports = statsService; 