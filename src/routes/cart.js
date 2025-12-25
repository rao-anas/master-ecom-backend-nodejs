const express = require('express');
const router = express.Router();
const cartController = require('../controllers/CartController');
const sessionMiddleware = require('../middleware/session');
const { optionalAuth } = require('../middleware/auth');
const { validateCartAdd, validateCartUpdate, validateCartRemove } = require('../middleware/validateCart');

// All cart routes require session (guest) or auth (user)
router.use(sessionMiddleware);
router.use(optionalAuth);

// GET /api/v1/cart - Get cart contents
router.get(
  '/',
  cartController.getCart.bind(cartController)
);

// POST /api/v1/cart - Add item to cart
router.post(
  '/',
  validateCartAdd,
  cartController.addItem.bind(cartController)
);

// PUT /api/v1/cart - Update item quantity
router.put(
  '/',
  validateCartUpdate,
  cartController.updateItem.bind(cartController)
);

// DELETE /api/v1/cart - Remove item from cart
router.delete(
  '/',
  validateCartRemove,
  cartController.removeItem.bind(cartController)
);

module.exports = router;

