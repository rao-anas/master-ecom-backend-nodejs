const User = require('../models/User');
const crypto = require('crypto');
const logger = require('../config/logger');

class PasswordService {
  /**
   * Generate password reset token
   */
  async generateResetToken(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return { success: true };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Save hashed token and expiration
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save({ validateBeforeSave: false });

      logger.info('Password reset token generated', {
        userId: user._id,
        email: user.email,
      });

      // In production, send email with reset token
      // For now, return token (in production, this would be sent via email)
      return {
        success: true,
        resetToken: process.env.NODE_ENV === 'test' ? resetToken : undefined, // Only return in test mode
      };
    } catch (error) {
      logger.error('Error generating reset token:', error);
      throw error;
    }
  }

  /**
   * Validate reset token
   */
  async validateResetToken(token) {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        const error = new Error('Invalid or expired reset token');
        error.statusCode = 400;
        throw error;
      }

      return user;
    } catch (error) {
      logger.error('Error validating reset token:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      const user = await this.validateResetToken(token);

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info('Password reset successfully', {
        userId: user._id,
        email: user.email,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }
}

module.exports = new PasswordService();

