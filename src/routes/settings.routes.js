const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin, isResourceOwnerOrAdmin } = require('../middlewares/role.middleware');
const logActivity = require('../middlewares/activity.middleware');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @route GET /api/settings
 * @description Obtiene las configuraciones del usuario autenticado
 * @access Private
 */
router.get(
  '/',
  logActivity('view_user_settings'),
  settingsController.getUserSettings
);

/**
 * @route GET /api/settings/all
 * @description Obtiene todas las configuraciones (admin)
 * @access Admin
 */
router.get(
  '/all',
  isAdmin,
  logActivity('view_all_settings'),
  settingsController.getAllSettings
);

/**
 * @route GET /api/settings/role/:roleId
 * @description Obtiene configuraciones de un rol específico
 * @access Admin
 */
router.get(
  '/role/:roleId',
  isAdmin,
  logActivity('view_role_settings'),
  settingsController.getRoleSettings
);

/**
 * @route GET /api/settings/:id
 * @description Obtiene una configuración específica por ID
 * @access Private (dueño o admin)
 */
router.get(
  '/:id',
  logActivity('view_setting'),
  settingsController.getSetting
);

/**
 * @route GET /api/settings/:id/history
 * @description Obtiene el historial de cambios de una configuración
 * @access Private (dueño o admin)
 */
router.get(
  '/:id/history',
  logActivity('view_setting_history'),
  settingsController.getSettingHistory
);

/**
 * @route POST /api/settings
 * @description Crea una nueva configuración
 * @access Private (para configuraciones personales) o Admin (para globales/rol)
 */
router.post(
  '/',
  logActivity('create_setting'),
  settingsController.createSetting
);

/**
 * @route PUT /api/settings/:id
 * @description Actualiza una configuración existente
 * @access Private (dueño o admin)
 */
router.put(
  '/:id',
  logActivity('update_setting'),
  settingsController.updateSetting
);

/**
 * @route DELETE /api/settings/:id
 * @description Elimina una configuración existente
 * @access Private (dueño o admin)
 */
router.delete(
  '/:id',
  logActivity('delete_setting'),
  settingsController.deleteSetting
);

/**
 * @route POST /api/settings/import
 * @description Importa configuraciones desde un archivo JSON
 * @access Admin
 */
router.post(
  '/import',
  isAdmin,
  logActivity('import_settings'),
  settingsController.importSettings
);

/**
 * @route GET /api/settings/export
 * @description Exporta configuraciones a formato JSON
 * @access Private (para propias) o Admin (para todas)
 */
router.get(
  '/export',
  logActivity('export_settings'),
  settingsController.exportSettings
);

module.exports = router; 