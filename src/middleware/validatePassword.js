const { body } = require('express-validator');
const { handleValidationErrors } = require('../utils/validators');

const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors,
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors,
];

module.exports = {
  validateForgotPassword,
  validateResetPassword,
};

