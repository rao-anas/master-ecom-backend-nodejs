const authService = require('../services/AuthService');
const passwordService = require('../services/PasswordService');
const logger = require('../config/logger');

class AuthController {
  /**
   * Register new user
   */
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName } = req.body;
      const sessionId = req.sessionId; // From session middleware
      const ipAddress = req.ip;

      const result = await authService.register(email, password, firstName, lastName, sessionId, ipAddress);

      logger.info('User registration successful', {
        requestId: req.id,
        userId: result.user._id,
        email: result.user.email,
      });

      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        cartConverted: result.cartConverted,
        wishlistConverted: result.wishlistConverted,
        ordersLinked: result.ordersLinked,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const sessionId = req.sessionId; // From session middleware
      const ipAddress = req.ip;

      const result = await authService.login(email, password, sessionId, ipAddress);

      logger.info('User login successful', {
        requestId: req.id,
        userId: result.user._id,
        email: result.user.email,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip;

      const result = await authService.refreshAccessToken(refreshToken, ipAddress);

      logger.info('Token refreshed successful', {
        requestId: req.id,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      await passwordService.generateResetToken(email);

      logger.info('Password reset requested', {
        requestId: req.id,
        email,
      });

      // Always return success for security (don't reveal if email exists)
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      await passwordService.resetPassword(token, password);

      logger.info('Password reset completed', {
        requestId: req.id,
      });

      res.json({
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (clears guest session cookie)
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip;

      if (refreshToken) {
        await authService.revokeToken(refreshToken, ipAddress);
      }

      res.clearCookie('sessionId', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      res.json({ message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

