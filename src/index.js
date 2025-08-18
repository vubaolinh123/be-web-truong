import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import connectDatabase from './config/database.js';
import corsMiddleware from './middleware/cors.js';
import indexRoutes from './routes/index.js';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDatabase();

// CORS middleware (configured to allow all origins)
app.use(corsMiddleware);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Streamlined request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log incoming request with method emoji (only for API endpoints)
  if (req.url.startsWith('/api')) {
    logger.request(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip
    });
  }

  // Log only error responses
  res.on('finish', () => {
    const statusCode = res.statusCode;

    // Only log errors (4xx and 5xx status codes)
    if (statusCode >= 400) {
      const duration = Date.now() - startTime;
      const statusEmoji = statusCode >= 500 ? '❌' : '⚠️';

      logger.apiError(`${statusEmoji} Lỗi API: ${statusCode} - ${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    }
  });

  next();
});

// Routes setup
app.use('/api', indexRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'University Backend API is running',
    timestamp: new Date().toISOString(),
    api: '/api'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎉 Server khởi động thành công trên cổng ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

export default app;
