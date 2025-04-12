const { databases, DATABASE_ID, SITES_COLLECTION_ID, Query, ID } = require('../config/appwrite');
const logger = require('../utils/logger');

/**
 * Site Service - Handles all site operations with Appwrite
 */
class SiteService {
  /**
   * Create a new site
   * @param {string} name - Site name
   * @param {string} url - Site URL
   * @param {string} userId - User ID who owns the site
   * @returns {Object} - Created site
   */
  async createSite(name, url, userId) {
    try {
      const site = await databases.createDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        ID.unique(),
        {
          name,
          url,
          userId,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      
      return this.formatSite(site);
    } catch (error) {
      logger.error('Error creating site:', error);
      throw error;
    }
  }
  
  /**
   * Get all sites for a user
   * @param {string} userId - User ID
   * @returns {Array} - List of sites
   */
  async getUserSites(userId) {
    try {
      const sites = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      return sites.documents.map(this.formatSite);
    } catch (error) {
      logger.error('Error getting user sites:', error);
      throw error;
    }
  }
  
  /**
   * Get site by ID
   * @param {string} siteId - Site ID
   * @returns {Object} - Site details
   */
  async getSiteById(siteId) {
    try {
      const site = await databases.getDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        siteId
      );
      
      return this.formatSite(site);
    } catch (error) {
      logger.error(`Error getting site ${siteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a site
   * @param {string} siteId - Site ID
   * @param {Object} updateData - Data to update
   * @returns {Object} - Updated site
   */
  async updateSite(siteId, updateData) {
    try {
      // First get existing site to merge with updateData
      const existingSite = await databases.getDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        siteId
      );
      
      const updatedSite = await databases.updateDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        siteId,
        {
          ...updateData,
          updatedAt: new Date().toISOString()
        }
      );
      
      return this.formatSite(updatedSite);
    } catch (error) {
      logger.error(`Error updating site ${siteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a site
   * @param {string} siteId - Site ID
   * @returns {boolean} - Success status
   */
  async deleteSite(siteId) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        siteId
      );
      
      return true;
    } catch (error) {
      logger.error(`Error deleting site ${siteId}:`, error);
      throw error;
    }
  }
  
  /**
   * Count total sites for a user
   * @param {string} userId - User ID
   * @returns {number} - Count of sites
   */
  async countUserSites(userId) {
    try {
      const sites = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      return sites.total;
    } catch (error) {
      logger.error('Error counting user sites:', error);
      throw error;
    }
  }
  
  /**
   * Format site data from Appwrite format
   * @param {Object} site - Site from Appwrite
   * @returns {Object} - Formatted site
   */
  formatSite(site) {
    return {
      id: site.$id,
      name: site.name,
      url: site.url,
      userId: site.userId,
      status: site.status,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt
    };
  }
}

module.exports = new SiteService(); 