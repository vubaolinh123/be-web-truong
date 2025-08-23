import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import logger from '../config/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Sanitize filename to prevent security risks like directory traversal
export const sanitizeFilename = (filename) => {
  // Remove directory paths, ../, etc.
  const sanitized = path.basename(filename);
  // Replace characters that are problematic in file systems or URLs
  return sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// Generate a unique filename while preserving the extension
export const generateUniqueFilename = (originalName) => {
  const sanitizedOriginalName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedOriginalName);
  const baseName = path.basename(sanitizedOriginalName, extension);
  const uniqueId = uuidv4();
  // A more descriptive name: original-name-uuid.ext
  return `${baseName}-${uniqueId}${extension}`;
};

// Ensure that the upload directories exist
export const ensureDirectories = async () => {
  try {
    
    const imagesDir = path.join(rootDir, 'images');
    const tempImagesDir = path.join(rootDir, 'temp_images');
    const tempUploadsDir = path.join(rootDir, 'temp_uploads');

    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(tempImagesDir, { recursive: true });
    await fs.mkdir(tempUploadsDir, { recursive: true });

    logger.info('Upload directories are ready.', {
      imagesDir,
      tempImagesDir,
      tempUploadsDir
    });
    return true;
  } catch (error) {
    logger.logCategorizedError('filesystem', error, 'Failed to create upload directories.', {
      severity: 'critical'
    });
    // This is a critical failure, the app might not be able to handle uploads
    throw new Error('Could not create upload directories.');
  }
};

// Define allowed file types and size limit
export const UPLOAD_CONFIG = {
  // 10 MB limit
  MAX_SIZE: 10 * 1024 * 1024, // 10485760 bytes
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

