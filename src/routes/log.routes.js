const express = require('express');
const router = express.Router();
const { getLogs, getAllLogs, getLogStats, exportLogs } = require('../controllers/log.controller');
const { protect } = require('../middlewares/auth.middleware');
const { restrictTo, isAdmin } = require('../middlewares/role.middleware');
const { logActivity } = require('../middlewares/logger.middleware');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Configurar rate limiting para endpoints de logs
const logsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 100, // Límite de 100 solicitudes por ventana
  message: 'Demasiadas solicitudes de logs, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false
});

// Limite más estricto para exportación
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 exportaciones por hora
  message: 'Demasiadas solicitudes de exportación, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false
});

// Todas las rutas requieren autenticación
router.use(protect);

// Usar compresión en todas las rutas de logs para mejorar rendimiento
router.use(compression());

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Obtener logs del usuario actual con filtrado avanzado
 *     description: Retorna logs del usuario con opciones avanzadas de filtrado, paginación, ordenamiento y formato.
 *     tags: [Logs]
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
 *         description: Número de registros por página (máx. 100)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio en formato ISO (YYYY-MM-DDTHH:MM:SSZ)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin en formato ISO (YYYY-MM-DDTHH:MM:SSZ)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [auth, site, system, error, admin, security]
 *         description: Tipo de log
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: login, create, update, delete, view
 *         description: Acción realizada
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *         description: ID del sitio relacionado con el log
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, error, warning, info]
 *         description: Estado del log
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Nivel de severidad del log
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en el mensaje del log (texto libre)
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filtrar por tags (separados por coma)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [createdAt, type, action, status, severity, duration]
 *         description: Campo para ordenar resultados
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de los resultados (asc = ascendente, desc = descendente)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Formato de exportación (si se especifica, devuelve un archivo para descargar)
 *       - in: query
 *         name: detailed
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir información detallada en los resultados
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de logs con paginación, resumen y detección de anomalías
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
 *                   example: Logs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Log'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     summary:
 *                       $ref: '#/components/schemas/LogSummary'
 *                     anomalies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Anomaly'
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       429:
 *         description: Demasiadas solicitudes
 *       500:
 *         description: Error del servidor
 */
router.get('/', logsLimiter, getLogs);

/**
 * @swagger
 * /api/logs/export:
 *   get:
 *     summary: Exportar logs en formato CSV o JSON
 *     description: Permite exportar logs en formato CSV o JSON con opciones de filtrado. Limitado a 1000 registros por solicitud.
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         required: true
 *         description: Formato de exportación
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Tipo de log
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Acción realizada
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin (ISO format)
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *         description: ID del sitio
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Estado del log
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Nivel de severidad
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo exportado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Log'
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Formato no soportado o parámetros inválidos
 *       401:
 *         description: No autorizado
 *       429:
 *         description: Límite de exportación superado
 *       500:
 *         description: Error del servidor
 */
router.get('/export', exportLimiter, exportLogs);

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Obtener estadísticas de logs
 *     description: Retorna estadísticas de los logs del usuario actual, incluyendo distribución por tipo, estado, severidad y tiempo.
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, all]
 *           default: 7d
 *         description: Período de tiempo para las estadísticas
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtrar estadísticas por tipo de log
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *         description: Filtrar estadísticas por ID de sitio
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de logs
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
 *                     stats:
 *                       $ref: '#/components/schemas/LogStats'
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/stats', logsLimiter, getLogStats);

/**
 * @swagger
 * /api/logs/admin:
 *   get:
 *     summary: Obtener todos los logs (solo admin)
 *     description: Retorna logs de todos los usuarios con opciones avanzadas de filtrado y análisis. Solo accesible para administradores.
 *     tags: [Logs]
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
 *         description: Número de registros por página (máx. 100)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin (ISO format)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Tipo de log
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Acción realizada
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *         description: ID del sitio
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Estado del log
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Nivel de severidad
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda en el mensaje del log
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filtrar por tags (separados por coma)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Campo para ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de los resultados
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Formato de exportación (opcional)
 *       - in: query
 *         name: detailed
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir información detallada en los resultados
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de todos los logs con paginación y resumen
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado - Solo administradores
 *       429:
 *         description: Demasiadas solicitudes
 *       500:
 *         description: Error del servidor
 */
router.get('/admin', 
  restrictTo('admin'), 
  logsLimiter,
  getAllLogs
);

/**
 * @swagger
 * /api/logs/trends:
 *   get:
 *     summary: Obtener tendencias y patrones en logs
 *     description: Analiza los logs para identificar tendencias, patrones y posibles problemas.
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d]
 *           default: 7d
 *         description: Período de tiempo para el análisis
 *       - in: query
 *         name: resolution
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: day
 *         description: Resolución temporal del análisis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Análisis de tendencias en logs
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/trends', logsLimiter, (req, res) => {
  // Esta ruta se implementará en el futuro
  sendErrorResponse(res, 'Esta funcionalidad estará disponible próximamente', 501);
});

module.exports = router; 