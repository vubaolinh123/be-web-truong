import express from 'express';
import authRoutes from './auth.js';
import profileRoutes from './profile.js';
import adminRoutes from './admin.js';

const router = express.Router();

// Mount user sub-routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);

export default router;
