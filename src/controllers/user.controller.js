const User = require('../models/user.model');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const LogService = require('../services/log.service');
const WebhookService = require('../services/webhook.service');

/**
 * @desc    Update user webhook URL
 * @route   PUT /api/users/webhook
 * @access  Private
 */
exports.updateWebhook = async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    // Validate the webhook URL
    if (!webhookUrl) {
      return sendErrorResponse(res, 'Webhook URL is required', 400);
    }
    
    // URL pattern validation
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;
    if (!urlPattern.test(webhookUrl)) {
      return sendErrorResponse(res, 'Please provide a valid URL', 400);
    }
    
    // Test the webhook URL before saving
    if (webhookUrl) {
      const testResult = await WebhookService.testWebhook(webhookUrl);
      
      if (!testResult.success) {
        return sendErrorResponse(
          res, 
          `Webhook test failed: ${testResult.error}. Please ensure the URL is valid and accessible.`,
          400
        );
      }
    }
    
    // Update user's webhook URL
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { webhookUrl },
      { new: true, runValidators: true }
    );
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'update',
      message: 'User updated webhook URL',
      userId: req.user.id,
      metadata: { webhookUrl }
    });
    
    sendSuccessResponse(res, 'Webhook URL updated successfully', {
      webhookUrl: user.webhookUrl
    });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error updating webhook URL', 500);
  }
};

/**
 * @desc    Delete user webhook URL
 * @route   DELETE /api/users/webhook
 * @access  Private
 */
exports.deleteWebhook = async (req, res) => {
  try {
    // Update user to remove webhook URL
    await User.findByIdAndUpdate(
      req.user.id,
      { webhookUrl: null }
    );
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'delete',
      message: 'User removed webhook URL',
      userId: req.user.id
    });
    
    sendSuccessResponse(res, 'Webhook URL removed successfully');
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error removing webhook URL', 500);
  }
};

/**
 * @desc    Test webhook endpoint (sends a test notification)
 * @route   POST /api/users/webhook/test
 * @access  Private
 */
exports.testWebhook = async (req, res) => {
  try {
    // Get the user to check if they have a webhook URL
    const user = await User.findById(req.user.id);
    
    if (!user.webhookUrl) {
      return sendErrorResponse(
        res, 
        'You need to set a webhook URL before testing', 
        400
      );
    }
    
    // Send a test notification
    const testResult = await WebhookService.testWebhook(user.webhookUrl);
    
    if (!testResult.success) {
      return sendErrorResponse(
        res, 
        `Webhook test failed: ${testResult.error}`, 
        400
      );
    }
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'other',
      message: 'User tested webhook',
      userId: req.user.id,
      metadata: { 
        status: testResult.status,
        statusText: testResult.statusText
      }
    });
    
    sendSuccessResponse(res, 'Webhook test successful', { 
      testResult 
    });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error testing webhook', 500);
  }
}; 