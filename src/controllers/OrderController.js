const orderService = require('../services/OrderService');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const User = require('../models/User');

class OrderController {
  /**
   * Get user's order history (or all orders if admin)
   * GET /api/v1/orders
   */
  async getOrders(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      if (!req.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          requestId: req.id,
        });
      }

      // Check if user is admin
      const user = await User.findById(req.userId);
      const isAdmin = user && user.role === 'admin';

      // If admin, get all orders; otherwise get user's orders
      const result = isAdmin
        ? await orderService.getAllOrders(page, limit)
        : await orderService.getOrderHistory(req.userId, page, limit);

      logger.info('Order history retrieved', {
        requestId: req.id,
        userId: req.userId,
        isAdmin,
        orderCount: result.orders.length,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order details by order number
   * GET /api/v1/orders/:orderNumber
   */
  async getOrder(req, res, next) {
    try {
      const { orderNumber } = req.params;

      if (!orderNumber) {
        return res.status(400).json({
          error: 'Order number is required',
          requestId: req.id,
        });
      }

      const order = await orderService.getOrderByNumber(orderNumber);

      // Authorization check: users can only view their own orders (admins can view all)
      // Handle both populated (object) and unpopulated (ObjectId) customerId
      if (req.userId && order.customerId) {
        // Check if user is admin
        const user = await User.findById(req.userId);
        const isAdmin = user && user.role === 'admin';

        // Admins can view any order
        if (!isAdmin) {
          // Get the actual ObjectId - handle both populated and unpopulated cases
          let orderCustomerId;
          if (order.customerId._id) {
            // Populated (User document) - use _id
            orderCustomerId = order.customerId._id;
          } else if (order.customerId instanceof mongoose.Types.ObjectId) {
            // Unpopulated ObjectId
            orderCustomerId = order.customerId;
          } else {
            // String or other format
            orderCustomerId = new mongoose.Types.ObjectId(order.customerId);
          }
          
          // Convert req.userId to ObjectId for comparison
          const userId = new mongoose.Types.ObjectId(req.userId);
          
          // Use Mongoose's equals method for reliable ObjectId comparison
          if (!orderCustomerId.equals(userId)) {
            return res.status(403).json({
              error: 'Access denied. You can only view your own orders.',
              requestId: req.id,
            });
          }
        }
      }

      // If not authenticated, deny access (or allow if order has no customerId for guest orders)
      if (!req.userId && order.customerId) {
        return res.status(401).json({
          error: 'Authentication required to view this order',
          requestId: req.id,
        });
      }

      logger.info('Order details retrieved', {
        requestId: req.id,
        orderNumber,
        userId: req.userId,
      });

      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status (admin only)
   * PUT /api/v1/orders/:orderNumber/status
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const { status } = req.body;

      if (!orderNumber) {
        return res.status(400).json({
          error: 'Order number is required',
          requestId: req.id,
        });
      }

      if (!status) {
        return res.status(400).json({
          error: 'Status is required',
          requestId: req.id,
        });
      }

      // Check if user is admin
      const user = await User.findById(req.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          requestId: req.id,
        });
      }

      const order = await orderService.updateOrderStatus(orderNumber, status);

      logger.info('Order status updated', {
        requestId: req.id,
        orderNumber,
        newStatus: status,
        userId: req.userId,
      });

      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track order status (public endpoint, no auth required)
   * GET /api/v1/orders/:orderNumber/track
   */
  async trackOrder(req, res, next) {
    try {
      const { orderNumber } = req.params;

      if (!orderNumber) {
        return res.status(400).json({
          error: 'Order number is required',
          requestId: req.id,
        });
      }

      const tracking = await orderService.getOrderTracking(orderNumber);

      logger.info('Order tracking retrieved', {
        requestId: req.id,
        orderNumber,
      });

      res.json(tracking);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

