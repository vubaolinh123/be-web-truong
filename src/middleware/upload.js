import multer from 'multer';
import path from 'path';
import { generateUniqueFilename, UPLOAD_CONFIG } from '../utils/imageUtils.js';
import logger from '../config/logger.js';

// Configure multer to use a temporary directory for all uploads
// The controller will handle moving the file to its final destination after optimization.
const upload = multer({
  dest: 'temp_uploads/', // A temporary directory for incoming files
});

// File filter to validate MIME types and extensions
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType) && UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
    cb(null, true); // Accept file
  } else {
    logger.warn('Invalid file type uploaded', {
      originalName: file.originalname,
      mimeType,
      extension,
      ip: req.ip
    });
    // Reject file with a specific error message
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// Create a single multer uploader instance
const uploader = multer({
  // Add a top-level error handler to catch low-level multer errors
  onError: function (err, next) {
    console.error('--- MULTER GLOBAL ERROR ---', err);
    next(err);
  },
  dest: 'temp_uploads/',
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_SIZE // 10MB limit
  },
  fileFilter: fileFilter
});

export const uploadPermanent = uploader;
export const uploadTemporary = uploader;

