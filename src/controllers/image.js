import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
import { randomBytes } from 'crypto';
import logger from '../config/logger.js';
import { sanitizeFilename } from '../utils/imageUtils.js';
import sharp from 'sharp';

// New handler for uploading and optimizing images
const uploadAndOptimize = async (req, res, isTemporary = false) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded or file was rejected.' });
  }

  const { path: tempPath, originalname } = req.file;
  const uniqueId = randomBytes(16).toString('hex');
  const extension = path.extname(originalname);
  const generatedFilename = `${uniqueId}${extension}`;
  const directoryName = isTemporary ? 'temp_images' : 'images';
  const uploadDir = path.join(projectRoot, directoryName);
  const finalPath = path.join(uploadDir, generatedFilename);

  try {
    // Ensure the upload directory exists, create it if it doesn't
    await fs.mkdir(uploadDir, { recursive: true });

    // Optimize and save the image
    await sharp(tempPath)
      .resize({ width: 1200, withoutEnlargement: true }) // Resize large images
      .toFormat('jpeg', { quality: 80 }) // Convert to JPEG with quality 80
      .toFile(finalPath);

    await fs.unlink(tempPath); // Delete the original temporary file from multer

    const finalSize = (await fs.stat(finalPath)).size;
    const fileUrl = `/api/images/${directoryName}/${generatedFilename}`;

    logger.info(`Image optimized and saved to ${directoryName}`, {
      filename: generatedFilename,
      originalName: originalname,
      size: finalSize,
      mimeType: 'image/jpeg',
      uploader: req.user ? req.user.id : 'unauthenticated',
    });

    res.status(201).json({
      status: 'success',
      message: 'Image uploaded and optimized successfully.',
      data: {
        filename: generatedFilename,
        url: fileUrl,
        size: finalSize,
        mimeType: 'image/jpeg',
      },
    });
  } catch (error) {
    logger.logCategorizedError('image_processing', error, 'Failed to process or save image.', { filename: originalname });
    res.status(500).json({ status: 'error', message: 'Could not process the image.' });
  }
};

// Controller for permanent image uploads
export const uploadImage = (req, res) => {
  uploadAndOptimize(req, res, false);
};



// Generic delete logic
const deleteFile = async (req, res, directory) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ status: 'error', message: 'Image URL is required in the request body.' });
  }

  // Extract filename from the URL path
  const filename = path.basename(imageUrl);
  const sanitized = sanitizeFilename(filename);

  if (sanitized !== filename) {
    return res.status(400).json({ status: 'error', message: 'Invalid filename.' });
  }

  try {
    const filePath = path.join(projectRoot, directory, sanitized);
    await fs.unlink(filePath);
    logger.info(`Image deleted from ${directory}`, { filename: sanitized });
    res.status(200).json({ status: 'success', message: 'Image deleted successfully.' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`Attempted to delete non-existent image from ${directory}`, { filename: sanitized });
      return res.status(404).json({ status: 'error', message: 'Image not found.' });
    }
    logger.logCategorizedError('filesystem', error, `Failed to delete image from ${directory}`, { filename: sanitized });
    res.status(500).json({ status: 'error', message: 'Could not delete the image.' });
  }
};

// Controller for deleting a permanent image
export const deleteImage = (req, res) => {
  deleteFile(req, res, 'images');
};



// Controller to serve an image
export const serveImage = (req, res) => {
  const { directory, filename } = req.params;
  const sanitized = sanitizeFilename(filename);
  
  if (sanitized !== filename) {
    return res.status(400).json({ status: 'error', message: 'Invalid filename.' });
  }

  const imagePath = path.join(projectRoot, directory, sanitized);
  res.sendFile(imagePath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.status(404).json({ status: 'error', message: 'Image not found.' });
      } else {
        logger.logCategorizedError('filesystem', err, 'Failed to serve image.', { filename: sanitized });
        res.status(500).json({ status: 'error', message: 'Could not serve the image.' });
      }
    }
  });
};

