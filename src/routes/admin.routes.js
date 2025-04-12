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

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Endpoints exclusivos para administradores
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     description: Retorna la lista de todos los usuarios registrados en el sistema. Solo accesible para administradores.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de usuarios por página
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filtrar por rol
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Solo administradores pueden acceder
 *       500:
 *         description: Error del servidor
 */
// Rutas para gestión de usuarios
router.route('/users')
  .get(logActivity('system', 'view', 'Admin viewed all users'), getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Obtener detalles de un usuario
 *     description: Retorna los datos completos de un usuario específico. Solo accesible para administradores.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Datos del usuario obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Solo administradores pueden acceder
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 *   delete:
 *     summary: Eliminar un usuario
 *     description: Elimina permanentemente a un usuario del sistema. Solo accesible para administradores.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Usuario eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Solo administradores pueden acceder
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.route('/users/:id')
  .get(logActivity('system', 'view', 'Admin viewed user details'), getUser)
  .delete(logActivity('system', 'delete', 'Admin deleted user'), deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Actualizar rol de un usuario
 *     description: Cambia el rol de un usuario (user o admin). Solo accesible para administradores.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Rol de usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - Solo administradores pueden acceder
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.route('/users/:id/role')
  .put(logActivity('system', 'update', 'Admin updated user role'), updateUserRole);

module.exports = router; 