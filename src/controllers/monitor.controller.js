/**
 * Monitor Controller
 * Controlador para la funcionalidad de monitoreo de sitios web
 */

const monitorService = require('../services/monitor.service');
const siteService = require('../services/site.service');
const { sendResponse, sendErrorResponse } = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * Ejecuta una verificación básica del sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el resultado de la verificación
 */
async function basicCheck(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        // Obtener información del sitio
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Realizar verificación básica
        const result = await monitorService.performBasicCheck(site.url);
        
        // Save result if saveMonitorResult is available
        if (monitorService.saveMonitorResult) {
            try {
                result.type = 'basic';
                await monitorService.saveMonitorResult(siteId, result);
            } catch (saveError) {
                logger.error(`Error al guardar resultado: ${saveError.message}`);
                // Continue even if saving fails
            }
        }
        
        return sendResponse(res, 200, {
            message: 'Verificación básica completada',
            result
        });
    } catch (error) {
        logger.error(`Error en verificación básica: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Verifica el certificado SSL del sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el resultado de la verificación SSL
 */
async function sslCheck(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        // Obtener información del sitio
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Realizar verificación de SSL
        const result = await monitorService.checkSSL(site.url);
        
        // Save result if saveMonitorResult is available
        if (monitorService.saveMonitorResult) {
            try {
                result.type = 'ssl';
                await monitorService.saveMonitorResult(siteId, result);
            } catch (saveError) {
                logger.error(`Error al guardar resultado: ${saveError.message}`);
                // Continue even if saving fails
            }
        }
        
        return sendResponse(res, 200, {
            message: 'Verificación de SSL completada',
            result
        });
    } catch (error) {
        logger.error(`Error en verificación de SSL: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Analiza el rendimiento del sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el resultado del análisis de rendimiento
 */
async function performanceCheck(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        // Obtener información del sitio
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Realizar verificación de rendimiento
        const result = await monitorService.checkPerformance(site.url);
        
        // Save result if saveMonitorResult is available
        if (monitorService.saveMonitorResult) {
            try {
                result.type = 'performance';
                await monitorService.saveMonitorResult(siteId, result);
            } catch (saveError) {
                logger.error(`Error al guardar resultado: ${saveError.message}`);
                // Continue even if saving fails
            }
        }
        
        return sendResponse(res, 200, {
            message: 'Análisis de rendimiento completado',
            result
        });
    } catch (error) {
        logger.error(`Error en análisis de rendimiento: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Verifica palabras clave en el sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el resultado del análisis de palabras clave
 */
async function keywordsCheck(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        const { keywords } = req.query;
        
        // Obtener información del sitio
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Preparar el array de palabras clave
        let keywordsArray = [];
        if (keywords) {
            keywordsArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
        } else if (site.keywords) {
            // Usar palabras clave del sitio si están disponibles
            keywordsArray = site.keywords.split(',').map(k => k.trim());
        }
        
        // Realizar verificación de palabras clave
        const result = await monitorService.checkKeywords(site.url, keywordsArray);
        
        // Save result if saveMonitorResult is available
        if (monitorService.saveMonitorResult) {
            try {
                result.type = 'keywords';
                await monitorService.saveMonitorResult(siteId, result);
            } catch (saveError) {
                logger.error(`Error al guardar resultado: ${saveError.message}`);
                // Continue even if saving fails
            }
        }
        
        return sendResponse(res, 200, {
            message: 'Análisis de palabras clave completado',
            result
        });
    } catch (error) {
        logger.error(`Error en análisis de palabras clave: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Identifica puntos críticos en el sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con los puntos críticos identificados
 */
async function hotspotsCheck(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        // Obtener información del sitio
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Identificar puntos críticos
        const result = await monitorService.identifyHotspots(site.url);
        
        // Save result if saveMonitorResult is available
        if (monitorService.saveMonitorResult) {
            try {
                result.type = 'hotspots';
                await monitorService.saveMonitorResult(siteId, result);
            } catch (saveError) {
                logger.error(`Error al guardar resultado: ${saveError.message}`);
                // Continue even if saving fails
            }
        }
        
        return sendResponse(res, 200, {
            message: 'Identificación de puntos críticos completada',
            result
        });
    } catch (error) {
        logger.error(`Error en identificación de puntos críticos: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Ejecuta una verificación completa del sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el resultado completo del monitoreo
 */
async function fullCheck(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        // Obtener información del sitio
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Realizar verificación completa
        const options = {};
        if (site.keywords) {
            options.keywords = site.keywords.split(',').map(k => k.trim());
        }
        
        const result = await monitorService.runFullCheck(site.url, options);
        
        // Save result if saveMonitorResult is available
        if (monitorService.saveMonitorResult) {
            try {
                result.type = 'full';
                await monitorService.saveMonitorResult(siteId, result);
            } catch (saveError) {
                logger.error(`Error al guardar resultado: ${saveError.message}`);
                // Continue even if saving fails
            }
        }
        
        return sendResponse(res, 200, {
            message: 'Verificación completa finalizada',
            result
        });
    } catch (error) {
        logger.error(`Error en verificación completa: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Obtiene el historial de monitoreo de un sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el historial de monitoreo
 */
async function getHistory(req, res) {
    try {
        // Get siteId from either params.siteId or params.id
        const siteId = req.params.siteId || req.params.id;
        
        if (!siteId) {
            return sendErrorResponse(res, 400, 'Site ID is required');
        }
        
        const { limit, offset, type } = req.query;
        
        // Verificar que el sitio existe
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Obtener el historial de monitoreo
        const options = {
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            type: type || null
        };
        
        // Use getMonitorHistory if it exists, otherwise fall back to getMonitoringHistory
        const history = monitorService.getMonitorHistory 
            ? await monitorService.getMonitorHistory(siteId, options)
            : [];
        
        return sendResponse(res, 200, {
            message: 'Historial de monitoreo obtenido',
            history
        });
    } catch (error) {
        logger.error(`Error al obtener el historial de monitoreo: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Actualiza la configuración de monitoreo de un sitio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con la configuración actualizada
 */
async function updateSettings(req, res) {
    try {
        const { siteId } = req.params;
        const settings = req.body;
        
        // Verificar que el sitio existe
        const site = await siteService.getSiteById(siteId);
        if (!site) {
            return sendErrorResponse(res, 404, 'Sitio no encontrado');
        }
        
        // Actualizar configuración de monitoreo
        const updatedSite = await monitorService.updateMonitorSettings(siteId, settings);
        
        return sendResponse(res, 200, {
            message: 'Configuración de monitoreo actualizada',
            settings: updatedSite.monitorSettings
        });
    } catch (error) {
        logger.error(`Error al actualizar configuración de monitoreo: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

/**
 * Obtiene un resumen de monitoreo para todos los sitios (admin)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Respuesta con el resumen de monitoreo
 */
async function getAdminOverview(req, res) {
    try {
        // Obtener todos los sitios (función que debe existir en site.service)
        const sites = await siteService.getAllSites();
        
        // Crear un resumen de estadísticas
        const overview = {
            totalSites: sites.length,
            sitesOnline: 0,
            sitesOffline: 0,
            sitesByHealth: {
                good: 0,
                average: 0,
                poor: 0,
                unknown: 0
            },
            sitesSummary: []
        };
        
        // Para cada sitio, obtener el último resultado de monitoreo completo
        for (const site of sites) {
            const history = await monitorService.getMonitorHistory(site.$id, { limit: 1, type: 'full' });
            
            let status = 'unknown';
            let health = 'Unknown';
            let lastCheck = null;
            
            if (history.length > 0) {
                const lastResult = history[0].result;
                status = lastResult.basic && lastResult.basic.isOnline ? 'online' : 'offline';
                health = lastResult.health || 'Unknown';
                lastCheck = history[0].createdAt;
                
                // Incrementar contadores
                if (status === 'online') overview.sitesOnline++;
                else overview.sitesOffline++;
                
                // Clasificar por salud
                if (health === 'Bueno') overview.sitesByHealth.good++;
                else if (health === 'Regular') overview.sitesByHealth.average++;
                else if (health === 'Deficiente') overview.sitesByHealth.poor++;
                else overview.sitesByHealth.unknown++;
            } else {
                overview.sitesByHealth.unknown++;
            }
            
            // Añadir resumen del sitio
            overview.sitesSummary.push({
                id: site.$id,
                name: site.name,
                url: site.url,
                status,
                health,
                lastCheck
            });
        }
        
        return sendResponse(res, 200, {
            message: 'Resumen de monitoreo obtenido',
            overview
        });
    } catch (error) {
        logger.error(`Error al obtener resumen de monitoreo: ${error.message}`);
        return sendErrorResponse(res, error.statusCode || 500, error.message);
    }
}

module.exports = {
    basicCheck,
    sslCheck,
    performanceCheck,
    keywordsCheck,
    hotspotsCheck,
    fullCheck,
    getHistory,
    updateSettings,
    getAdminOverview,
    
    // Aliases for functions used in site.routes.js
    runMonitorCheck: fullCheck,
    checkBasic: basicCheck,
    checkSSL: sslCheck,
    analyzePerformance: performanceCheck,
    identifyHotspots: hotspotsCheck,
    getMonitorHistory: getHistory,
    checkKeywords: keywordsCheck,
    updateMonitorSettings: updateSettings
}; 