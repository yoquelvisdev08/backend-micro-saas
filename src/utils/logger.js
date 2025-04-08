/**
 * Logger utility for application-wide logging
 */

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Función para formatear el timestamp
 * @returns {string} Timestamp formateado
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Nivel de logger (debug, info, warn, error)
 * Se puede configurar por variable de entorno
 */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Verificar si el nivel debe ser registrado
 * @param {string} level - Nivel del log
 * @returns {boolean} - Si debe ser registrado
 */
const shouldLog = (level) => {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
};

/**
 * Función para generar logs de debug
 * @param {string} message - Mensaje a registrar
 * @param {Object} data - Datos adicionales
 */
const debug = (message, data = null) => {
  if (!shouldLog('debug')) return;
  console.log(`${colors.blue}[DEBUG]${colors.reset} ${getTimestamp()} - ${message}`);
  if (data) console.log(data);
};

/**
 * Función para generar logs de información
 * @param {string} message - Mensaje a registrar
 * @param {Object} data - Datos adicionales
 */
const info = (message, data = null) => {
  if (!shouldLog('info')) return;
  console.log(`${colors.green}[INFO]${colors.reset} ${getTimestamp()} - ${message}`);
  if (data) console.log(data);
};

/**
 * Función para generar logs de advertencia
 * @param {string} message - Mensaje a registrar
 * @param {Object} data - Datos adicionales
 */
const warn = (message, data = null) => {
  if (!shouldLog('warn')) return;
  console.log(`${colors.yellow}[WARN]${colors.reset} ${getTimestamp()} - ${message}`);
  if (data) console.log(data);
};

/**
 * Función para generar logs de error
 * @param {string} message - Mensaje a registrar
 * @param {Object|Error} error - Error o datos adicionales
 */
const error = (message, error = null) => {
  if (!shouldLog('error')) return;
  console.error(`${colors.red}[ERROR]${colors.reset} ${getTimestamp()} - ${message}`);
  if (error) {
    if (error instanceof Error) {
      console.error(`${error.stack || error}`);
    } else {
      console.error(error);
    }
  }
};

module.exports = {
  debug,
  info,
  warn,
  error
}; 