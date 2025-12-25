require('dotenv').config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const optionalEnvVars = {
  PORT: 3000,
  NODE_ENV: 'development',
  JWT_EXPIRES_IN: '7d',
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 1000, // Increased from 100 to 1000 for better UX
  APP_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:3001',
};

// Validate required environment variables
const validateEnv = () => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }

  // Set optional defaults if not provided
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  });

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
};

module.exports = {
  validateEnv,
};

