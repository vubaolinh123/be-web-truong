import express from 'express';
import userRoutes from './user/index.js';
import categoryRoutes from './category/index.js';
import articleRoutes from './article/index.js';
import imageRoutes from './image.js';
import studentRoutes from './student/index.js';
import { getCurrentVietnamTime, getVietnamTimezoneInfo } from '../utils/timezone.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const timezoneInfo = getVietnamTimezoneInfo();

  const healthData = {
    status: 'OK',
    timestamp: getCurrentVietnamTime(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'university',
    timezone: {
      name: timezoneInfo.timezone,
      offset: timezoneInfo.offset,
      currentTime: timezoneInfo.currentTime
    }
  };

  res.status(200).json(healthData);
});

// API info endpoint
router.get('/info', (req, res) => {
  const apiInfo = {
    name: 'University Backend API',
    version: '1.0.0',
    description: 'Backend API for University Website',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      users: {
        auth: '/api/users/auth',
        profile: '/api/users/profile',
        admin: '/api/users/admin'
      },
      categories: {
        public: '/api/categories/public',
        admin: '/api/categories',
        statistics: '/api/categories/admin/statistics',
        search: '/api/categories/admin/search'
      },
      articles: {
        public: '/api/articles/public',
        admin: '/api/articles',
        statistics: '/api/articles/admin/statistics',
        search: '/api/articles/admin/search'
      },
      students: {
        register: '/api/students/register'
      }
    },
    timestamp: getCurrentVietnamTime()
  };

  res.status(200).json(apiInfo);
});

// Welcome endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to University Backend API',
    timestamp: getCurrentVietnamTime(),
    documentation: '/api/info'
  });
});

// User routes
router.use('/users', userRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Article routes
router.use('/articles', articleRoutes);

// Student routes
router.use('/students', studentRoutes);

// Image routes
router.use('/images', imageRoutes);
export default router;
