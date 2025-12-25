const logger = require('../config/logger');

/**
 * Role-Based Access Control middleware
 * Checks if user has required role(s)
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          error: 'Authentication required',
          requestId: req.id,
        });
      }

      const User = require('../models/User');
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          requestId: req.id,
        });
      }

      if (!allowedRoles.includes(user.role)) {
        logger.warn('Access denied - insufficient permissions', {
          requestId: req.id,
          userId: req.userId,
          userRole: user.role,
          requiredRoles: allowedRoles,
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          requestId: req.id,
        });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      logger.error('Error in RBAC middleware:', error);
      next(error);
    }
  };
};

module.exports = {
  requireRole,
};

