import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Article from '../models/Article/index.js'; // Import Article model

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
  const uniqueId = randomBytes(3).toString('hex').slice(0, 5);
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const extension = path.extname(originalname);
  const generatedFilename = `${uniqueId}-${dateStamp}${extension}`;
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
    const fileUrl = `/media/${directoryName}/${generatedFilename}`;

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



// Controller for deleting a permanent image
export const deleteImage = async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ status: 'error', message: 'Filename is required in the request body.' });
  }

  const sanitized = sanitizeFilename(filename);
  if (sanitized !== filename) {
    return res.status(400).json({ status: 'error', message: 'Invalid filename.' });
  }

  try {
    // Construct the full image path as stored in the database
    const imageUrl = `/media/images/${sanitized}`;

    // Check if the image is being used by any articles
    const articlesUsingImage = await Article.find({ featuredImage: imageUrl }).select('id title slug');

    if (articlesUsingImage.length > 0) {
      logger.warn(`Attempted to delete an image that is currently in use`, {
        filename: sanitized,
        articles: articlesUsingImage.map(a => ({ id: a.id, slug: a.slug })),
      });

      const articleSlugs = articlesUsingImage.map(a => a.slug).join(', ');
      const errorMessage = `Không thể xóa ảnh vì đang được sử dụng trong bài viết có slug: ${articleSlugs}`;

      return res.status(409).json({
        status: 'error',
        message: errorMessage,
        data: {
          articles: articlesUsingImage,
        },
      });
    }

    const filePath = path.join(projectRoot, 'images', sanitized);
    await fs.unlink(filePath);
    logger.info(`Image deleted successfully`, { filename: sanitized, admin: req.user.username });
    res.status(200).json({ status: 'success', message: 'Image deleted successfully.' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`Attempted to delete non-existent image`, { filename: sanitized });
      return res.status(404).json({ status: 'error', message: 'Image not found.' });
    }
    logger.logCategorizedError('filesystem', error, `Failed to delete image`, { filename: sanitized });
    res.status(500).json({ status: 'error', message: 'Could not delete the image.' });
  }
};

// Controller for bulk deleting images
export const bulkDeleteImages = async (req, res) => {
  const { filenames } = req.body;

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ status: 'error', message: 'An array of filenames is required.' });
  }

  const results = {
    deleted: [],
    failed: {},
  };

  for (const filename of filenames) {
    const sanitized = sanitizeFilename(filename);
    if (sanitized !== filename) {
      results.failed[filename] = 'Invalid filename.';
      continue;
    }

    try {
      const imageUrl = `/media/images/${sanitized}`;
      const articlesUsingImage = await Article.find({ featuredImage: imageUrl }).select('id title slug');

      if (articlesUsingImage.length > 0) {
        const articleSlugs = articlesUsingImage.map(a => a.slug).join(', ');
        results.failed[filename] = `Đang được sử dụng trong bài viết có slug: ${articleSlugs}`;
        continue;
      }

      const filePath = path.join(projectRoot, 'images', sanitized);
      await fs.unlink(filePath);
      results.deleted.push(filename);
      logger.info(`Image deleted successfully during bulk operation`, { filename: sanitized, admin: req.user.username });

    } catch (error) {
      if (error.code === 'ENOENT') {
        results.failed[filename] = 'Image not found.';
      } else {
        results.failed[filename] = 'Server error during deletion.';
        logger.logCategorizedError('filesystem', error, `Failed to delete image during bulk operation`, { filename: sanitized });
      }
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Bulk delete operation completed.',
    data: results,
  });
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

// Controller to list all images with pagination and filtering
export const listImages = async (req, res) => {
  const { page = 1, limit = 30, startDate, endDate, minSize, maxSize } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const minSizeNum = minSize ? parseInt(minSize, 10) : null;
  const maxSizeNum = maxSize ? parseInt(maxSize, 10) : null;

  const imagesDir = path.join(projectRoot, 'images');

  try {
    const allFiles = await fs.readdir(imagesDir);
    const imageFiles = allFiles.filter(file => /\.(jpe?g|png|gif|webp)$/i.test(file));

    let imageDetails = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = path.join(imagesDir, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          url: `/media/images/${filename}`,
          size: stats.size,
          createdAt: stats.mtime,
        };
      })
    );

    // Apply filters
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      imageDetails = imageDetails.filter(img => new Date(img.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      imageDetails = imageDetails.filter(img => new Date(img.createdAt) <= end);
    }
    if (minSizeNum !== null) {
      imageDetails = imageDetails.filter(img => img.size >= minSizeNum);
    }
    if (maxSizeNum !== null) {
      imageDetails = imageDetails.filter(img => img.size <= maxSizeNum);
    }

    // Apply pagination to the filtered list
    const totalImages = imageDetails.length;
    const totalPages = Math.ceil(totalImages / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedImages = imageDetails.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        images: paginatedImages,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalImages,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('Attempted to list images, but the images directory does not exist.');
      return res.status(200).json({
        status: 'success',
        data: {
          images: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalImages: 0,
            limit: limitNum,
          },
        },
      });
    }
    logger.logCategorizedError('filesystem', error, 'Failed to list images.');
    res.status(500).json({ status: 'error', message: 'Could not retrieve images.' });
  }
};




// Controller for force deleting an image
export const forceDeleteImage = async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ status: 'error', message: 'Filename is required.' });
  }

  const sanitized = sanitizeFilename(filename);
  if (sanitized !== filename) {
    return res.status(400).json({ status: 'error', message: 'Invalid filename.' });
  }

  try {
    const filePath = path.join(projectRoot, 'images', sanitized);
    await fs.unlink(filePath);
    logger.warn(`Image force deleted successfully by admin`, { filename: sanitized, admin: req.user.username });
    res.status(200).json({ status: 'success', message: 'Tệp ảnh đã được xóa vĩnh viễn.' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`Attempted to force delete non-existent image`, { filename: sanitized });
      return res.status(404).json({ status: 'error', message: 'Image not found.' });
    }
    logger.logCategorizedError('filesystem', error, `Failed to force delete image`, { filename: sanitized });
    res.status(500).json({ status: 'error', message: 'Could not delete the image.' });
  }
};


