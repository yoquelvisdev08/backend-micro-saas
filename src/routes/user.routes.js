const express = require('express');
const router = express.Router();
const { updateWebhook, deleteWebhook, testWebhook } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas para webhooks
router.route('/webhook')
  .put(logActivity('system', 'update', 'User updated webhook URL'), updateWebhook)
  .delete(logActivity('system', 'delete', 'User deleted webhook URL'), deleteWebhook);

// Ruta para probar webhook
router.post('/webhook/test', logActivity('system', 'other', 'User tested webhook'), testWebhook);

module.exports = router; 