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

/**
 * @swagger
 * tags:
 *   name: Estadísticas
 *   description: Endpoints para obtener estadísticas y métricas
 */

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Obtener estadísticas generales
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Estadísticas obtenidas exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
// Ruta principal de estadísticas
router.get(
  '/', 
  logActivity('system', 'view', 'User viewed statistics'), 
  statsController.getStats
);

/**
 * @swagger
 * /api/stats/activity:
 *   get:
 *     summary: Obtener distribución de actividad
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribución de actividad obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Distribución de actividad obtenida exitosamente
 *                 data:
 *                   type: object
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
// Ruta para obtener distribución de actividad
router.get(
  '/activity', 
  logActivity('system', 'view', 'User viewed activity distribution'), 
  statsController.getActivityDistribution
);

/**
 * @swagger
 * /api/stats/user:
 *   get:
 *     summary: Obtener estadísticas del usuario autenticado
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de usuario obtenidas exitosamente
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
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
// Get authenticated user stats
router.get(
  '/user',
  logActivity('user', 'view', 'User viewed personal statistics'),
  statsController.getUserStats
);

/**
 * @swagger
 * /api/stats/user/{userId}:
 *   get:
 *     summary: Obtener estadísticas de un usuario específico (solo admin)
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Estadísticas de usuario obtenidas exitosamente
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
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       500:
 *         description: Error del servidor
 */
// Get stats for a specific user (admin only)
router.get(
  '/user/:userId',
  roleMiddleware.restrictTo('admin'),
  logActivity('admin', 'view', 'Admin viewed user statistics'),
  statsController.getUserStatsById
);

/**
 * @swagger
 * /api/stats/admin:
 *   get:
 *     summary: Obtener estadísticas de la plataforma (solo admin)
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de plataforma obtenidas exitosamente
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
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       500:
 *         description: Error del servidor
 */
// Get admin stats (admin only)
router.get(
  '/admin',
  roleMiddleware.restrictTo('admin'),
  logActivity('admin', 'view', 'Admin viewed platform statistics'),
  statsController.getAdminStats
);

module.exports = router; 