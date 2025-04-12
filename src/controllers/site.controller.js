const siteService = require('../services/site.service');
const LogService = require('../services/log.service');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const logger = require('../utils/logger');

/**
 * @desc    Get all sites for logged in user
 * @route   GET /api/sites
 * @access  Private
 */
exports.getSites = async (req, res) => {
  try {
    const sites = await siteService.getUserSites(req.user.id);
    
    LogService.createLog({
      type: 'site',
      action: 'list',
      message: 'User viewed their sites',
      userId: req.user.id
    });
    
    sendSuccessResponse(res, 'Sites retrieved successfully', { sites });
  } catch (error) {
    logger.error('Error getting sites:', error);
    sendErrorResponse(res, 'Error retrieving sites', 500);
  }
};

/**
 * @desc    Get a single site
 * @route   GET /api/sites/:id
 * @access  Private
 */
exports.getSite = async (req, res) => {
  try {
    const site = await siteService.getSiteById(req.params.id);
    
    // Check if site exists
    if (!site) {
      return sendErrorResponse(res, 'Site not found', 404);
    }
    
    // Check if site belongs to user
    if (site.userId !== req.user.id && req.user.role !== 'admin') {
      return sendErrorResponse(res, 'Not authorized to access this site', 403);
    }
    
    LogService.createLog({
      type: 'site',
      action: 'view',
      message: `Viewed site: ${site.name}`,
      userId: req.user.id,
      metadata: { siteId: site.id }
    });
    
    sendSuccessResponse(res, 'Site retrieved successfully', { site });
  } catch (error) {
    logger.error('Error getting site:', error);
    sendErrorResponse(res, 'Error retrieving site', 500);
  }
};

/**
 * @desc    Create a new site
 * @route   POST /api/sites
 * @access  Private
 */
exports.createSite = async (req, res) => {
  try {
    const { name, url } = req.body;
    
    // Validate input
    if (!name || !url) {
      return sendErrorResponse(res, 'Please provide name and url', 400);
    }
    
    // Create site
    const site = await siteService.createSite(name, url, req.user.id);
    
    LogService.createLog({
      type: 'site',
      action: 'create',
      message: `Created new site: ${name}`,
      userId: req.user.id,
      metadata: { siteId: site.id, name, url }
    });
    
    sendSuccessResponse(res, 'Site created successfully', { site }, 201);
  } catch (error) {
    logger.error('Error creating site:', error);
    
    // Check for duplicate site error
    if (error.message && error.message.includes('duplicate')) {
      return sendErrorResponse(res, 'You already have a site with this URL', 400);
    }
    
    sendErrorResponse(res, 'Error creating site', 500);
  }
};

/**
 * @desc    Update a site
 * @route   PUT /api/sites/:id
 * @access  Private
 */
exports.updateSite = async (req, res) => {
  try {
    const { name, url, status } = req.body;
    
    // Validate input
    if (!name && !url && !status) {
      return sendErrorResponse(res, 'Please provide name, url or status to update', 400);
    }
    
    // Get the site
    const site = await siteService.getSiteById(req.params.id);
    
    // Check if site exists
    if (!site) {
      return sendErrorResponse(res, 'Site not found', 404);
    }
    
    // Check ownership
    if (site.userId !== req.user.id && req.user.role !== 'admin') {
      return sendErrorResponse(res, 'Not authorized to update this site', 403);
    }
    
    // Update data
    const updateData = {};
    if (name) updateData.name = name;
    if (url) updateData.url = url;
    if (status) updateData.status = status;
    
    // Update site
    const updatedSite = await siteService.updateSite(req.params.id, updateData);
    
    LogService.createLog({
      type: 'site',
      action: 'update',
      message: `Updated site: ${updatedSite.name}`,
      userId: req.user.id,
      metadata: { siteId: updatedSite.id, changes: updateData }
    });
    
    sendSuccessResponse(res, 'Site updated successfully', { site: updatedSite });
  } catch (error) {
    logger.error('Error updating site:', error);
    sendErrorResponse(res, 'Error updating site', 500);
  }
};

/**
 * @desc    Delete a site
 * @route   DELETE /api/sites/:id
 * @access  Private
 */
exports.deleteSite = async (req, res) => {
  try {
    // Get the site
    const site = await siteService.getSiteById(req.params.id);
    
    // Check if site exists
    if (!site) {
      return sendErrorResponse(res, 'Site not found', 404);
    }
    
    // Check ownership
    if (site.userId !== req.user.id && req.user.role !== 'admin') {
      return sendErrorResponse(res, 'Not authorized to delete this site', 403);
    }
    
    // Delete site
    await siteService.deleteSite(req.params.id);
    
    LogService.createLog({
      type: 'site',
      action: 'delete',
      message: `Deleted site: ${site.name}`,
      userId: req.user.id,
      metadata: { siteId: req.params.id, name: site.name }
    });
    
    sendSuccessResponse(res, 'Site deleted successfully', null);
  } catch (error) {
    logger.error('Error deleting site:', error);
    sendErrorResponse(res, 'Error deleting site', 500);
  }
}; 