const { randomUUID } = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  req.id = req.headers['x-request-id'] || randomUUID();
  
  // Set response header
  res.setHeader('X-Request-ID', req.id);
  
  next();
};

module.exports = requestIdMiddleware;

