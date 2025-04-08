const axios = require('axios');
const User = require('../models/user.model');

/**
 * Service to handle webhook notifications
 */
class WebhookService {
  /**
   * Send data to a webhook URL
   * @param {String} userId - User ID
   * @param {Object} data - Data to send
   * @returns {Promise<Object>} - Webhook response or null
   */
  static async sendWebhook(userId, data) {
    try {
      // Get the user's webhook URL
      const user = await User.findById(userId);

      // If user doesn't have a webhook URL, just return
      if (!user || !user.webhookUrl) {
        return null;
      }

      // Send data to the webhook URL
      const response = await axios.post(user.webhookUrl, {
        timestamp: new Date(),
        userId: userId,
        data
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'micro-saas-backend'
        },
        timeout: 5000 // 5 second timeout to avoid hanging
      });

      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending webhook:', error.message);
      
      // Return error information but don't throw
      // Webhook failures shouldn't break the main application flow
      return {
        error: true,
        message: error.message,
        status: error.response?.status || 500
      };
    }
  }

  /**
   * Test webhook URL to ensure it's valid and accessible
   * @param {String} url - Webhook URL to test
   * @returns {Promise<Object>} - Test result
   */
  static async testWebhook(url) {
    try {
      // Send a test payload
      const response = await axios.post(url, {
        timestamp: new Date(),
        event: 'test',
        message: 'This is a test webhook from Micro SaaS Backend'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'micro-saas-backend',
          'X-Webhook-Test': 'true'
        },
        timeout: 5000
      });

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  }
}

module.exports = WebhookService; 