import winston from 'winston';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// HTTP method emojis
const HTTP_EMOJIS = {
  GET: '📖',
  POST: '➕',
  PUT: '✏️',
  DELETE: '🗑️',
  PATCH: '🔄',
  OPTIONS: '⚙️'
};

// Function to generate date-based log filenames
const generateLogFilename = (prefix = 'app', extension = 'log') => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${prefix}-${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${extension}`;
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

// Custom format for file output with error stack traces
const fileFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }), // Include stack traces for errors
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

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate unique filenames for this application session
const combinedLogFilename = path.join('logs', generateLogFilename('app'));
const errorLogFilename = path.join('logs', generateLogFilename('error'));

// Create logger instance with custom levels and date-based log files
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

    // File transport for errors with date-based filename
    new winston.transports.File({
      filename: errorLogFilename,
      level: 'error',
      format: fileFormat,
      options: { flags: 'w' } // Create new file instead of appending
    }),

    // File transport for all logs with date-based filename
    new winston.transports.File({
      filename: combinedLogFilename,
      format: fileFormat,
      options: { flags: 'w' } // Create new file instead of appending
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

// Enhanced error logging with categorization for better searchability
logger.logCategorizedError = (category, error, message = '', meta = {}) => {
  const errorData = {
    ...meta,
    category: category, // e.g., 'database', 'api', 'validation', 'auth'
    logType: 'categorized-error',
    severity: meta.severity || 'medium' // low, medium, high, critical
  };

  if (error instanceof Error) {
    logger.error(message || error.message, {
      ...errorData,
      error: error.message,
      stack: error.stack,
      name: error.name
    });
  } else {
    logger.error(message, { ...errorData, error: error });
  }
};

// Database error logging
logger.dbError = (error, operation = '', meta = {}) => {
  logger.logCategorizedError('database', error, `Database error during ${operation}`, {
    ...meta,
    operation,
    severity: 'high'
  });
};

// API error logging
logger.apiError = (message, meta = {}) => {
  logger.logCategorizedError('api', message, message, {
    ...meta,
    logType: 'api-error',
    severity: meta.statusCode >= 500 ? 'high' : 'medium'
  });
};

// Add custom success method
logger.success = (message, meta = {}) => {
  logger.log('success', message, meta);
};

// Log the current session's log file names for reference
logger.info('📁 Log files for this session:', {
  combinedLog: combinedLogFilename,
  errorLog: errorLogFilename,
  sessionStart: new Date().toISOString()
});

export default logger;
