const apiVersionMiddleware = (req, res, next) => {
  // Ensure all API routes are prefixed with /api/v1
  if (req.path.startsWith('/api/v1')) {
    return next();
  }
  
  // If accessing /api without version, redirect to v1
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/v')) {
    return res.status(400).json({
      error: 'API version required. Use /api/v1',
      requestId: req.id,
    });
  }
  
  next();
};

module.exports = apiVersionMiddleware;

