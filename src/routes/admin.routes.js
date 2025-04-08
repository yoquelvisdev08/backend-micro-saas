const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUserRole,
  deleteUser
} = require('../controllers/admin.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

// Todas las rutas requieren autenticación y rol de administrador
router.use(protect);
router.use(isAdmin);

// Rutas para gestión de usuarios
router.route('/users')
  .get(logActivity('system', 'view', 'Admin viewed all users'), getAllUsers);

router.route('/users/:id')
  .get(logActivity('system', 'view', 'Admin viewed user details'), getUser)
  .delete(logActivity('system', 'delete', 'Admin deleted user'), deleteUser);

router.route('/users/:id/role')
  .put(logActivity('system', 'update', 'Admin updated user role'), updateUserRole);

module.exports = router; 