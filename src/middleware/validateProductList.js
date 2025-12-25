const { query } = require('express-validator');
const { validators, handleValidationErrors } = require('../utils/validators');

const validateProductList = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a non-negative number'),
  query('inStock')
    .optional()
    .isBoolean()
    .withMessage('inStock must be a boolean'),
  handleValidationErrors,
];

module.exports = validateProductList;

