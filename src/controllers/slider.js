import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import Slider from '../models/Slider/index.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const mapSlider = (slider) => ({
  id: slider._id.toString(),
  _id: slider._id.toString(),
  title: slider.title || '',
  subtitle: slider.subtitle || '',
  image: slider.imageUrl,
  imageUrl: slider.imageUrl,
  ctaText: slider.ctaText || '',
  ctaHref: slider.ctaHref || '',
  bgColor: slider.bgColor || 'from-blue-900 to-blue-700',
  order: slider.order || 0,
  createdAt: slider.createdAt,
  updatedAt: slider.updatedAt,
});

export const getSliders = async (req, res) => {
  try {
    const sliders = await Slider.find({}).sort({ order: 1, createdAt: 1 }).lean();

    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách slider thành công',
      data: {
        sliders: sliders.map(mapSlider),
      },
    });
  } catch (error) {
    logger.error('Lỗi khi lấy danh sách slider', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy slider',
      data: null,
    });
  }
};

export const createSlider = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'Vui lòng tải lên ảnh slider',
      data: null,
    });
  }

  const { path: tempPath, originalname } = req.file;
  const uniqueId = randomBytes(4).toString('hex');
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const generatedFilename = `slider-${uniqueId}-${dateStamp}.jpeg`;
  const uploadDir = path.join(projectRoot, 'images');
  const finalPath = path.join(uploadDir, generatedFilename);

  try {
    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(tempPath)
      .resize({ width: 1920, withoutEnlargement: true })
      .toFormat('jpeg', { quality: 84 })
      .toFile(finalPath);

    await fs.unlink(tempPath);

    const sliderCount = await Slider.countDocuments();
    const slider = await Slider.create({
      title: req.body.title || '',
      subtitle: req.body.subtitle || '',
      imageUrl: `/media/images/${generatedFilename}`,
      ctaText: req.body.ctaText || '',
      ctaHref: req.body.ctaHref || '',
      bgColor: req.body.bgColor || 'from-blue-900 to-blue-700',
      order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : sliderCount,
    });

    logger.info('Thêm slider thành công', {
      sliderId: slider._id.toString(),
      originalName: originalname,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Thêm slider thành công',
      data: {
        slider: mapSlider(slider.toObject()),
      },
    });
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});

    logger.error('Lỗi khi thêm slider', {
      error: error.message,
      stack: error.stack,
      originalName: originalname,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Không thể xử lý ảnh slider',
      data: null,
    });
  }
};

export const deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findByIdAndDelete(req.params.id).lean();

    if (!slider) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy slider',
        data: null,
      });
    }

    if (slider.imageUrl?.startsWith('/media/images/')) {
      const filename = path.basename(slider.imageUrl);
      await fs.unlink(path.join(projectRoot, 'images', filename)).catch(() => {});
    }

    return res.status(200).json({
      status: 'success',
      message: 'Xóa slider thành công',
      data: {
        slider: mapSlider(slider),
      },
    });
  } catch (error) {
    logger.error('Lỗi khi xóa slider', {
      error: error.message,
      stack: error.stack,
      sliderId: req.params.id,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Không thể xóa slider',
      data: null,
    });
  }
};
