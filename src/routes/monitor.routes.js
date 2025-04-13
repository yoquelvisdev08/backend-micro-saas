/**
 * Monitor Routes
 * Rutas para la funcionalidad de monitoreo de sitios web
 */

const express = require('express');
const router = express.Router();
const monitorController = require('../controllers/monitor.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin, isResourceOwnerOrAdmin } = require('../middlewares/role.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

// Middleware para verificar propiedad del sitio
const verifySiteOwnership = (req, res, next) => {
    req.resourceId = req.params.siteId;
    req.resourceType = 'site';
    isResourceOwnerOrAdmin(req, res, next);
};

// Aplicamos autenticación a todas las rutas
router.use(protect);

// Rutas de verificación básica (accesibles para el propietario del sitio)
router.get('/site/:siteId/basic', verifySiteOwnership, logActivity, monitorController.basicCheck);
router.get('/site/:siteId/ssl', verifySiteOwnership, logActivity, monitorController.sslCheck);
router.get('/site/:siteId/performance', verifySiteOwnership, logActivity, monitorController.performanceCheck);
router.get('/site/:siteId/keywords', verifySiteOwnership, logActivity, monitorController.keywordsCheck);
router.get('/site/:siteId/hotspots', verifySiteOwnership, logActivity, monitorController.hotspotsCheck);
router.get('/site/:siteId/full', verifySiteOwnership, logActivity, monitorController.fullCheck);

// Rutas para obtener historial y configuración
router.get('/site/:siteId/history', verifySiteOwnership, monitorController.getHistory);
router.put('/site/:siteId/settings', verifySiteOwnership, logActivity, monitorController.updateSettings);

// Rutas de administrador
router.get('/admin/overview', isAdmin, monitorController.getAdminOverview);

module.exports = router; 