import express from 'express';
import multer from 'multer';
import {
  listAlbums,
  createAlbum,
  getAlbumPhotos,
  uploadPhotoToAlbum,
  deletePhoto,
} from '../controllers/album.js';
import { uploadPermanent } from '../middleware/upload.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Public routes
router.get('/', listAlbums);
router.get('/:albumId/photos', getAlbumPhotos);

// Protected routes
router.post('/', authenticate, adminOnly, createAlbum);
router.post(
  '/:albumId/photos',
  authenticate,
  adminOnly,
  uploadPermanent.single('image'),
  uploadPhotoToAlbum
);
router.delete('/:albumId/photos/:photoId', authenticate, adminOnly, deletePhoto);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.warn('Multer error during album upload', {
      error: err.message,
      field: err.field,
      ip: req.ip,
    });

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ status: 'error', message: 'File is too large. Maximum size is 10MB.' });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    return res
      .status(400)
      .json({ status: 'error', message: `Upload error: ${err.message}` });
  }

  return next(err);
});

export default router;
