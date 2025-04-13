const express = require('express');
const router = express.Router();
const {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite
} = require('../controllers/site.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isResourceOwnerOrAdmin } = require('../middlewares/role.middleware');
const { logActivity } = require('../middlewares/logger.middleware');
const Site = require('../models/site.model');
const monitorController = require('../controllers/monitor.controller');

// Todas las rutas requieren autenticación
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Sitios
 *   description: Gestión de sitios web
 */

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Obtener todos los sitios del usuario
 *     tags: [Sitios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sitios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60d21b4667d0d8992e610c85
 *                       name:
 *                         type: string
 *                         example: Mi Sitio Web
 *                       url:
 *                         type: string
 *                         example: https://example.com
 *                       userId:
 *                         type: string
 *                         example: 60d21b4667d0d8992e610c85
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error del servidor
 *
 *   post:
 *     summary: Crear un nuevo sitio
 *     tags: [Sitios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mi Sitio Web
 *               url:
 *                 type: string
 *                 example: https://example.com
 *     responses:
 *       201:
 *         description: Sitio creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     name:
 *                       type: string
 *                       example: Mi Sitio Web
 *                     url:
 *                       type: string
 *                       example: https://example.com
 *                     userId:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.route('/')
  .get(logActivity('site', 'view'), getSites)
  .post(logActivity('site', 'create'), createSite);

// Función para obtener el ID de usuario de un sitio
const getSiteUserId = async (req) => {
  try {
    const SiteModel = require('../models/site.model');
    const site = await SiteModel.getById(req.params.id);
    return site ? (site.userId || site.user_id || site.ownerId || site.$ownerId) : null;
  } catch (error) {
    console.error('Error getting site user ID:', error);
    return null;
  }
};

/**
 * @swagger
 * /api/sites/{id}:
 *   get:
 *     summary: Obtener un sitio por ID
 *     tags: [Sitios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del sitio
 *     responses:
 *       200:
 *         description: Sitio obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     name:
 *                       type: string
 *                       example: Mi Sitio Web
 *                     url:
 *                       type: string
 *                       example: https://example.com
 *                     userId:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - No tienes permiso para acceder a este recurso
 *       404:
 *         description: Sitio no encontrado
 *       500:
 *         description: Error del servidor
 *
 *   put:
 *     summary: Actualizar un sitio
 *     tags: [Sitios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del sitio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mi Sitio Web Actualizado
 *               url:
 *                 type: string
 *                 example: https://updated-example.com
 *     responses:
 *       200:
 *         description: Sitio actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     name:
 *                       type: string
 *                       example: Mi Sitio Web Actualizado
 *                     url:
 *                       type: string
 *                       example: https://updated-example.com
 *                     userId:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - No tienes permiso para actualizar este recurso
 *       404:
 *         description: Sitio no encontrado
 *       500:
 *         description: Error del servidor
 *
 *   delete:
 *     summary: Eliminar un sitio
 *     tags: [Sitios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del sitio
 *     responses:
 *       200:
 *         description: Sitio eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido - No tienes permiso para eliminar este recurso
 *       404:
 *         description: Sitio no encontrado
 *       500:
 *         description: Error del servidor
 */
router.route('/:id')
  .get(
    isResourceOwnerOrAdmin(getSiteUserId),
    logActivity('site', 'view'),
    getSite
  )
  .put(
    isResourceOwnerOrAdmin(getSiteUserId),
    logActivity('site', 'update'),
    updateSite
  )
  .delete(
    isResourceOwnerOrAdmin(getSiteUserId),
    logActivity('site', 'delete'),
    deleteSite
  );

// ======================= MONITOR ROUTES =======================

/**
 * @swagger
 * /api/sites/{id}/monitor:
 *   post:
 *     summary: Ejecutar verificación completa del sitio
 *     description: Realiza un monitoreo completo del sitio con todas las verificaciones configuradas
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verificación completa ejecutada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     siteId:
 *                       type: string
 *                     siteName:
 *                       type: string
 *                     basic:
 *                       type: object
 *                     ssl:
 *                       type: object
 *                     performance:
 *                       type: object
 *                     keywords:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.post('/:id/monitor', 
  logActivity('monitor', 'run-check'),
  isResourceOwnerOrAdmin('site'),
  monitorController.runMonitorCheck
);

/**
 * @swagger
 * /api/sites/{id}/check:
 *   get:
 *     summary: Verificar disponibilidad básica del sitio
 *     description: Realiza una verificación rápida de disponibilidad y tiempo de respuesta
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verificación realizada correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.get('/:id/check', 
  logActivity('monitor', 'basic-check'),
  isResourceOwnerOrAdmin('site'),
  monitorController.checkBasic
);

/**
 * @swagger
 * /api/sites/{id}/ssl:
 *   get:
 *     summary: Verificar certificado SSL del sitio
 *     description: Analiza el certificado SSL y devuelve información sobre su validez y fecha de expiración
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verificación SSL realizada correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.get('/:id/ssl', 
  logActivity('monitor', 'ssl-check'),
  isResourceOwnerOrAdmin('site'),
  monitorController.checkSSL
);

/**
 * @swagger
 * /api/sites/{id}/performance:
 *   get:
 *     summary: Analizar rendimiento del sitio
 *     description: Realiza un análisis de rendimiento detallado del sitio
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Análisis de rendimiento realizado correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.get('/:id/performance', 
  logActivity('monitor', 'performance-check'),
  isResourceOwnerOrAdmin('site'),
  monitorController.analyzePerformance
);

/**
 * @swagger
 * /api/sites/{id}/hotspots:
 *   get:
 *     summary: Identificar puntos críticos del sitio
 *     description: Analiza el sitio para identificar problemas y oportunidades de mejora
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Análisis de puntos críticos realizado correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.get('/:id/hotspots', 
  logActivity('monitor', 'hotspots-check'),
  isResourceOwnerOrAdmin('site'),
  monitorController.identifyHotspots
);

/**
 * @swagger
 * /api/sites/{id}/history:
 *   get:
 *     summary: Obtener historial de monitoreo del sitio
 *     description: Devuelve el historial de verificaciones y métricas del sitio a lo largo del tiempo
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para filtrar
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para filtrar
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Máximo de registros a devolver
 *     responses:
 *       200:
 *         description: Historial obtenido correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.get('/:id/history', 
  logActivity('monitor', 'view-history'),
  isResourceOwnerOrAdmin('site'),
  monitorController.getMonitorHistory
);

/**
 * @swagger
 * /api/sites/{id}/keywords:
 *   get:
 *     summary: Verificar palabras clave en el sitio
 *     description: Verifica si las palabras clave configuradas están presentes en el sitio
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verificación de palabras clave realizada correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.get('/:id/keywords', 
  logActivity('monitor', 'keywords-check'),
  isResourceOwnerOrAdmin('site'),
  monitorController.checkKeywords
);

/**
 * @swagger
 * /api/sites/{id}/settings:
 *   put:
 *     summary: Actualizar configuración de monitoreo del sitio
 *     description: Actualiza los parámetros de monitoreo del sitio (frecuencia, umbrales, etc.)
 *     tags: [Sitios, Monitoreo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monitorInterval:
 *                 type: integer
 *                 description: Minutos entre verificaciones
 *               alertThreshold:
 *                 type: integer
 *                 description: Umbral en ms para alertas de tiempo de respuesta
 *               checkSSL:
 *                 type: boolean
 *                 description: Verificar SSL
 *               checkKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Palabras clave a verificar
 *               monitorSettings:
 *                 type: object
 *                 properties:
 *                   checkResources:
 *                     type: boolean
 *                   checkMobile:
 *                     type: boolean
 *                   checkSEO:
 *                     type: boolean
 *                   checkPerformance:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Configuración actualizada correctamente
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Sitio no encontrado
 */
router.put('/:id/settings', 
  logActivity('monitor', 'update-settings'),
  isResourceOwnerOrAdmin('site'),
  monitorController.updateMonitorSettings
);

module.exports = router; 