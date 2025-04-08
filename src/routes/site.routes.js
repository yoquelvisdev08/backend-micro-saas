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
  const site = await Site.findById(req.params.id);
  return site ? site.userId : null;
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

module.exports = router; 