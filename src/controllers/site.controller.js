const Site = require('../models/site.model');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const LogService = require('../services/log.service');
const { notFound, badRequest } = require('../utils/error.utils');

/**
 * @desc    Get all sites for a user
 * @route   GET /api/sites
 * @access  Private
 */
exports.getSites = async (req, res, next) => {
  try {
    const sites = await Site.find({ userId: req.user.id });
    
    // Log the sites view
    LogService.createLog({
      type: 'site',
      action: 'view',
      message: 'User viewed all sites',
      userId: req.user.id,
      metadata: { count: sites.length }
    });
    
    sendSuccessResponse(
      res,
      'Sitios obtenidos exitosamente',
      { count: sites.length, sites }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single site
 * @route   GET /api/sites/:id
 * @access  Private
 */
exports.getSite = async (req, res, next) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!site) {
      return next(notFound('Sitio'));
    }
    
    // Log the site view
    LogService.createLog({
      type: 'site',
      action: 'view',
      message: `User viewed site: ${site.name}`,
      userId: req.user.id,
      metadata: { siteId: site._id, siteName: site.name }
    });
    
    sendSuccessResponse(res, 'Sitio obtenido exitosamente', { site });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new site
 * @route   POST /api/sites
 * @access  Private
 */
exports.createSite = async (req, res, next) => {
  try {
    const { name, url } = req.body;
    
    // Validación básica
    if (!name || !url) {
      return next(badRequest('Por favor proporciona un nombre y url'));
    }
    
    // Verificar si ya existe un sitio con la misma URL para este usuario
    const existingSite = await Site.findOne({ url, userId: req.user.id });
    if (existingSite) {
      return next(badRequest('Ya tienes un sitio registrado con esta URL'));
    }
    
    // Crear el sitio
    const site = await Site.create({
      name,
      url,
      userId: req.user.id
    });
    
    // Log the site creation
    LogService.createLog({
      type: 'site',
      action: 'create',
      message: `User created site: ${site.name}`,
      userId: req.user.id,
      metadata: { siteId: site._id, siteName: site.name, siteUrl: site.url }
    });
    
    sendSuccessResponse(res, 'Sitio creado exitosamente', { site }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a site
 * @route   PUT /api/sites/:id
 * @access  Private
 */
exports.updateSite = async (req, res, next) => {
  try {
    const { name, url, status } = req.body;
    
    // Verificar si el sitio existe y pertenece al usuario
    let site = await Site.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!site) {
      return next(notFound('Sitio'));
    }
    
    // Actualizar el sitio
    site = await Site.findByIdAndUpdate(
      req.params.id,
      { name, url, status },
      { new: true, runValidators: true }
    );
    
    // Log the site update
    LogService.createLog({
      type: 'site',
      action: 'update',
      message: `User updated site: ${site.name}`,
      userId: req.user.id,
      metadata: { 
        siteId: site._id,
        siteName: site.name,
        changes: {
          name: name !== undefined,
          url: url !== undefined,
          status: status !== undefined
        }
      }
    });
    
    sendSuccessResponse(res, 'Sitio actualizado exitosamente', { site });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a site
 * @route   DELETE /api/sites/:id
 * @access  Private
 */
exports.deleteSite = async (req, res, next) => {
  try {
    // Verificar si el sitio existe y pertenece al usuario
    const site = await Site.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!site) {
      return next(notFound('Sitio'));
    }
    
    // Guardar información del sitio antes de eliminarlo para el log
    const siteInfo = {
      id: site._id,
      name: site.name,
      url: site.url
    };
    
    // Eliminar el sitio
    await site.deleteOne();
    
    // Log the site deletion
    LogService.createLog({
      type: 'site',
      action: 'delete',
      message: `User deleted site: ${siteInfo.name}`,
      userId: req.user.id,
      metadata: siteInfo
    });
    
    sendSuccessResponse(res, 'Sitio eliminado exitosamente', {});
  } catch (error) {
    next(error);
  }
}; 