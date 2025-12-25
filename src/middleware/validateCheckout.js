const { body } = require('express-validator');
const { handleValidationErrors } = require('../utils/validators');

const addressValidation = [
  body('shippingAddress.street')
    .notEmpty()
    .withMessage('Shipping address street is required')
    .trim(),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('Shipping address city is required')
    .trim(),
  body('shippingAddress.state')
    .notEmpty()
    .withMessage('Shipping address state is required')
    .trim(),
  body('shippingAddress.zipCode')
    .notEmpty()
    .withMessage('Shipping address zip code is required')
    .trim(),
  body('shippingAddress.country')
    .notEmpty()
    .withMessage('Shipping address country is required')
    .trim(),
];

const validateCheckoutCreate = [
  body('email')
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim(),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim(),
  ...addressValidation,
  body('billingAddress.street')
    .optional()
    .notEmpty()
    .withMessage('Billing address street cannot be empty')
    .trim(),
  body('billingAddress.city')
    .optional()
    .notEmpty()
    .withMessage('Billing address city cannot be empty')
    .trim(),
  body('billingAddress.state')
    .optional()
    .notEmpty()
    .withMessage('Billing address state cannot be empty')
    .trim(),
  body('billingAddress.zipCode')
    .optional()
    .notEmpty()
    .withMessage('Billing address zip code cannot be empty')
    .trim(),
  body('billingAddress.country')
    .optional()
    .notEmpty()
    .withMessage('Billing address country cannot be empty')
    .trim(),
  body('paymentMethod')
    .isIn(['stripe', 'cash_on_delivery'])
    .withMessage('Payment method must be either "stripe" or "cash_on_delivery"'),
  handleValidationErrors,
];

const validateCheckoutConfirm = [
  body('checkoutSessionId')
    .notEmpty()
    .withMessage('Checkout session ID is required')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .trim(),
  body('lastName')
    .optional()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .trim(),
  body('paymentMethod')
    .isIn(['stripe', 'cash_on_delivery'])
    .withMessage('Payment method must be either "stripe" or "cash_on_delivery"'),
  body('shippingAddress.street')
    .optional()
    .notEmpty()
    .withMessage('Shipping address street cannot be empty')
    .trim(),
  body('billingAddress.street')
    .optional()
    .notEmpty()
    .withMessage('Billing address street cannot be empty')
    .trim(),
  handleValidationErrors,
];

module.exports = {
  validateCheckoutCreate,
  validateCheckoutConfirm,
};

