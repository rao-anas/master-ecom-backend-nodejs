const { param, body } = require('express-validator');
const { validators, handleValidationErrors } = require('../utils/validators');

/**
 * Validation middleware for order operations
 */
const validateOrders = {
  /**
   * Validate order number parameter
   */
  orderNumber: [
    param('orderNumber')
      .notEmpty()
      .withMessage('Order number is required')
      .isString()
      .withMessage('Order number must be a string')
      .trim(),
    handleValidationErrors,
  ],

  /**
   * Validate pagination query parameters
   */
  pagination: [
    ...validators.pagination(),
    handleValidationErrors,
  ],

  /**
   * Validate order status update
   */
  orderStatus: [
    body('status')
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status. Must be one of: pending, processing, shipped, delivered, cancelled'),
    handleValidationErrors,
  ],
};

module.exports = validateOrders;

