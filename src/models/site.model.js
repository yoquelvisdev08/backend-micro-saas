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
        throw new Error('El nombre del sitio es requerido');
      }
      
      if (!siteData.url) {
        throw new Error('La URL del sitio es requerida');
      }
      
      if (!siteData.userId) {
        throw new Error('El ID de usuario es requerido');
      }
      
      // Crear documento con campos para monitoreo
      const newSite = await databases.createDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        ID.unique(),
        {
          name: siteData.name,
          url: siteData.url,
          userId: siteData.userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Campos para monitoreo
          status: 'pending', // pending, active, paused, error
          lastChecked: null,
          lastAvailable: null,
          lastResponseTime: null,
          lastStatusCode: null,
          uptime: 100,
          averageResponseTime: 0,
          totalChecks: 0,
          successfulChecks: 0,
          monitorInterval: siteData.monitorInterval || 15, // minutos
          alertThreshold: siteData.alertThreshold || 1000, // ms para tiempo de respuesta
          checkSSL: siteData.checkSSL || true,
          checkKeywords: siteData.checkKeywords || [],
          monitorSettings: {
            checkResources: true,
            checkMobile: true,
            checkSEO: true,
            checkPerformance: true,
            resourceTypes: ['js', 'css', 'image', 'font', 'document']
          }
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
   * Update an existing site
   * @param {string} id - Site ID
   * @param {Object} siteData - Site data to update
   * @returns {Promise<Object>} Updated site
   */
  async update(id, siteData) {
    try {
      // Verificar si existe el sitio
      const site = await this.getById(id);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      const updateData = {
        updatedAt: new Date().toISOString()
      };
      
      // Sólo actualizar campos proporcionados
      if (siteData.name) updateData.name = siteData.name;
      if (siteData.url) updateData.url = siteData.url;
      
      // Campos de monitoreo que pueden actualizarse
      if (siteData.status) updateData.status = siteData.status;
      if (siteData.monitorInterval) updateData.monitorInterval = siteData.monitorInterval;
      if (siteData.alertThreshold) updateData.alertThreshold = siteData.alertThreshold;
      if (siteData.checkSSL !== undefined) updateData.checkSSL = siteData.checkSSL;
      if (siteData.checkKeywords) updateData.checkKeywords = siteData.checkKeywords;
      
      // Actualizar configuraciones de monitoreo si se proporcionan
      if (siteData.monitorSettings) {
        updateData.monitorSettings = {
          ...site.monitorSettings,
          ...siteData.monitorSettings
        };
      }
      
      // Actualizar documento
      const updatedSite = await databases.updateDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        id,
        updateData
      );
      
      return updatedSite;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get site by ID
   * @param {string} id - Site ID
   * @returns {Promise<Object>} Site
   */
  async getById(id) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        id
      );
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  },
  
  /**
   * Update monitoring metrics for a site
   * @param {string} id - Site ID 
   * @param {Object} metrics - Metrics to update
   * @returns {Promise<Object>} Updated site
   */
  async updateMetrics(id, metrics) {
    try {
      // Obtener sitio actual
      const site = await this.getById(id);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      // Calcular nuevos valores
      const updateData = {
        updatedAt: new Date().toISOString(),
        lastChecked: metrics.timestamp || new Date().toISOString()
      };
      
      // Actualizar campos específicos según la verificación
      if (metrics.responseTime !== undefined) {
        updateData.lastResponseTime = metrics.responseTime;
        
        // Actualizar tiempo promedio de respuesta
        const totalChecks = site.totalChecks + 1;
        updateData.totalChecks = totalChecks;
        updateData.averageResponseTime = ((site.averageResponseTime * site.totalChecks) + metrics.responseTime) / totalChecks;
      }
      
      if (metrics.statusCode !== undefined) {
        updateData.lastStatusCode = metrics.statusCode;
      }
      
      if (metrics.available !== undefined) {
        updateData.lastAvailable = metrics.available;
        
        // Actualizar checks exitosos y uptime
        if (metrics.available) {
          updateData.successfulChecks = site.successfulChecks + 1;
        }
        
        updateData.uptime = (updateData.successfulChecks / updateData.totalChecks) * 100;
      }
      
      // Actualizar documento
      const updatedSite = await databases.updateDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        id,
        updateData
      );
      
      return updatedSite;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Delete a site
   * @param {string} id - Site ID
   * @returns {Promise<boolean>} Success
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
  },
  
  /**
   * Get all sites for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of sites
   */
  async getAllForUser(userId) {
    try {
      const sites = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [
          Query.equal('userId', userId)
        ]
      );
      
      return sites.documents;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = SiteModel; 