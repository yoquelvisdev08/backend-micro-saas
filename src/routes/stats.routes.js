const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

// Verificar que todos los controladores existen
console.log('Controladores disponibles:', Object.keys(statsController));

// Todas las rutas requieren autenticación
router.use(authMiddleware.protect);

/**
 * Stats routes
 * @route /api/stats
 */

// Ruta principal de estadísticas
router.get(
  '/', 
  logActivity('system', 'view', 'User viewed statistics'), 
  statsController.getStats
);

// Ruta para obtener distribución de actividad
router.get(
  '/activity', 
  logActivity('system', 'view', 'User viewed activity distribution'), 
  statsController.getActivityDistribution
);

// Get authenticated user stats
router.get(
  '/user',
  logActivity('user', 'view', 'User viewed personal statistics'),
  statsController.getUserStats
);

// Get stats for a specific user (admin only)
router.get(
  '/user/:userId',
  roleMiddleware.restrictTo('admin'),
  logActivity('admin', 'view', 'Admin viewed user statistics'),
  statsController.getUserStatsById
);

// Get admin stats (admin only)
router.get(
  '/admin',
  roleMiddleware.restrictTo('admin'),
  logActivity('admin', 'view', 'Admin viewed platform statistics'),
  statsController.getAdminStats
);

module.exports = router; 