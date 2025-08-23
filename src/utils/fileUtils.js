import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const tempDir = path.join(projectRoot, 'temp_images');
const permanentDir = path.join(projectRoot, 'images');

/**
 * Moves an image from the temporary directory to the permanent directory.
 * @param {string} tempUrl The temporary URL of the image.
 * @returns {Promise<string|null>} The new permanent URL, or null if an error occurs.
 */
export const promoteTempImage = async (tempUrl) => {
  if (!tempUrl || !tempUrl.startsWith('/api/images/temp_images/')) {
    return null; // Not a temporary image, do nothing
  }

  const filename = path.basename(tempUrl);
  const tempPath = path.join(tempDir, filename);
  const permanentPath = path.join(permanentDir, filename);

  try {
    // Check if the temporary file exists
    await fs.access(tempPath);

    // Move the file
    await fs.rename(tempPath, permanentPath);

    const permanentUrl = `/api/images/${filename}`;
    logger.info(`Image promoted from temporary to permanent storage`, { 
      tempUrl,
      permanentUrl 
    });

    return permanentUrl;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`Temporary file not found, it might have been already moved or deleted: ${tempPath}`);
      // If the file is already in the permanent directory, return the permanent URL
      try {
        await fs.access(permanentPath);
        return `/api/images/${filename}`;
      } catch (e) {
        // File doesn't exist in either location
        return null;
      }
    } else {
      logger.error(`Failed to promote temporary image: ${tempPath}`, { error });
      return null;
    }
  }
};
