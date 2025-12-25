const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const logger = require('../config/logger');

class UserService {
  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const user = await User.findById(userId).select('-password -passwordResetToken -passwordResetExpires');

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      return user;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    try {
      const allowedFields = ['firstName', 'lastName', 'shippingAddresses'];
      const updateFields = {};

      // Only allow specific fields to be updated
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password -passwordResetToken -passwordResetExpires');

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info('User profile updated', {
        userId: user._id,
        updatedFields: Object.keys(updateFields),
      });

      return user;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user order history
   */
  async getOrderHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [orders, total] = await Promise.all([
        Order.find({ customerId: userObjectId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('items.productId', 'name images'),
        Order.countDocuments({ customerId: userObjectId }),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting order history:', error);
      throw error;
    }
  }
}

module.exports = new UserService();

