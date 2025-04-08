const express = require('express');
const router = express.Router();
const { getLogs, getLogStats } = require('../controllers/log.controller');
const { protect } = require('../middlewares/auth.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas para /api/logs
router.get('/', logActivity('system', 'view'), getLogs);
router.get('/stats', logActivity('system', 'view'), getLogStats);

module.exports = router; 