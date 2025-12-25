const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/CheckoutController');
const sessionMiddleware = require('../middleware/session');
const { optionalAuth } = require('../middleware/auth');
const { validateCheckoutCreate, validateCheckoutConfirm } = require('../middleware/validateCheckout');

// All checkout routes require session (guest) or auth (user)
router.use(sessionMiddleware);
router.use(optionalAuth);

// POST /api/v1/checkout - Create checkout session
router.post(
  '/',
  validateCheckoutCreate,
  checkoutController.createCheckout.bind(checkoutController)
);

// POST /api/v1/checkout/confirm - Confirm checkout and create order
router.post(
  '/confirm',
  validateCheckoutConfirm,
  checkoutController.confirmCheckout.bind(checkoutController)
);

module.exports = router;

