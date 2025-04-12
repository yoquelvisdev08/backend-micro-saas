const settingsService = require('../services/settings.service');
const logger = require('../utils/logger');

/**
 * Controlador para gestionar las configuraciones avanzadas del sistema
 */
const settingsController = {
  /**
   * Obtiene todas las configuraciones para el usuario autenticado
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getUserSettings(req, res) {
    try {
      const { section } = req.query;
      const userId = req.user.$id;
      
      // Obtener configuraciones del usuario
      const settings = await settingsService.getUserSettings(userId, { section });
      
      logger.info(`Usuario ${userId} obtuvo sus configuraciones`, {
        userId,
        action: 'get_user_settings',
        section
      });
      
      return res.status(200).json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('Error obteniendo configuraciones de usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene las configuraciones para un rol específico
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getRoleSettings(req, res) {
    try {
      const { roleId } = req.params;
      const { section } = req.query;
      const userId = req.user.$id;
      
      // Verificar que el usuario tiene permisos para ver configuraciones de rol
      if (!req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver configuraciones de roles'
        });
      }
      
      // Obtener configuraciones del rol
      const settings = await settingsService.getRoleSettings(roleId, { section });
      
      logger.info(`Usuario ${userId} obtuvo configuraciones del rol ${roleId}`, {
        userId,
        action: 'get_role_settings',
        roleId,
        section
      });
      
      return res.status(200).json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('Error obteniendo configuraciones de rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener configuraciones de rol',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene todas las configuraciones del sistema
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getAllSettings(req, res) {
    try {
      const { section, scope, userId, roleId } = req.query;
      const adminId = req.user.$id;
      
      // Verificar que el usuario tiene permisos de administrador
      if (!req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver todas las configuraciones'
        });
      }
      
      // Obtener todas las configuraciones del sistema
      const settings = await settingsService.getAllSettings({
        section,
        scope,
        userId,
        roleId
      });
      
      logger.info(`Administrador ${adminId} obtuvo todas las configuraciones`, {
        userId: adminId,
        action: 'get_all_settings',
        filters: { section, scope, userId, roleId }
      });
      
      return res.status(200).json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('Error obteniendo todas las configuraciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener todas las configuraciones',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene una configuración específica por ID
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getSetting(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.$id;
      
      // Obtener la configuración
      const setting = await settingsService.getSetting(id);
      
      // Verificar permisos
      const isAdmin = req.user.roles.includes('admin');
      const isOwner = setting.userId === userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver esta configuración'
        });
      }
      
      logger.info(`Usuario ${userId} obtuvo configuración ${id}`, {
        userId,
        action: 'get_setting',
        settingId: id
      });
      
      return res.status(200).json({
        success: true,
        setting
      });
    } catch (error) {
      logger.error(`Error obteniendo configuración:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener configuración',
        error: error.message
      });
    }
  },
  
  /**
   * Crea una nueva configuración
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async createSetting(req, res) {
    try {
      const {
        section,
        key,
        value,
        dataType,
        isEncrypted,
        isDefault,
        metadata,
        scope,
        roleId,
        targetUserId
      } = req.body;
      
      const userId = req.user.$id;
      const isAdmin = req.user.roles.includes('admin');
      
      // Verificar permisos según el ámbito
      if (!isAdmin && (scope === 'global' || scope === 'role')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para crear configuraciones globales o de rol'
        });
      }
      
      // Si se especifica un usuario destino, verificar que sea el propio usuario o un administrador
      if (targetUserId && targetUserId !== userId && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para crear configuraciones para otros usuarios'
        });
      }
      
      // Crear la configuración
      const setting = await settingsService.createSetting({
        section,
        key,
        value,
        dataType,
        isEncrypted,
        isDefault,
        metadata,
        scope,
        roleId,
        targetUserId
      }, userId);
      
      logger.info(`Usuario ${userId} creó configuración ${key}`, {
        userId,
        action: 'create_setting',
        settingKey: key,
        section,
        scope
      });
      
      return res.status(201).json({
        success: true,
        setting
      });
    } catch (error) {
      logger.error('Error creando configuración:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al crear configuración',
        error: error.message
      });
    }
  },
  
  /**
   * Actualiza una configuración existente
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async updateSetting(req, res) {
    try {
      const { id } = req.params;
      const {
        value,
        isEncrypted,
        isDefault,
        metadata,
        reason
      } = req.body;
      
      const userId = req.user.$id;
      
      // Obtener la configuración existente para verificar permisos
      const existingSetting = await settingsService.getSetting(id);
      
      // Verificar permisos
      const isAdmin = req.user.roles.includes('admin');
      const isOwner = existingSetting.userId === userId;
      
      // Los usuarios normales solo pueden actualizar sus propias configuraciones
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar esta configuración'
        });
      }
      
      // Los usuarios normales no pueden cambiar configuraciones globales o de rol
      if (!isAdmin && (existingSetting.scope === 'global' || existingSetting.scope === 'role')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para modificar configuraciones globales o de rol'
        });
      }
      
      // Actualizar la configuración
      const updatedSetting = await settingsService.updateSetting(
        id,
        {
          value,
          isEncrypted,
          isDefault,
          metadata
        },
        userId,
        reason
      );
      
      logger.info(`Usuario ${userId} actualizó configuración ${id}`, {
        userId,
        action: 'update_setting',
        settingId: id,
        reason
      });
      
      return res.status(200).json({
        success: true,
        setting: updatedSetting
      });
    } catch (error) {
      logger.error(`Error actualizando configuración:`, error);
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar configuración',
        error: error.message
      });
    }
  },
  
  /**
   * Obtiene el historial de cambios de una configuración
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getSettingHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.$id;
      
      // Verificar que la configuración existe
      const setting = await settingsService.getSetting(id);
      
      // Verificar permisos
      const isAdmin = req.user.roles.includes('admin');
      const isOwner = setting.userId === userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para ver el historial de esta configuración'
        });
      }
      
      // Obtener historial
      const history = await settingsService.getSettingHistory(id);
      
      logger.info(`Usuario ${userId} obtuvo historial de configuración ${id}`, {
        userId,
        action: 'get_setting_history',
        settingId: id
      });
      
      return res.status(200).json({
        success: true,
        history
      });
    } catch (error) {
      logger.error(`Error obteniendo historial de configuración:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial de configuración',
        error: error.message
      });
    }
  },
  
  /**
   * Elimina una configuración existente
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async deleteSetting(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.$id;
      
      // Obtener la configuración existente para verificar permisos
      const existingSetting = await settingsService.getSetting(id);
      
      // Verificar permisos
      const isAdmin = req.user.roles.includes('admin');
      const isOwner = existingSetting.userId === userId;
      
      // Solo administradores pueden eliminar configuraciones
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para eliminar esta configuración'
        });
      }
      
      // Los usuarios normales no pueden eliminar configuraciones globales o de rol
      if (!isAdmin && (existingSetting.scope === 'global' || existingSetting.scope === 'role')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para eliminar configuraciones globales o de rol'
        });
      }
      
      // Eliminar la configuración
      await settingsService.deleteSetting(id, userId);
      
      logger.info(`Usuario ${userId} eliminó configuración ${id}`, {
        userId,
        action: 'delete_setting',
        settingId: id
      });
      
      return res.status(200).json({
        success: true,
        message: 'Configuración eliminada correctamente'
      });
    } catch (error) {
      logger.error(`Error eliminando configuración:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar configuración',
        error: error.message
      });
    }
  },
  
  /**
   * Importa configuraciones desde un archivo JSON
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async importSettings(req, res) {
    try {
      const { settings } = req.body;
      const userId = req.user.$id;
      
      // Verificar que el usuario tiene permisos de administrador
      if (!req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para importar configuraciones'
        });
      }
      
      // Importar configuraciones
      const importResults = await settingsService.importSettings(settings, userId);
      
      logger.info(`Usuario ${userId} importó configuraciones`, {
        userId,
        action: 'import_settings',
        count: settings.length
      });
      
      return res.status(200).json({
        success: true,
        message: 'Configuraciones importadas correctamente',
        results: importResults
      });
    } catch (error) {
      logger.error('Error importando configuraciones:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al importar configuraciones',
        error: error.message
      });
    }
  },
  
  /**
   * Exporta todas las configuraciones a formato JSON
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async exportSettings(req, res) {
    try {
      const { scope, section } = req.query;
      const userId = req.user.$id;
      
      // Verificar que el usuario tiene permisos de administrador para exportar todo
      if (scope !== 'user' && !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para exportar configuraciones globales o de rol'
        });
      }
      
      // Exportar configuraciones
      const exportData = await settingsService.exportSettings({
        userId,
        scope,
        section,
        isAdmin: req.user.roles.includes('admin')
      });
      
      logger.info(`Usuario ${userId} exportó configuraciones`, {
        userId,
        action: 'export_settings',
        scope,
        section
      });
      
      return res.status(200).json({
        success: true,
        data: exportData
      });
    } catch (error) {
      logger.error('Error exportando configuraciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al exportar configuraciones',
        error: error.message
      });
    }
  }
};

module.exports = settingsController; 