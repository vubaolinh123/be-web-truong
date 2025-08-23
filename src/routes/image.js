import express from 'express';
import multer from 'multer';

import rateLimit from 'express-rate-limit';
import { uploadImage, deleteImage, serveImage } from '../controllers/image.js';
import { uploadPermanent } from '../middleware/upload.js';
import { authenticate, adminOnly, facultyOrAdmin } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Rate limiter for upload endpoints to prevent abuse
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', { ip: req.ip });
    res.status(429).json({ status: 'error', message: 'Too many uploads. Please try again later.' });
  }
});

// --- API Endpoints ---

// 1. POST /api/images/upload - Upload a permanent image (requires faculty or admin role)
router.post('/upload', authenticate, facultyOrAdmin, uploadLimiter, uploadPermanent.single('image'), uploadImage);

// 3. DELETE /api/images/delete - Delete a permanent image (admin only)
router.delete('/delete', authenticate, adminOnly, deleteImage);

// 5. GET /api/images/:directory/:filename - Serve an image (publicly accessible)
// :directory should be 'images' or 'temp_images'
router.get('/:directory/:filename', (req, res, next) => {
  const { directory } = req.params;
  if (directory !== 'images' && directory !== 'temp_images') {
    return res.status(404).json({ status: 'error', message: 'Not Found' });
  }
  serveImage(req, res, next);
});

// Custom error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.warn('Multer error during upload', {
      error: err.message,
      field: err.field,
      ip: req.ip
    });
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 'error', message: 'File is too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    return res.status(400).json({ status: 'error', message: `Upload error: ${err.message}` });
  }
  next(err);
});

export default router;
