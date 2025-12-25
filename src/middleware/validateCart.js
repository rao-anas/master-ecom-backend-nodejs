const { body, query } = require('express-validator');
const { validators, handleValidationErrors } = require('../utils/validators');

const validateCartAdd = [
  body('productId')
    .isMongoId()
    .withMessage('productId must be a valid MongoDB ObjectId'),
  validators.quantity('quantity'),
  handleValidationErrors,
];

const validateCartUpdate = [
  body('productId')
    .isMongoId()
    .withMessage('productId must be a valid MongoDB ObjectId'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('quantity must be a non-negative integer'),
  handleValidationErrors,
];

const validateCartRemove = [
  query('productId')
    .isMongoId()
    .withMessage('productId must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

module.exports = {
  validateCartAdd,
  validateCartUpdate,
  validateCartRemove,
};

