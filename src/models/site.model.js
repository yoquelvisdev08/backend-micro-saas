const { databases, DATABASE_ID, SITES_COLLECTION_ID, ID, Query } = require('../config/appwrite');

/**
 * Site model - Defines interface for site data management using Appwrite
 */
const SiteModel = {
  /**
   * Create a new site
   * @param {Object} siteData - Site data to create
   * @returns {Promise<Object>} Created site
   */
  async create(siteData) {
    try {
      // Validaciones básicas
      if (!siteData.name) {
        throw new Error('Por favor proporciona un nombre de sitio');
      }
      
      if (!siteData.url) {
        throw new Error('Por favor proporciona una URL');
      }
      
      if (!siteData.userId) {
        throw new Error('UserId es requerido');
      }
      
      // Verificar si ya existe un sitio con la misma URL para este usuario
      const existingSites = await databases.listDocuments(
        DATABASE_ID, 
        SITES_COLLECTION_ID,
        [
          Query.equal('url', siteData.url),
          Query.equal('userId', siteData.userId)
        ]
      );
      
      if (existingSites.total > 0) {
        throw new Error('Ya existe un sitio con esta URL para este usuario');
      }
      
      // Crear nuevo sitio
      const newSite = await databases.createDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        ID.unique(),
        {
          name: siteData.name,
          url: siteData.url,
          userId: siteData.userId,
          status: siteData.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      
      return newSite;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Find site by ID
   * @param {string} id - Site ID
   * @returns {Promise<Object>} Site document
   */
  async findById(id) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        id
      );
    } catch (error) {
      return null;
    }
  },
  
  /**
   * Find sites by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of sites
   */
  async findByUserId(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      return response.documents;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Update a site
   * @param {string} id - Site ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated site
   */
  async update(id, updateData) {
    try {
      // Ensure we're not modifying createdAt
      const { createdAt, ...updates } = updateData;
      
      // Always update the updatedAt timestamp
      updates.updatedAt = new Date().toISOString();
      
      return await databases.updateDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        id,
        updates
      );
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Delete a site
   * @param {string} id - Site ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        id
      );
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Count documents based on query
   * @param {Object} query - Query object (simplified compared to Mongoose)
   * @returns {Promise<number>} Count of matching documents
   */
  async countDocuments(query = {}) {
    try {
      const queryParams = [];
      
      // Convert simple query object to Appwrite query format
      Object.entries(query).forEach(([key, value]) => {
        queryParams.push(Query.equal(key, value));
      });
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        queryParams
      );
      
      return response.total;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = SiteModel; 