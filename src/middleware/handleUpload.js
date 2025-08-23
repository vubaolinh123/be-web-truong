import logger from '../config/logger.js';

/**
 * A wrapper for multer middleware to gracefully handle any errors during file upload.
 * This prevents the server from crashing on low-level stream errors.
 * @param {Function} multerMiddleware The configured multer middleware instance.
 * @returns {Function} An Express middleware function.
 */
const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      logger.warn('Multer processing error caught by wrapper', { 
        error: err.message,
        code: err.code,
        field: err.field,
        ip: req.ip 
      });
      // Pass the error to the next error-handling middleware in Express.
      return next(err);
    }
    // If no error, proceed to the next middleware in the chain.
    next();
  });
};

export default handleUpload;

