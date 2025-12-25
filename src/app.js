const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Config and middleware imports
const { validateEnv } = require('./config/env');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const corsMiddleware = require('./middleware/cors');
const requestIdMiddleware = require('./middleware/requestId');
const apiVersionMiddleware = require('./middleware/apiVersion');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Validate environment variables
validateEnv();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request ID middleware (must be early in the chain)
app.use(requestIdMiddleware);

// API versioning middleware
app.use(apiVersionMiddleware);

// Rate limiting (applied to all API routes)
app.use('/api', apiLimiter);

// Health check (before API versioning)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// API routes
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/cart', require('./routes/cart'));
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/wishlists', require('./routes/wishlist'));
app.use('/api/v1/checkout', require('./routes/checkout'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/upload', require('./routes/upload'));

// Error handling middleware (must be last)
app.use(errorHandler);

// Connect to database and start server
const PORT = process.env.PORT || 3000;

// Only connect to DB and start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  }).catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;

