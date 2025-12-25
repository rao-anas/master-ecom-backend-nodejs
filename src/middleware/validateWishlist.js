const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../utils/validators');

const validateWishlistCreate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Wishlist name must be between 1 and 100 characters'),
  body('productId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('wishlistId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Wishlist ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

const validateWishlistUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Wishlist name must be between 1 and 100 characters'),
  body('isShared')
    .optional()
    .isBoolean()
    .withMessage('isShared must be a boolean'),
  handleValidationErrors,
];

const validateWishlistAddToCart = [
  body('productIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('productIds must be an array'),
  body('productIds.*')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Each product ID must be a valid MongoDB ObjectId'),
  param('wishlistId')
    .isMongoId()
    .withMessage('Wishlist ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

const validateWishlistRemoveProduct = [
  param('wishlistId')
    .isMongoId()
    .withMessage('Wishlist ID must be a valid MongoDB ObjectId'),
  param('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

module.exports = {
  validateWishlistCreate,
  validateWishlistUpdate,
  validateWishlistAddToCart,
  validateWishlistRemoveProduct,
};

