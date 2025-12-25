const { body, param } = require('express-validator');
const { validators, handleValidationErrors } = require('../utils/validators');

/**
 * Validation middleware for product operations
 */
const validateProduct = {
  /**
   * Validate product creation
   */
  create: [
    body('name')
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ min: 3, max: 200 })
      .withMessage('Product name must be between 3 and 200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('price')
      .notEmpty()
      .withMessage('Price is required')
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    body('stock')
      .notEmpty()
      .withMessage('Stock is required')
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isString()
      .withMessage('Category must be a string'),
    body('images')
      .notEmpty()
      .withMessage('At least one image is required')
      .isArray({ min: 1 })
      .withMessage('Images must be an array with at least one image'),
    body('images.*')
      .isString()
      .withMessage('Each image must be a string'),
    handleValidationErrors,
  ],

  /**
   * Validate product update
   */
  update: [
    body('name')
      .optional()
      .isLength({ min: 3, max: 200 })
      .withMessage('Product name must be between 3 and 200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    body('category')
      .optional()
      .isString()
      .withMessage('Category must be a string'),
    body('images')
      .notEmpty()
      .withMessage('At least one image is required')
      .isArray({ min: 1 })
      .withMessage('Images must be an array with at least one image'),
    body('images.*')
      .isString()
      .withMessage('Each image must be a string'),
    handleValidationErrors,
  ],

  /**
   * Validate product ID parameter
   */
  productId: [
    validators.mongoId('productId'),
    handleValidationErrors,
  ],
};

module.exports = validateProduct;

