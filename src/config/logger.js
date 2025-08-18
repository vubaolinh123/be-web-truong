import winston from 'winston';
import chalk from 'chalk';

// HTTP method emojis
const HTTP_EMOJIS = {
  GET: '📖',
  POST: '➕',
  PUT: '✏️',
  DELETE: '🗑️',
  PATCH: '🔄',
  OPTIONS: '⚙️'
};

// Custom timestamp format with full date and time
const timestampFormat = winston.format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss.SSS'
});

// Custom format for console output with colors and emojis
const consoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Color coding for different log levels
    let coloredLevel;
    let icon = '';

    switch (level) {
      case 'info':
        coloredLevel = chalk.blue('INFO');
        icon = '📘';
        break;
      case 'warn':
        coloredLevel = chalk.yellow('WARN');
        icon = '⚠️';
        break;
      case 'error':
        coloredLevel = chalk.red('ERROR');
        icon = '❌';
        break;
      case 'success':
        coloredLevel = chalk.green('SUCCESS');
        icon = '✅';
        break;
      default:
        coloredLevel = chalk.white(level.toUpperCase());
        icon = '📝';
    }

    // Add HTTP method emoji if present in meta
    if (meta.method && HTTP_EMOJIS[meta.method]) {
      icon = HTTP_EMOJIS[meta.method];
    }

    // Format timestamp with gray color
    const coloredTimestamp = chalk.gray(`[${timestamp}]`);

    // Build log message
    let log = `${coloredTimestamp} ${icon} ${coloredLevel}: ${message}`;

    // Add metadata if present (excluding method as it's already used for emoji)
    const filteredMeta = { ...meta };
    delete filteredMeta.method;

    if (Object.keys(filteredMeta).length > 0) {
      log += ` ${chalk.dim(JSON.stringify(filteredMeta))}`;
    }

    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  timestampFormat,
  winston.format.json()
);

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    success: 'green',
    debug: 'gray'
  }
};

// Create logger instance with custom levels and streamlined console output
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'university-backend' },
  transports: [
    // Console transport with streamlined formatting (only essential logs)
    new winston.transports.Console({
      format: consoleFormat,
      level: 'warn' // Only show warnings and errors in console by default
    }),

    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat
    }),

    // File transport for all logs (including info for debugging)
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat
    })
  ]
});

// Add custom methods for specific log types
logger.request = (message, meta = {}) => {
  // Force request logs to show in console regardless of level
  const consoleTransport = logger.transports.find(t => t.name === 'console');
  const originalLevel = consoleTransport.level;
  consoleTransport.level = 'info';

  logger.info(message, { ...meta, logType: 'request' });

  consoleTransport.level = originalLevel;
};

logger.apiError = (message, meta = {}) => {
  logger.error(message, { ...meta, logType: 'api-error' });
};

// Add custom success method
logger.success = (message, meta = {}) => {
  logger.log('success', message, meta);
};

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
