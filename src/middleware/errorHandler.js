const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
  });

  // Default error
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

