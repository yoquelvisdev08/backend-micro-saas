const axios = require('axios');
const logger = require('../utils/logger');
const SiteModel = require('../models/site.model');
const LogService = require('./log.service');
const { performance } = require('perf_hooks');
const cheerio = require('cheerio');
const crypto = require('crypto');
const https = require('https');
const { Client } = require('appwrite');
const { parse } = require('node-html-parser');
const SiteService = require('./site.service');
const { ID, Query } = require('appwrite');
const client = new Client();
const { databases } = require('../config/appwrite.config');
const dns = require('dns').promises;

/**
 * Monitor Service - Handles website monitoring functions
 */
class MonitorService {
  /**
   * Perform a basic check on a website
   * @param {string} siteId - Site ID to check
   * @returns {Object} Check results
   */
  async performBasicCheck(siteId) {
    try {
      // Obtener información del sitio
      const site = await SiteModel.getById(siteId);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }

      logger.debug(`Realizando verificación básica para sitio: ${site.name} (${site.url})`);
      
      // Realizar verificación HTTP
      const startTime = performance.now();
      
      const response = await axios.get(site.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MicroSaasMonitor/1.0'
        },
        validateStatus: false // Para capturar cualquier código de estado
      });
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      // Analizar resultados
      const statusCode = response.status;
      const isAvailable = statusCode >= 200 && statusCode < 400;
      const contentType = response.headers['content-type'] || '';
      const contentLength = response.headers['content-length'] || 
                           (response.data ? response.data.length : 0);
      
      // Crear objeto de resultados
      const checkResult = {
        timestamp: new Date().toISOString(),
        available: isAvailable,
        responseTime,
        statusCode,
        contentType,
        contentLength,
        headers: response.headers,
        url: site.url
      };
      
      // Actualizar métricas del sitio
      await SiteModel.updateMetrics(siteId, checkResult);
      
      // Registrar en log
      await LogService.createLog({
        type: 'monitor',
        action: 'check',
        message: `Monitor check for ${site.name}: ${isAvailable ? 'Success' : 'Failed'}`,
        userId: site.userId,
        siteId: site.$id,
        siteName: site.name,
        status: isAvailable ? 'success' : 'error',
        severity: this._calculateSeverity(isAvailable, responseTime, site.alertThreshold),
        details: {
          responseTime,
          statusCode,
          contentType,
          contentLength
        },
        metadata: {
          url: site.url,
          timestamp: checkResult.timestamp
        }
      });
      
      return checkResult;
    } catch (error) {
      logger.error(`Error al realizar verificación básica: ${error.message}`);
      
      // Registrar error en log si tenemos la información del sitio
      if (error.site) {
        await LogService.createLog({
          type: 'monitor',
          action: 'check',
          message: `Error al verificar ${error.site.name}: ${error.message}`,
          userId: error.site.userId,
          siteId: error.site.$id,
          siteName: error.site.name,
          status: 'error',
          severity: 'high',
          details: {
            error: error.message,
            stack: error.stack
          }
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Check SSL certificate (alias for checkSSLCertificate)
   * @param {string} siteId - Site ID to check
   * @returns {Object} SSL certificate info
   */
  async checkSSL(siteId) {
    return this.checkSSLCertificate(siteId);
  }
  
  /**
   * Check SSL certificate for a website
   * @param {string} siteId - Site ID to check
   * @returns {Object} SSL certificate info
   */
  async checkSSLCertificate(siteId) {
    try {
      // Obtener información del sitio
      const site = await SiteModel.getById(siteId);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      if (!site.url.startsWith('https://')) {
        return {
          valid: false,
          message: 'El sitio no utiliza HTTPS'
        };
      }
      
      logger.debug(`Verificando certificado SSL para sitio: ${site.name}`);
      
      // Extraer el hostname de la URL
      const url = new URL(site.url);
      const hostname = url.hostname;
      
      return new Promise((resolve, reject) => {
        const req = https.request({
          host: hostname,
          port: 443,
          method: 'GET',
          rejectUnauthorized: false // Permitir certificados autofirmados
        }, (res) => {
          const cert = res.socket.getPeerCertificate();
          
          if (Object.keys(cert).length === 0) {
            resolve({
              valid: false,
              message: 'No se pudo obtener información del certificado'
            });
            return;
          }
          
          const currentTime = Date.now();
          const validTo = new Date(cert.valid_to).getTime();
          const daysRemaining = Math.floor((validTo - currentTime) / (1000 * 60 * 60 * 24));
          
          const sslInfo = {
            valid: true,
            issuer: cert.issuer,
            subject: cert.subject,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysRemaining,
            fingerprint: cert.fingerprint,
            serialNumber: cert.serialNumber
          };
          
          // Registrar en log
          LogService.createLog({
            type: 'monitor',
            action: 'ssl-check',
            message: `SSL check for ${site.name}: ${daysRemaining} days remaining`,
            userId: site.userId,
            siteId: site.$id,
            siteName: site.name,
            status: 'success',
            severity: daysRemaining < 7 ? 'high' : (daysRemaining < 30 ? 'medium' : 'low'),
            details: sslInfo
          });
          
          resolve(sslInfo);
        });
        
        req.on('error', (error) => {
          LogService.createLog({
            type: 'monitor',
            action: 'ssl-check',
            message: `Error SSL check for ${site.name}: ${error.message}`,
            userId: site.userId,
            siteId: site.$id,
            siteName: site.name,
            status: 'error',
            severity: 'high',
            details: { error: error.message }
          });
          
          reject(error);
        });
        
        req.end();
      });
    } catch (error) {
      logger.error(`Error al verificar certificado SSL: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check website for specific keywords
   * @param {string} siteId - Site ID to check
   * @returns {Object} Keyword check results
   */
  async checkKeywords(siteId) {
    try {
      // Obtener información del sitio
      const site = await SiteModel.getById(siteId);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      // Verificar si hay palabras clave para buscar
      const keywords = site.checkKeywords || [];
      if (keywords.length === 0) {
        return {
          message: 'No hay palabras clave configuradas para verificar',
          matches: {}
        };
      }
      
      logger.debug(`Verificando palabras clave para sitio: ${site.name}`);
      
      // Obtener contenido del sitio
      const response = await axios.get(site.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'MicroSaasMonitor/1.0'
        }
      });
      
      // Cargar HTML para análisis
      const $ = cheerio.load(response.data);
      
      // Eliminar scripts y estilos para analizar solo el contenido visible
      $('script, style').remove();
      const bodyText = $('body').text().toLowerCase();
      
      // Verificar palabras clave
      const matches = {};
      let missingKeywords = [];
      
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        const count = (bodyText.match(new RegExp(keywordLower, 'g')) || []).length;
        matches[keyword] = count;
        
        if (count === 0) {
          missingKeywords.push(keyword);
        }
      });
      
      // Crear resultado
      const keywordResult = {
        matches,
        totalMatches: Object.values(matches).reduce((sum, count) => sum + count, 0),
        missingKeywords,
        allKeywordsPresent: missingKeywords.length === 0
      };
      
      // Registrar en log
      LogService.createLog({
        type: 'monitor',
        action: 'keyword-check',
        message: `Keyword check for ${site.name}: ${keywordResult.allKeywordsPresent ? 'All present' : `Missing ${missingKeywords.length}`}`,
        userId: site.userId,
        siteId: site.$id,
        siteName: site.name,
        status: keywordResult.allKeywordsPresent ? 'success' : 'warning',
        severity: keywordResult.allKeywordsPresent ? 'low' : 'medium',
        details: keywordResult
      });
      
      return keywordResult;
    } catch (error) {
      logger.error(`Error al verificar palabras clave: ${error.message}`);
      
      // Registrar error en log
      if (error.site) {
        LogService.createLog({
          type: 'monitor',
          action: 'keyword-check',
          message: `Error al verificar palabras clave para ${error.site.name}: ${error.message}`,
          userId: error.site.userId,
          siteId: error.site.$id,
          siteName: error.site.name,
          status: 'error',
          severity: 'medium',
          details: { error: error.message }
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Check website performance (alias for analyzePerformance)
   * @param {string} siteId - Site ID to check
   * @returns {Object} Performance metrics
   */
  async checkPerformance(siteId) {
    return this.analyzePerformance(siteId);
  }
  
  /**
   * Analyze website performance
   * @param {string} siteId - Site ID to analyze
   * @returns {Object} Performance metrics
   */
  async analyzePerformance(siteId) {
    try {
      // Obtener información del sitio
      const site = await SiteModel.getById(siteId);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      logger.debug(`Analizando rendimiento para sitio: ${site.name}`);
      
      // Realizar verificación de rendimiento
      const startTime = performance.now();
      
      const response = await axios.get(site.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'MicroSaasMonitor/1.0'
        }
      });
      
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      
      // Cargar HTML para análisis
      const $ = cheerio.load(response.data);
      
      // Analizar recursos
      const images = $('img').length;
      const scripts = $('script').length;
      const stylesheets = $('link[rel="stylesheet"]').length;
      const fonts = $('link[rel="preload"][as="font"]').length;
      const totalElements = $('*').length;
      
      // Analizar tamaño de página
      const pageSize = response.data.length;
      const pageSizeKB = Math.round(pageSize / 1024);
      
      // Análisis de recursos grandes
      const imagesSizes = [];
      $('img').each((i, img) => {
        if ($(img).attr('src')) {
          imagesSizes.push({
            src: $(img).attr('src'),
            width: $(img).attr('width') || 'unknown',
            height: $(img).attr('height') || 'unknown',
            alt: $(img).attr('alt') || 'missing'
          });
        }
      });
      
      // Identificar problemas de rendimiento
      const performanceIssues = [];
      
      if (loadTime > 2000) {
        performanceIssues.push({
          type: 'slow-loading',
          severity: loadTime > 5000 ? 'high' : 'medium',
          message: `Tiempo de carga elevado: ${loadTime}ms`
        });
      }
      
      if (scripts > 15) {
        performanceIssues.push({
          type: 'many-scripts',
          severity: 'medium',
          message: `Gran cantidad de scripts: ${scripts}`
        });
      }
      
      if (pageSizeKB > 1500) {
        performanceIssues.push({
          type: 'large-page',
          severity: pageSizeKB > 3000 ? 'high' : 'medium',
          message: `Página demasiado grande: ${pageSizeKB}KB`
        });
      }
      
      // Verificar uso de lazy loading en imágenes
      let imagesWithoutLazy = 0;
      $('img:not([loading="lazy"])').each(() => {
        imagesWithoutLazy++;
      });
      
      if (imagesWithoutLazy > 3) {
        performanceIssues.push({
          type: 'missing-lazy-loading',
          severity: 'medium',
          message: `${imagesWithoutLazy} imágenes sin atributo lazy loading`
        });
      }
      
      // Crear resultado de rendimiento
      const performanceResult = {
        loadTime,
        pageSize: pageSizeKB,
        resources: {
          images,
          scripts,
          stylesheets,
          fonts,
          totalElements
        },
        imageDetails: imagesSizes,
        issues: performanceIssues,
        score: this._calculatePerformanceScore(loadTime, pageSizeKB, images, scripts, performanceIssues.length)
      };
      
      // Registrar en log
      LogService.createLog({
        type: 'monitor',
        action: 'performance',
        message: `Performance analysis for ${site.name}: Score ${performanceResult.score}/100`,
        userId: site.userId,
        siteId: site.$id,
        siteName: site.name,
        status: performanceResult.score > 70 ? 'success' : 'warning',
        severity: performanceResult.score < 50 ? 'high' : (performanceResult.score < 70 ? 'medium' : 'low'),
        details: performanceResult
      });
      
      return performanceResult;
    } catch (error) {
      logger.error(`Error al analizar rendimiento: ${error.message}`);
      
      // Registrar error en log
      if (error.site) {
        LogService.createLog({
          type: 'monitor',
          action: 'performance',
          message: `Error al analizar rendimiento para ${error.site.name}: ${error.message}`,
          userId: error.site.userId,
          siteId: error.site.$id,
          siteName: error.site.name,
          status: 'error',
          severity: 'medium',
          details: { error: error.message }
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Identify hotspots (problematic areas) on a website
   * @param {string} siteId - Site ID to analyze
   * @returns {Object} Hotspots and recommendations
   */
  async identifyHotspots(siteId) {
    try {
      // Obtener información del sitio y su rendimiento
      const site = await SiteModel.getById(siteId);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      logger.debug(`Identificando puntos críticos para sitio: ${site.name}`);
      
      // Primero analizar el rendimiento para identificar problemas
      const performanceData = await this.analyzePerformance(siteId);
      
      // También verificar SSL
      let sslData = null;
      try {
        sslData = await this.checkSSLCertificate(siteId);
      } catch (err) {
        logger.warn(`No se pudo verificar SSL: ${err.message}`);
      }
      
      // Organizar problemas por categorías
      const hotspots = [];
      
      // 1. Problemas de rendimiento
      performanceData.issues.forEach(issue => {
        let recommendation = '';
        
        switch (issue.type) {
          case 'slow-loading':
            recommendation = 'Optimizar recursos, habilitar compresión y cache, considerar CDN';
            break;
          case 'many-scripts':
            recommendation = 'Combinar y minificar scripts, cargar de forma asíncrona o diferida';
            break;
          case 'large-page':
            recommendation = 'Optimizar imágenes, minificar CSS/JS, eliminar recursos no utilizados';
            break;
          case 'missing-lazy-loading':
            recommendation = 'Implementar atributo loading="lazy" en imágenes fuera de la vista inicial';
            break;
        }
        
        hotspots.push({
          category: 'performance',
          type: issue.type,
          severity: issue.severity,
          description: issue.message,
          recommendation: recommendation,
          impact: issue.severity === 'high' ? 'Alto impacto en la experiencia de usuario' : 
                  (issue.severity === 'medium' ? 'Impacto moderado en la experiencia' : 'Bajo impacto en la experiencia')
        });
      });
      
      // 2. Problemas de SSL
      if (sslData && !sslData.valid) {
        hotspots.push({
          category: 'security',
          type: 'invalid-ssl',
          severity: 'high',
          description: sslData.message || 'Certificado SSL no válido',
          recommendation: 'Adquirir e instalar un certificado SSL válido',
          impact: 'Alto impacto en seguridad y confianza del usuario'
        });
      } else if (sslData && sslData.daysRemaining < 30) {
        hotspots.push({
          category: 'security',
          type: 'expiring-ssl',
          severity: sslData.daysRemaining < 7 ? 'high' : 'medium',
          description: `Certificado SSL expira en ${sslData.daysRemaining} días`,
          recommendation: 'Renovar el certificado SSL antes de su expiración',
          impact: 'Potencial interrupción del servicio si expira'
        });
      }
      
      // 3. Imágenes grandes
      const largeImages = performanceData.imageDetails.filter(img => {
        // Si tenemos dimensiones, verificar imágenes grandes
        if (img.width !== 'unknown' && img.height !== 'unknown') {
          return parseInt(img.width) > 1200 || parseInt(img.height) > 1200;
        }
        return false;
      });
      
      if (largeImages.length > 0) {
        hotspots.push({
          category: 'performance',
          type: 'large-images',
          severity: 'medium',
          description: `${largeImages.length} imágenes con dimensiones excesivas`,
          recommendation: 'Redimensionar imágenes según su uso y servir tamaños diferentes según el dispositivo',
          impact: 'Aumenta el tiempo de carga y consume ancho de banda innecesario',
          affected: largeImages
        });
      }
      
      // 4. Imágenes sin texto alternativo
      const imagesWithoutAlt = performanceData.imageDetails.filter(img => 
        img.alt === 'missing' || img.alt === ''
      );
      
      if (imagesWithoutAlt.length > 0) {
        hotspots.push({
          category: 'accessibility',
          type: 'missing-alt',
          severity: 'medium',
          description: `${imagesWithoutAlt.length} imágenes sin texto alternativo`,
          recommendation: 'Añadir atributos alt descriptivos a todas las imágenes',
          impact: 'Reduce la accesibilidad y afecta el SEO',
          affected: imagesWithoutAlt
        });
      }
      
      // Ordenar hotspots por severidad
      hotspots.sort((a, b) => {
        const severityWeight = { high: 3, medium: 2, low: 1 };
        return severityWeight[b.severity] - severityWeight[a.severity];
      });
      
      // Crear resultado de análisis de puntos críticos
      const hotspotResult = {
        timestamp: new Date().toISOString(),
        site: {
          id: site.$id,
          name: site.name,
          url: site.url
        },
        totalIssues: hotspots.length,
        criticalIssues: hotspots.filter(h => h.severity === 'high').length,
        byCategory: {
          performance: hotspots.filter(h => h.category === 'performance').length,
          security: hotspots.filter(h => h.category === 'security').length,
          accessibility: hotspots.filter(h => h.category === 'accessibility').length,
          seo: hotspots.filter(h => h.category === 'seo').length
        },
        hotspots,
        overallHealth: this._calculateOverallHealth(hotspots)
      };
      
      // Registrar en log
      LogService.createLog({
        type: 'monitor',
        action: 'hotspots',
        message: `Hotspot analysis for ${site.name}: ${hotspotResult.totalIssues} issues found`,
        userId: site.userId,
        siteId: site.$id,
        siteName: site.name,
        status: hotspotResult.criticalIssues > 0 ? 'warning' : 'success',
        severity: hotspotResult.criticalIssues > 0 ? 'high' : (hotspotResult.totalIssues > 5 ? 'medium' : 'low'),
        details: {
          totalIssues: hotspotResult.totalIssues,
          criticalIssues: hotspotResult.criticalIssues,
          byCategory: hotspotResult.byCategory,
          overallHealth: hotspotResult.overallHealth
        }
      });
      
      return hotspotResult;
    } catch (error) {
      logger.error(`Error al identificar puntos críticos: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Run a complete check for a site (alias for runCompleteCheck)
   * @param {string} siteId - Site ID to check
   * @param {Object} options - Additional options
   * @returns {Object} Check results
   */
  async runFullCheck(siteId, options = {}) {
    return this.runCompleteCheck(siteId, options);
  }
  
  /**
   * Run a complete check for a site
   * @param {string} siteId - Site ID to check
   * @param {Object} options - Additional options
   * @returns {Object} Check results
   */
  async runCompleteCheck(siteId, options = {}) {
    try {
      // Obtener información del sitio
      const site = await SiteModel.getById(siteId);
      if (!site) {
        throw new Error('Sitio no encontrado');
      }
      
      logger.info(`Iniciando verificación completa para sitio: ${site.name} (${site.url})`);
      
      // Ejecutar todas las verificaciones
      const results = {
        timestamp: new Date().toISOString(),
        siteId: site.$id,
        siteName: site.name,
        url: site.url,
        basic: await this.performBasicCheck(siteId),
        ssl: site.checkSSL ? await this.checkSSLCertificate(siteId) : { skipped: true },
        keywords: site.checkKeywords && site.checkKeywords.length > 0 ? 
                 await this.checkKeywords(siteId) : { skipped: true },
        performance: site.monitorSettings.checkPerformance ? 
                    await this.analyzePerformance(siteId) : { skipped: true }
      };
      
      // Añadir hotspots solo si se ha verificado el rendimiento
      if (!results.performance.skipped) {
        results.hotspots = await this.identifyHotspots(siteId);
      }
      
      // Registrar verificación completa en log
      LogService.createLog({
        type: 'monitor',
        action: 'complete-check',
        message: `Complete check for ${site.name}`,
        userId: site.userId,
        siteId: site.$id,
        siteName: site.name,
        status: 'success',
        details: {
          basic: {
            available: results.basic.available,
            responseTime: results.basic.responseTime,
            statusCode: results.basic.statusCode
          },
          ssl: results.ssl.skipped ? { skipped: true } : {
            valid: results.ssl.valid,
            daysRemaining: results.ssl.daysRemaining
          },
          performance: results.performance.skipped ? { skipped: true } : {
            score: results.performance.score,
            loadTime: results.performance.loadTime,
            issuesCount: results.performance.issues.length
          },
          hotspots: results.hotspots ? {
            totalIssues: results.hotspots.totalIssues,
            criticalIssues: results.hotspots.criticalIssues
          } : { skipped: true }
        }
      });
      
      return results;
    } catch (error) {
      logger.error(`Error al realizar verificación completa: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get monitoring history (alias for getMonitoringHistory)
   * @param {string} siteId - Site ID to get history for
   * @param {Object} options - Filter options
   * @returns {Array} Monitoring history records
   */
  async getMonitorHistory(siteId, options = {}) {
    return this.getMonitoringHistory(siteId, options);
  }
  
  /**
   * Get monitoring history for a site
   * @param {string} siteId - Site ID to get history for
   * @param {Object} options - Filter options
   * @returns {Array} Monitoring history records
   */
  async getMonitoringHistory(siteId, options = {}) {
    try {
      // Obtener logs de monitoreo para el sitio
      const { limit = 100, startDate, endDate, actions = [] } = options;
      
      // Construir consulta para logs
      const query = {
        siteId,
        type: 'monitor',
        limit,
        startDate,
        endDate
      };
      
      // Filtrar por acciones específicas si se proporcionan
      if (actions.length > 0) {
        query.actions = actions;
      }
      
      // Obtener logs
      const logs = await LogService.getLogs(query);
      
      // Agrupar por tipo de verificación
      const responseTimeHistory = [];
      const availabilityHistory = [];
      const sslHistory = [];
      const performanceHistory = [];
      
      logs.forEach(log => {
        const timestamp = log.createdAt;
        
        // Agrupar por tipo de acción
        switch (log.action) {
          case 'check':
            if (log.details && log.details.responseTime) {
              responseTimeHistory.push({
                timestamp,
                value: log.details.responseTime,
                status: log.status
              });
              
              availabilityHistory.push({
                timestamp,
                value: log.status === 'success' ? 1 : 0
              });
            }
            break;
            
          case 'ssl-check':
            if (log.details) {
              sslHistory.push({
                timestamp,
                valid: log.details.valid,
                daysRemaining: log.details.daysRemaining
              });
            }
            break;
            
          case 'performance':
            if (log.details && log.details.score) {
              performanceHistory.push({
                timestamp,
                score: log.details.score,
                loadTime: log.details.loadTime
              });
            }
            break;
        }
      });
      
      // Calcular promedios y tendencias
      let avgResponseTime = 0;
      let uptime = 0;
      
      if (responseTimeHistory.length > 0) {
        avgResponseTime = responseTimeHistory.reduce((sum, item) => sum + item.value, 0) / 
                          responseTimeHistory.length;
      }
      
      if (availabilityHistory.length > 0) {
        uptime = (availabilityHistory.reduce((sum, item) => sum + item.value, 0) / 
                 availabilityHistory.length) * 100;
      }
      
      return {
        siteId,
        period: {
          from: startDate || logs[logs.length - 1]?.createdAt || null,
          to: endDate || logs[0]?.createdAt || null
        },
        summary: {
          totalChecks: responseTimeHistory.length,
          avgResponseTime: Math.round(avgResponseTime),
          uptime: Math.round(uptime * 100) / 100, // Dos decimales
          lastCheck: responseTimeHistory[0] || null
        },
        history: {
          responseTime: responseTimeHistory,
          availability: availabilityHistory,
          ssl: sslHistory,
          performance: performanceHistory
        }
      };
    } catch (error) {
      logger.error(`Error al obtener historial de monitoreo: ${error.message}`);
      throw error;
    }
  }
  
  // Utilidades privadas
  
  /**
   * Calculate severity level based on check results
   * @param {boolean} isAvailable - Is the site available
   * @param {number} responseTime - Response time in ms
   * @param {number} threshold - Alert threshold
   * @returns {string} Severity level
   * @private
   */
  _calculateSeverity(isAvailable, responseTime, threshold) {
    if (!isAvailable) {
      return 'high';
    }
    
    if (responseTime > threshold * 1.5) {
      return 'high';
    }
    
    if (responseTime > threshold) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Calculate performance score based on metrics
   * @param {number} loadTime - Page load time in ms
   * @param {number} pageSize - Page size in KB
   * @param {number} images - Number of images
   * @param {number} scripts - Number of scripts
   * @param {number} issuesCount - Number of issues found
   * @returns {number} Performance score (0-100)
   * @private
   */
  _calculatePerformanceScore(loadTime, pageSize, images, scripts, issuesCount) {
    // Pesos para cada factor
    const weights = {
      loadTime: 0.4,
      pageSize: 0.2,
      resources: 0.2,
      issues: 0.2
    };
    
    // Calcular puntuación para cada factor (mayor es mejor)
    let loadTimeScore = 100;
    if (loadTime > 5000) loadTimeScore = 0;
    else if (loadTime > 3000) loadTimeScore = 30;
    else if (loadTime > 2000) loadTimeScore = 60;
    else if (loadTime > 1000) loadTimeScore = 80;
    
    let pageSizeScore = 100;
    if (pageSize > 5000) pageSizeScore = 0;
    else if (pageSize > 3000) pageSizeScore = 30;
    else if (pageSize > 1500) pageSizeScore = 60;
    else if (pageSize > 800) pageSizeScore = 80;
    
    let resourcesScore = 100;
    const totalResources = images + scripts;
    if (totalResources > 80) resourcesScore = 0;
    else if (totalResources > 60) resourcesScore = 30;
    else if (totalResources > 40) resourcesScore = 60;
    else if (totalResources > 20) resourcesScore = 80;
    
    let issuesScore = 100;
    if (issuesCount > 8) issuesScore = 0;
    else if (issuesCount > 5) issuesScore = 30;
    else if (issuesCount > 3) issuesScore = 60;
    else if (issuesCount > 0) issuesScore = 80;
    
    // Calcular puntuación final ponderada
    const finalScore = Math.round(
      (loadTimeScore * weights.loadTime) +
      (pageSizeScore * weights.pageSize) +
      (resourcesScore * weights.resources) +
      (issuesScore * weights.issues)
    );
    
    return finalScore;
  }
  
  /**
   * Calculate overall health based on hotspots
   * @param {Array} hotspots - List of hotspots
   * @returns {Object} Health score and status
   * @private
   */
  _calculateOverallHealth(hotspots) {
    // Contar problemas por severidad
    const highCount = hotspots.filter(h => h.severity === 'high').length;
    const mediumCount = hotspots.filter(h => h.severity === 'medium').length;
    const lowCount = hotspots.filter(h => h.severity === 'low').length;
    
    // Pesos por severidad
    const weights = {
      high: 5,
      medium: 2,
      low: 0.5
    };
    
    // Calcular puntuación (menor es mejor)
    const score = (highCount * weights.high) + (mediumCount * weights.medium) + (lowCount * weights.low);
    
    // Determinar estado de salud
    let status = 'healthy';
    let percentage = 100;
    
    if (score > 10 || highCount > 0) {
      status = 'critical';
      percentage = Math.max(0, 100 - (score * 5));
    } else if (score > 5 || mediumCount > 3) {
      status = 'warning';
      percentage = Math.max(50, 100 - (score * 5));
    } else if (score > 0) {
      status = 'good';
      percentage = Math.max(80, 100 - (score * 2));
    }
    
    return {
      status,
      percentage: Math.round(percentage),
      score: Math.round(score * 10) / 10
    };
  }
}

module.exports = new MonitorService(); 