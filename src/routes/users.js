const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const { requireAuth } = require('../middleware/auth');
const { validateUpdateProfile } = require('../middleware/validateUser');
const { validators } = require('../utils/validators');

// All user routes require authentication
router.use(requireAuth);

// GET /api/v1/users/me - Get user profile
router.get(
  '/me',
  userController.getProfile.bind(userController)
);

// PUT /api/v1/users/me - Update user profile
router.put(
  '/me',
  validateUpdateProfile,
  userController.updateProfile.bind(userController)
);

// GET /api/v1/users/me/orders - Get user order history
router.get(
  '/me/orders',
  validators.pagination(),
  userController.getOrderHistory.bind(userController)
);

module.exports = router;

