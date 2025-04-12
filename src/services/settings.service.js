const { databases, DATABASE_ID, Query, ID } = require('../config/appwrite');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Collection IDs
const SETTINGS_COLLECTION_ID = 'settings';
const SETTINGS_HISTORY_COLLECTION_ID = 'settings_history';
const SETTINGS_TEMPLATES_COLLECTION_ID = 'settings_templates';

/**
 * Servicio para gestionar configuraciones avanzadas del sistema
 */
class SettingsService {
  /**
   * Encripta un valor sensible
   * @param {any} value - Valor a encriptar
   * @returns {string} - Valor encriptado
   */
  encryptValue(value) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Error encriptando valor:', error);
      throw new Error('Error al encriptar valor');
    }
  }
  
  /**
   * Desencripta un valor sensible
   * @param {string} encryptedValue - Valor encriptado
   * @returns {any} - Valor original
   */
  decryptValue(encryptedValue) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);
      
      const [ivHex, encrypted] = encryptedValue.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error desencriptando valor:', error);
      throw new Error('Error al desencriptar valor');
    }
  }
  
  /**
   * Valida un valor según las reglas de validación
   * @param {any} value - Valor a validar
   * @param {Object} rules - Reglas de validación
   * @returns {Object} - Resultado de la validación {isValid, errors}
   */
  validateValue(value, rules) {
    if (!rules) return { isValid: true, errors: [] };
    
    const errors = [];
    
    // Validar tipo de dato
    if (rules.type && typeof value !== rules.type) {
      errors.push(`Tipo de dato inválido. Se esperaba ${rules.type}`);
    }
    
    // Validar rango numérico
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`El valor debe ser mayor o igual a ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`El valor debe ser menor o igual a ${rules.max}`);
      }
    }
    
    // Validar longitud de cadenas
    if (rules.type === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`El texto debe tener al menos ${rules.minLength} caracteres`);
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`El texto debe tener como máximo ${rules.maxLength} caracteres`);
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        errors.push(`El formato del texto es inválido`);
      }
    }
    
    // Validar arrays
    if (Array.isArray(value) && rules.type === 'array') {
      if (rules.minItems !== undefined && value.length < rules.minItems) {
        errors.push(`La lista debe tener al menos ${rules.minItems} elementos`);
      }
      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push(`La lista debe tener como máximo ${rules.maxItems} elementos`);
      }
    }
    
    // Validar enumeraciones
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Valor no permitido. Valores permitidos: ${rules.enum.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Obtiene todas las configuraciones para un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de consulta (section, scope)
   * @returns {Array} - Lista de configuraciones
   */
  async getUserSettings(userId, options = {}) {
    try {
      const { section, scope = 'user' } = options;
      
      const queries = [
        Query.equal('userId', userId)
      ];
      
      if (section) {
        queries.push(Query.equal('section', section));
      }
      
      if (scope) {
        queries.push(Query.equal('scope', scope));
      }
      
      const settings = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        queries
      );
      
      // Desencriptar valores sensibles
      const formattedSettings = settings.documents.map(setting => {
        let value = setting.value;
        
        if (setting.isEncrypted) {
          try {
            value = this.decryptValue(setting.value);
          } catch (error) {
            logger.error(`Error desencriptando valor para configuración ${setting.$id}:`, error);
            value = null; // Evitar mostrar valores encriptados que no se pueden desencriptar
          }
        }
        
        return {
          id: setting.$id,
          userId: setting.userId,
          section: setting.section,
          key: setting.key,
          value,
          dataType: setting.dataType,
          isEncrypted: setting.isEncrypted,
          isDefault: setting.isDefault,
          metadata: setting.metadata,
          scope: setting.scope,
          roleId: setting.roleId,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        };
      });
      
      return formattedSettings;
    } catch (error) {
      logger.error('Error obteniendo configuraciones de usuario:', error);
      throw new Error('Error al obtener configuraciones de usuario');
    }
  }
  
  /**
   * Obtiene las configuraciones globales y específicas de un rol
   * @param {string} roleId - ID del rol
   * @param {Object} options - Opciones de consulta (section)
   * @returns {Array} - Lista de configuraciones
   */
  async getRoleSettings(roleId, options = {}) {
    try {
      const { section } = options;
      
      const queries = [
        Query.equal('scope', 'role'),
        Query.equal('roleId', roleId)
      ];
      
      if (section) {
        queries.push(Query.equal('section', section));
      }
      
      const settings = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        queries
      );
      
      // Obtener también configuraciones globales
      const globalQueries = [
        Query.equal('scope', 'global')
      ];
      
      if (section) {
        globalQueries.push(Query.equal('section', section));
      }
      
      const globalSettings = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        globalQueries
      );
      
      // Combinar y formatear configuraciones
      const allSettings = [...settings.documents, ...globalSettings.documents];
      
      // Desencriptar valores y darle formato
      const formattedSettings = allSettings.map(setting => {
        let value = setting.value;
        
        if (setting.isEncrypted) {
          try {
            value = this.decryptValue(setting.value);
          } catch (error) {
            logger.error(`Error desencriptando valor para configuración ${setting.$id}:`, error);
            value = null;
          }
        }
        
        return {
          id: setting.$id,
          userId: setting.userId,
          section: setting.section,
          key: setting.key,
          value,
          dataType: setting.dataType,
          isEncrypted: setting.isEncrypted,
          isDefault: setting.isDefault,
          metadata: setting.metadata,
          scope: setting.scope,
          roleId: setting.roleId,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        };
      });
      
      return formattedSettings;
    } catch (error) {
      logger.error('Error obteniendo configuraciones de rol:', error);
      throw new Error('Error al obtener configuraciones de rol');
    }
  }
  
  /**
   * Obtiene todas las configuraciones para el sistema
   * @param {Object} options - Opciones de consulta (section, scope, userId, roleId)
   * @returns {Array} - Lista de configuraciones
   */
  async getAllSettings(options = {}) {
    try {
      const { section, scope, userId, roleId } = options;
      const queries = [];
      
      if (section) {
        queries.push(Query.equal('section', section));
      }
      
      if (scope) {
        queries.push(Query.equal('scope', scope));
      }
      
      if (userId) {
        queries.push(Query.equal('userId', userId));
      }
      
      if (roleId) {
        queries.push(Query.equal('roleId', roleId));
      }
      
      const settings = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        queries
      );
      
      // Desencriptar y formatear
      const formattedSettings = settings.documents.map(setting => {
        // Solo mostrar valores encriptados a administradores
        let value = setting.value;
        
        if (setting.isEncrypted) {
          // En este caso no desencriptamos para administradores
          // ya que esta función es para listar todas las configuraciones
          value = '[ENCRYPTED]';
        }
        
        return {
          id: setting.$id,
          userId: setting.userId,
          section: setting.section,
          key: setting.key,
          value,
          dataType: setting.dataType,
          isEncrypted: setting.isEncrypted,
          isDefault: setting.isDefault,
          metadata: setting.metadata,
          scope: setting.scope,
          roleId: setting.roleId,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        };
      });
      
      return formattedSettings;
    } catch (error) {
      logger.error('Error obteniendo todas las configuraciones:', error);
      throw new Error('Error al obtener configuraciones');
    }
  }
  
  /**
   * Obtiene una configuración específica
   * @param {string} id - ID de la configuración
   * @returns {Object} - Configuración
   */
  async getSetting(id) {
    try {
      const setting = await databases.getDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        id
      );
      
      let value = setting.value;
      
      if (setting.isEncrypted) {
        try {
          value = this.decryptValue(setting.value);
        } catch (error) {
          logger.error(`Error desencriptando valor para configuración ${setting.$id}:`, error);
          value = null;
        }
      }
      
      return {
        id: setting.$id,
        userId: setting.userId,
        section: setting.section,
        key: setting.key,
        value,
        dataType: setting.dataType,
        isEncrypted: setting.isEncrypted,
        isDefault: setting.isDefault,
        metadata: setting.metadata,
        scope: setting.scope,
        roleId: setting.roleId,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      };
    } catch (error) {
      logger.error(`Error obteniendo configuración ${id}:`, error);
      throw new Error('Error al obtener configuración');
    }
  }
  
  /**
   * Crea una nueva configuración
   * @param {Object} settingData - Datos de la configuración
   * @param {string} userId - ID del usuario que crea la configuración
   * @returns {Object} - Configuración creada
   */
  async createSetting(settingData, userId) {
    try {
      const {
        section,
        key,
        value,
        dataType,
        isEncrypted = false,
        isDefault = false,
        metadata = {},
        scope = 'user',
        roleId = null,
        targetUserId = null
      } = settingData;
      
      // Validar que la sección existe
      const validSections = ['general', 'notifications', 'security', 'display', 'integrations', 'billing'];
      if (!validSections.includes(section)) {
        throw new Error(`Sección '${section}' no válida`);
      }
      
      // Validar que el tipo de dato es válido
      const validDataTypes = ['string', 'number', 'boolean', 'object', 'array'];
      if (!validDataTypes.includes(dataType)) {
        throw new Error(`Tipo de dato '${dataType}' no válido`);
      }
      
      // Validar valor según las reglas definidas en los metadatos
      if (metadata.validationRules) {
        const validation = this.validateValue(value, metadata.validationRules);
        if (!validation.isValid) {
          throw new Error(`Validación fallida: ${validation.errors.join(', ')}`);
        }
      }
      
      // Preparar valor (encriptar si es necesario)
      let processedValue = value;
      if (isEncrypted) {
        processedValue = this.encryptValue(value);
      } else if (typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }
      
      // Verificar si ya existe una configuración con la misma clave en la misma sección
      const existingQuery = [
        Query.equal('section', section),
        Query.equal('key', key)
      ];
      
      // Si es una configuración de usuario, verificar solo para ese usuario
      if (scope === 'user') {
        existingQuery.push(Query.equal('userId', targetUserId || userId));
      } 
      // Si es una configuración de rol, verificar para ese rol
      else if (scope === 'role') {
        existingQuery.push(Query.equal('roleId', roleId));
      }
      // Si es global, verificar todas las globales
      else if (scope === 'global') {
        existingQuery.push(Query.equal('scope', 'global'));
      }
      
      const existingSettings = await databases.listDocuments(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        existingQuery
      );
      
      if (existingSettings.total > 0) {
        throw new Error(`Ya existe una configuración con la clave '${key}' en la sección '${section}'`);
      }
      
      // Crear el documento de configuración
      const settingDocument = {
        userId: targetUserId || (scope === 'user' ? userId : null),
        section,
        key,
        value: processedValue,
        dataType,
        isEncrypted,
        isDefault,
        metadata: JSON.stringify(metadata),
        scope,
        roleId: scope === 'role' ? roleId : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const createdSetting = await databases.createDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        ID.unique(),
        settingDocument
      );
      
      // Formatear respuesta
      let responseValue = value;
      if (isEncrypted) {
        // No devolver el valor encriptado en la respuesta
        responseValue = '[ENCRYPTED]';
      }
      
      return {
        id: createdSetting.$id,
        userId: createdSetting.userId,
        section: createdSetting.section,
        key: createdSetting.key,
        value: responseValue,
        dataType: createdSetting.dataType,
        isEncrypted: createdSetting.isEncrypted,
        isDefault: createdSetting.isDefault,
        metadata: JSON.parse(createdSetting.metadata),
        scope: createdSetting.scope,
        roleId: createdSetting.roleId,
        createdAt: createdSetting.createdAt,
        updatedAt: createdSetting.updatedAt
      };
    } catch (error) {
      logger.error('Error creando configuración:', error);
      throw new Error(`Error al crear configuración: ${error.message}`);
    }
  }
  
  /**
   * Actualiza una configuración existente
   * @param {string} id - ID de la configuración
   * @param {Object} settingData - Datos a actualizar
   * @param {string} userId - ID del usuario que realiza la actualización
   * @param {string} reason - Razón del cambio (opcional)
   * @returns {Object} - Configuración actualizada
   */
  async updateSetting(id, settingData, userId, reason = null) {
    try {
      // Obtener la configuración existente
      const existingSetting = await databases.getDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        id
      );
      
      // Crear entrada en el historial antes de actualizar
      const previousValue = existingSetting.isEncrypted 
        ? '[ENCRYPTED]' 
        : existingSetting.value;
      
      const historyEntry = {
        settingId: id,
        previousValue,
        newValue: settingData.value 
          ? (settingData.isEncrypted ? '[ENCRYPTED]' : settingData.value) 
          : previousValue,
        changedBy: userId,
        changedAt: new Date().toISOString(),
        reason
      };
      
      await databases.createDocument(
        DATABASE_ID,
        SETTINGS_HISTORY_COLLECTION_ID,
        ID.unique(),
        historyEntry
      );
      
      // Preparar datos para actualización
      const updateData = {};
      
      // Solo actualizar los campos proporcionados
      if (settingData.value !== undefined) {
        // Si se va a encriptar, procesarlo
        if (settingData.isEncrypted || existingSetting.isEncrypted) {
          updateData.value = this.encryptValue(settingData.value);
        } 
        // Si es un objeto, convertirlo a string
        else if (typeof settingData.value === 'object') {
          updateData.value = JSON.stringify(settingData.value);
        }
        // De lo contrario, usar el valor tal cual
        else {
          updateData.value = settingData.value;
        }
      }
      
      if (settingData.metadata !== undefined) {
        updateData.metadata = JSON.stringify(settingData.metadata);
      }
      
      if (settingData.isEncrypted !== undefined) {
        updateData.isEncrypted = settingData.isEncrypted;
      }
      
      if (settingData.isDefault !== undefined) {
        updateData.isDefault = settingData.isDefault;
      }
      
      // Siempre actualizar la fecha de modificación
      updateData.updatedAt = new Date().toISOString();
      
      // Realizar la actualización
      const updatedSetting = await databases.updateDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        id,
        updateData
      );
      
      // Formatear respuesta
      let responseValue = updatedSetting.value;
      
      if (updatedSetting.isEncrypted) {
        try {
          // Intentar desencriptar para el usuario propietario
          responseValue = this.decryptValue(updatedSetting.value);
        } catch (error) {
          // Si falla, no mostrar el valor
          responseValue = '[ENCRYPTED]';
        }
      }
      
      return {
        id: updatedSetting.$id,
        userId: updatedSetting.userId,
        section: updatedSetting.section,
        key: updatedSetting.key,
        value: responseValue,
        dataType: updatedSetting.dataType,
        isEncrypted: updatedSetting.isEncrypted,
        isDefault: updatedSetting.isDefault,
        metadata: JSON.parse(updatedSetting.metadata),
        scope: updatedSetting.scope,
        roleId: updatedSetting.roleId,
        createdAt: updatedSetting.createdAt,
        updatedAt: updatedSetting.updatedAt
      };
    } catch (error) {
      logger.error(`Error actualizando configuración ${id}:`, error);
      throw new Error(`Error al actualizar configuración: ${error.message}`);
    }
  }
}

module.exports = new SettingsService(); 