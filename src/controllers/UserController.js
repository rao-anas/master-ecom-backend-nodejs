const userService = require('../services/UserService');
const logger = require('../config/logger');

class UserController {
  /**
   * Get user profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await userService.getProfile(req.userId);

      logger.info('User profile retrieved', {
        requestId: req.id,
        userId: user._id,
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.userId, req.body);

      logger.info('User profile updated', {
        requestId: req.id,
        userId: user._id,
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user order history
   */
  async getOrderHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await userService.getOrderHistory(req.userId, page, limit);

      logger.info('User order history retrieved', {
        requestId: req.id,
        userId: req.userId,
        orderCount: result.orders.length,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

