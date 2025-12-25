const { body } = require('express-validator');
const { handleValidationErrors } = require('../utils/validators');

const validateUpdateProfile = [
  body('firstName')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Last name cannot be empty'),
  body('shippingAddresses')
    .optional()
    .isArray()
    .withMessage('Shipping addresses must be an array'),
  body('shippingAddresses.*.street')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Street is required'),
  body('shippingAddresses.*.city')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('City is required'),
  body('shippingAddresses.*.state')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('State is required'),
  body('shippingAddresses.*.zipCode')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Zip code is required'),
  body('shippingAddresses.*.country')
    .optional()
    .notEmpty()
    .trim()
    .withMessage('Country is required'),
  handleValidationErrors,
];

module.exports = {
  validateUpdateProfile,
};

