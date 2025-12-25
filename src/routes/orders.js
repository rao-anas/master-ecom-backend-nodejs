const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const validateOrders = require('../middleware/validateOrders');

// GET /api/v1/orders - Get user's order history (requires auth)
router.get(
  '/',
  requireAuth,
  validateOrders.pagination,
  orderController.getOrders.bind(orderController)
);

// PUT /api/v1/orders/:orderNumber/status - Update order status (admin only)
// Must come before /:orderNumber route to avoid route matching conflicts
router.put(
  '/:orderNumber/status',
  requireAuth,
  validateOrders.orderNumber,
  validateOrders.orderStatus,
  orderController.updateOrderStatus.bind(orderController)
);

// GET /api/v1/orders/:orderNumber/track - Track order status (public, no auth required)
// Must come before /:orderNumber route to avoid route matching conflicts
router.get(
  '/:orderNumber/track',
  validateOrders.orderNumber,
  orderController.trackOrder.bind(orderController)
);

// GET /api/v1/orders/:orderNumber - Get order details (optional auth, but checks ownership)
// This must be last to avoid matching /status or /track routes
router.get(
  '/:orderNumber',
  optionalAuth,
  validateOrders.orderNumber,
  orderController.getOrder.bind(orderController)
);

module.exports = router;

