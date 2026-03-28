import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import GalleryImage, { GALLERY_SLOTS } from '../models/GalleryImage/index.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const SLOT_LABELS = {
  'co-so-vat-chat': 'Cơ sở vật chất',
  'hoat-dong-sinh-vien': 'Hoạt động sinh viên',
  'thu-vien': 'Thư viện',
  'phong-thuc-hanh': 'Phòng thực hành',
};

export const getGalleryImages = async (req, res) => {
  try {
    const records = await GalleryImage.find({}).lean();
    const recordBySlot = new Map(records.map((item) => [item.slot, item]));

    const galleryImages = GALLERY_SLOTS.map((slot) => {
      const existing = recordBySlot.get(slot);
      return {
        slot,
        label: existing?.label || SLOT_LABELS[slot],
        imageUrl: existing?.imageUrl || '',
        updatedAt: existing?.updatedAt || null,
      };
    });

    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách ảnh thư viện thành công',
      data: {
        galleryImages,
      },
    });
  } catch (error) {
    logger.error('Lỗi khi lấy danh sách ảnh thư viện', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy ảnh thư viện',
      data: null,
    });
  }
};

export const updateGalleryImage = async (req, res) => {
  const { slot } = req.params;

  if (!GALLERY_SLOTS.includes(slot)) {
    return res.status(400).json({
      status: 'error',
      message: 'Slot không hợp lệ',
      data: null,
    });
  }

  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded or file was rejected.',
      data: null,
    });
  }

  const { path: tempPath, originalname } = req.file;
  const uniqueId = randomBytes(3).toString('hex').slice(0, 5);
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const generatedFilename = `${uniqueId}-${dateStamp}.jpeg`;
  const uploadDir = path.join(projectRoot, 'images');
  const finalPath = path.join(uploadDir, generatedFilename);

  try {
    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(tempPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .toFormat('jpeg', { quality: 80 })
      .toFile(finalPath);

    await fs.unlink(tempPath);

    const imageUrl = `/media/images/${generatedFilename}`;

    const updated = await GalleryImage.findOneAndUpdate(
      { slot },
      {
        slot,
        label: SLOT_LABELS[slot],
        imageUrl,
        updatedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    logger.info('Cập nhật ảnh gallery thành công', {
      slot,
      originalName: originalname,
      imageUrl,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Cập nhật ảnh gallery thành công',
      data: {
        galleryImage: updated,
      },
    });
  } catch (error) {
    logger.error('Lỗi khi cập nhật ảnh gallery', {
      error: error.message,
      stack: error.stack,
      slot,
      originalName: originalname,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Không thể xử lý ảnh gallery',
      data: null,
    });
  }
};
