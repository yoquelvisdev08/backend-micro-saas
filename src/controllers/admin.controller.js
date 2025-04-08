const User = require('../models/user.model');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response.utils');
const LogService = require('../services/log.service');

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total users count and paginated users data
    const [total, users] = await Promise.all([
      User.countDocuments(),
      User.find()
        .select('-password')
        .skip(startIndex)
        .limit(limit)
        .sort({ createdAt: -1 })
    ]);
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'view',
      message: 'Admin viewed all users',
      userId: req.user.id,
      metadata: { page, limit, total }
    });
    
    sendSuccessResponse(res, 'Users retrieved successfully', {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error retrieving users', 500);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'view',
      message: `Admin viewed user: ${user.name}`,
      userId: req.user.id,
      metadata: { targetUser: user._id, userEmail: user.email }
    });
    
    sendSuccessResponse(res, 'User retrieved successfully', { user });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error retrieving user', 500);
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!role || !['user', 'admin'].includes(role)) {
      return sendErrorResponse(res, 'Invalid role. Must be either "user" or "admin"', 400);
    }
    
    // Make sure we're not updating our own role (to prevent removing admin access)
    if (req.params.id === req.user.id) {
      return sendErrorResponse(res, 'You cannot change your own role', 400);
    }
    
    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'update',
      message: `Admin updated user role: ${user.name} to ${role}`,
      userId: req.user.id,
      metadata: { targetUser: user._id, newRole: role }
    });
    
    sendSuccessResponse(res, 'User role updated successfully', { user });
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error updating user role', 500);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return sendErrorResponse(res, 'You cannot delete your own account', 400);
    }
    
    // Find user to get their info before deletion
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }
    
    // Save user info for logging
    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email
    };
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);
    
    // Log this action
    LogService.createLog({
      type: 'system',
      action: 'delete',
      message: `Admin deleted user: ${userInfo.name}`,
      userId: req.user.id,
      metadata: userInfo
    });
    
    sendSuccessResponse(res, 'User deleted successfully', {});
  } catch (error) {
    console.error(error);
    sendErrorResponse(res, 'Error deleting user', 500);
  }
}; 