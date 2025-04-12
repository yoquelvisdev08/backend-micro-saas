const express = require('express');
const router = express.Router();
const { updateWebhook, deleteWebhook, testWebhook } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const { logActivity } = require('../middlewares/logger.middleware');

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Endpoints para gestión de usuarios
 */

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @swagger
 * /api/users/webhook:
 *   put:
 *     summary: Actualizar URL de webhook
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/webhook
 *     responses:
 *       200:
 *         description: URL de webhook actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 *   delete:
 *     summary: Eliminar URL de webhook
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: URL de webhook eliminada exitosamente
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
// Rutas para webhooks
router.route('/webhook')
  .put(logActivity('system', 'update', 'User updated webhook URL'), updateWebhook)
  .delete(logActivity('system', 'delete', 'User deleted webhook URL'), deleteWebhook);

/**
 * @swagger
 * /api/users/webhook/test:
 *   post:
 *     summary: Probar webhook
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prueba de webhook enviada exitosamente
 *       400:
 *         description: No hay URL de webhook configurada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
// Ruta para probar webhook
router.post('/webhook/test', logActivity('system', 'other', 'User tested webhook'), testWebhook);

module.exports = router; 