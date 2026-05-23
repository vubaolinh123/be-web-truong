import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import SloganBanner from '../models/SloganBanner/index.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const mapSloganBanner = (banner) => ({
  id: banner._id.toString(),
  _id: banner._id.toString(),
  imageUrl: banner.imageUrl,
  order: banner.order || 0,
  createdAt: banner.createdAt,
  updatedAt: banner.updatedAt,
});

export const getSloganBanners = async (req, res) => {
  try {
    const banners = await SloganBanner.find({}).sort({ order: 1, createdAt: 1 }).lean();

    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách slogan banner thành công',
      data: {
        sloganBanners: banners.map(mapSloganBanner),
      },
    });
  } catch (error) {
    logger.error('Lỗi khi lấy danh sách slogan banner', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy slogan banner',
      data: null,
    });
  }
};

export const createSloganBanner = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'Vui lòng tải lên ảnh banner',
      data: null,
    });
  }

  const { path: tempPath, originalname } = req.file;

  try {
    // Check if we already have 2 banners
    const count = await SloganBanner.countDocuments();
    if (count >= 2) {
      await fs.unlink(tempPath).catch(() => {});
      return res.status(400).json({
        status: 'error',
        message: 'Tối đa chỉ được upload 2 banner khẩu hiệu. Vui lòng xóa bớt banner cũ trước khi tải lên mới.',
        data: null,
      });
    }

    const uniqueId = randomBytes(4).toString('hex');
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const generatedFilename = `slogan-${uniqueId}-${dateStamp}.jpeg`;
    const uploadDir = path.join(projectRoot, 'images');
    const finalPath = path.join(uploadDir, generatedFilename);

    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(tempPath)
      .resize({ width: 1920, withoutEnlargement: true })
      .toFormat('jpeg', { quality: 84 })
      .toFile(finalPath);

    await fs.unlink(tempPath);

    const sloganBanner = await SloganBanner.create({
      imageUrl: `/media/images/${generatedFilename}`,
      order: count,
    });

    logger.info('Thêm slogan banner thành công', {
      bannerId: sloganBanner._id.toString(),
      originalName: originalname,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Thêm slogan banner thành công',
      data: {
        sloganBanner: mapSloganBanner(sloganBanner.toObject()),
      },
    });
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});

    logger.error('Lỗi khi thêm slogan banner', {
      error: error.message,
      stack: error.stack,
      originalName: originalname,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Không thể xử lý ảnh slogan banner',
      data: null,
    });
  }
};

export const deleteSloganBanner = async (req, res) => {
  try {
    const banner = await SloganBanner.findByIdAndDelete(req.params.id).lean();

    if (!banner) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy slogan banner',
        data: null,
      });
    }

    if (banner.imageUrl?.startsWith('/media/images/')) {
      const filename = path.basename(banner.imageUrl);
      await fs.unlink(path.join(projectRoot, 'images', filename)).catch(() => {});
    }

    return res.status(200).json({
      status: 'success',
      message: 'Xóa slogan banner thành công',
      data: {
        sloganBanner: mapSloganBanner(banner),
      },
    });
  } catch (error) {
    logger.error('Lỗi khi xóa slogan banner', {
      error: error.message,
      stack: error.stack,
      bannerId: req.params.id,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Không thể xóa slogan banner',
      data: null,
    });
  }
};
