const winston = require('winston');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ecommerce-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    }),
  ],
});

// Create logs directory if it doesn't exist (for file transports)
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;

