const express = require('express');
const router = express.Router();
const { getStats, getActivityDistribution } = require('../controllers/stats.controller');
const { protect } = require('../middlewares/auth.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

// Todas las rutas requieren autenticación
router.use(protect);

// Ruta principal de estadísticas
router.get('/', logActivity('system', 'view', 'User viewed statistics'), getStats);

// Ruta para obtener distribución de actividad
router.get('/activity', logActivity('system', 'view', 'User viewed activity distribution'), getActivityDistribution);

module.exports = router; 