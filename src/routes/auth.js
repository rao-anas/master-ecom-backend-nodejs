const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const sessionMiddleware = require('../middleware/session');
const { validateRegister, validateLogin } = require('../middleware/validateAuth');
const { validateForgotPassword, validateResetPassword } = require('../middleware/validatePassword');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply session middleware for guest cart conversion
router.use(sessionMiddleware);

// Apply rate limiting to auth endpoints
router.use(apiLimiter);

// POST /api/v1/auth/register - Register new user
router.post(
  '/register',
  validateRegister,
  authController.register.bind(authController)
);

// POST /api/v1/auth/login - Login user
router.post(
  '/login',
  validateLogin,
  authController.login.bind(authController)
);

// POST /api/v1/auth/refresh-token - Refresh access token
router.post(
  '/refresh-token',
  authController.refreshToken.bind(authController)
);

// POST /api/v1/auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  validateForgotPassword,
  authController.forgotPassword.bind(authController)
);

// POST /api/v1/auth/reset-password - Reset password with token
router.post(
  '/reset-password',
  validateResetPassword,
  authController.resetPassword.bind(authController)
);

// POST /api/v1/auth/logout - Logout (clears guest session cookie)
router.post(
  '/logout',
  authController.logout.bind(authController)
);

module.exports = router;

