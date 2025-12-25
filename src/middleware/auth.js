const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Optional authentication middleware
 * Supports both guest (sessionId) and authenticated (JWT) users
 * Attaches userId to request if authenticated, otherwise uses sessionId
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.isAuthenticated = true;
    } catch (error) {
      // Invalid token, treat as guest
      req.isAuthenticated = false;
      logger.warn('Invalid JWT token, treating as guest', {
        requestId: req.id,
        error: error.message,
      });
    }
  } else {
    req.isAuthenticated = false;
  }

  next();
};

/**
 * Required authentication middleware
 * Returns 401 if user is not authenticated
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      requestId: req.id,
    });
  }

  const token = authHeader.substring(7);
  const jwt = require('jsonwebtoken');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.isAuthenticated = true;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      requestId: req.id,
    });
  }
};

module.exports = {
  optionalAuth,
  requireAuth,
};

