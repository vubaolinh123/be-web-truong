import express from 'express';
import multer from 'multer';
import { createSlider, deleteSlider, getSliders } from '../controllers/slider.js';
import { uploadPermanent } from '../middleware/upload.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/', getSliders);
router.post('/', authenticate, adminOnly, uploadPermanent.single('image'), createSlider);
router.delete('/:id', authenticate, adminOnly, deleteSlider);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.warn('Multer error during slider upload', {
      error: err.message,
      field: err.field,
      ip: req.ip,
    });

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 'error', message: 'File is too large. Maximum size is 10MB.' });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    return res.status(400).json({ status: 'error', message: `Upload error: ${err.message}` });
  }

  return next(err);
});

export default router;
