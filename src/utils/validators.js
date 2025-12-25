const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array(),
      requestId: req.id,
    });
  }
  next();
};

// Common validation rules
const validators = {
  // MongoDB ObjectId validation
  mongoId: (field = 'id') => {
    return param(field)
      .isMongoId()
      .withMessage(`${field} must be a valid MongoDB ObjectId`);
  },

  // Email validation
  email: (field = 'email') => {
    return body(field)
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address');
  },

  // Password validation
  password: (field = 'password') => {
    return body(field)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  },

  // Pagination validation
  pagination: () => {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    ];
  },

  // Price validation
  price: (field = 'price') => {
    return body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a non-negative number`);
  },

  // Quantity validation
  quantity: (field = 'quantity') => {
    return body(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`);
  },
};

module.exports = {
  handleValidationErrors,
  validators,
};

