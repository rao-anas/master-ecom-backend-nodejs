const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');
const guestConversionService = require('./GuestConversionService');

class AuthService {
  /**
   * Register a new user
   */
  async register(email, password, firstName, lastName, sessionId = null, ipAddress = null) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        const error = new Error('Email already registered');
        error.statusCode = 400;
        throw error;
      }

      // Create user
      const user = await User.create({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
      });

      // Convert guest cart to user cart if sessionId provided
      let cartConverted = false;
      if (sessionId) {
        try {
          const cartResult = await guestConversionService.convertGuestCart(sessionId, user._id);
          cartConverted = cartResult.converted || false;
        } catch (error) {
          logger.warn('Failed to convert guest cart on registration', {
            userId: user._id,
            sessionId,
            error: error.message,
          });
        }
      }

      // Convert guest wishlist to user wishlist if sessionId provided
      let wishlistConverted = false;
      if (sessionId) {
        try {
          const wishlistResult = await guestConversionService.convertGuestWishlist(sessionId, user._id);
          wishlistConverted = wishlistResult.converted || false;
        } catch (error) {
          logger.warn('Failed to convert guest wishlist on registration', {
            userId: user._id,
            sessionId,
            error: error.message,
          });
        }
      }

      // Link guest orders to user account
      let ordersLinked = 0;
      try {
        const ordersResult = await guestConversionService.linkGuestOrders(user.email, user._id);
        ordersLinked = ordersResult.ordersLinked || 0;
      } catch (error) {
        logger.warn('Failed to link guest orders on registration', {
          userId: user._id,
          email: user.email,
          error: error.message,
        });
      }

      // Generate JWT token
      const accessToken = this.generateAccessToken(user._id.toString());
      const refreshToken = await this.generateRefreshToken(user._id, ipAddress);

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
      });

      return {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken: refreshToken.token,
        cartConverted,
        wishlistConverted,
        ordersLinked,
      };
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password, sessionId = null, ipAddress = null) {
    try {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      // Convert guest cart to user cart if sessionId provided
      let cartConverted = false;
      if (sessionId) {
        try {
          const cartResult = await guestConversionService.convertGuestCart(sessionId, user._id);
          cartConverted = cartResult.converted || false;
        } catch (error) {
          logger.warn('Failed to convert guest cart on login', {
            userId: user._id,
            sessionId,
            error: error.message,
          });
        }
      }

      // Convert guest wishlist to user wishlist if sessionId provided
      let wishlistConverted = false;
      if (sessionId) {
        try {
          const wishlistResult = await guestConversionService.convertGuestWishlist(sessionId, user._id);
          wishlistConverted = wishlistResult.converted || false;
        } catch (error) {
          logger.warn('Failed to convert guest wishlist on login', {
            userId: user._id,
            sessionId,
            error: error.message,
          });
        }
      }

      // Link guest orders to user account
      let ordersLinked = 0;
      try {
        const ordersResult = await guestConversionService.linkGuestOrders(user.email, user._id);
        ordersLinked = ordersResult.ordersLinked || 0;
      } catch (error) {
        logger.warn('Failed to link guest orders on login', {
          userId: user._id,
          email: user.email,
          error: error.message,
        });
      }

      // Generate JWT token
      const accessToken = this.generateAccessToken(user._id.toString());
      const refreshToken = await this.generateRefreshToken(user._id, ipAddress);

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
      });

      return {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken: refreshToken.token,
        cartConverted,
        wishlistConverted,
        ordersLinked,
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   * Implements token rotation
   */
  async refreshAccessToken(token, ipAddress) {
    try {
      const refreshToken = await RefreshToken.findOne({ token });

      if (!refreshToken || !refreshToken.isActive) {
        if (refreshToken && refreshToken.revokedAt) {
          // Token has been revoked, potentially compromised.
          // Revoke all tokens for this user as a security measure.
          await RefreshToken.updateMany({ userId: refreshToken.userId }, { $set: { revokedAt: Date.now(), revokedByIp: ipAddress } });
          logger.warn('Revoked refresh token used, revoking all tokens for user', {
            userId: refreshToken.userId,
            ipAddress,
          });
        }
        const error = new Error('Invalid or expired refresh token');
        error.statusCode = 401;
        throw error;
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(refreshToken.userId.toString());
      const newRefreshToken = await this.generateRefreshToken(refreshToken.userId, ipAddress);

      // Replace old token with new one (rotation)
      refreshToken.revokedAt = Date.now();
      refreshToken.revokedByIp = ipAddress;
      refreshToken.replacedByToken = newRefreshToken.token;
      await refreshToken.save();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken.token,
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(token, ipAddress) {
    try {
      const refreshToken = await RefreshToken.findOne({ token });
      if (refreshToken) {
        refreshToken.revokedAt = Date.now();
        refreshToken.revokedByIp = ipAddress;
        await refreshToken.save();
      }
    } catch (error) {
      logger.error('Error revoking token:', error);
      throw error;
    }
  }

  /**
   * Generate short-lived access token
   */
  generateAccessToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  }

  /**
   * Generate long-lived refresh token
   */
  async generateRefreshToken(userId, ipAddress) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS) || 7) * 24 * 60 * 60 * 1000);

    return await RefreshToken.create({
      userId,
      token,
      expiresAt,
      createdByIp: ipAddress,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

module.exports = new AuthService();

