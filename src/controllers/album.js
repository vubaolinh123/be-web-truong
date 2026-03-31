import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import mongoose from 'mongoose';
import Album from '../models/Album/index.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export const listAlbums = async (req, res) => {
  try {
    const albums = await Album.find({})
      .select('_id title slug description coverImageUrl photos createdAt')
      .lean();

    const result = albums.map((album) => ({
      _id: album._id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      coverImageUrl: album.coverImageUrl,
      photoCount: album.photos ? album.photos.length : 0,
      createdAt: album.createdAt,
    }));

    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách album thành công',
      data: {
        albums: result,
      },
    });
  } catch (error) {
    logger.error('Lỗi khi lấy danh sách album', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy danh sách album',
      data: null,
    });
  }
};

export const createAlbum = async (req, res) => {
  const { title, slug, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Tiêu đề album là bắt buộc',
      data: null,
    });
  }

  if (!slug || !slug.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Slug là bắt buộc',
      data: null,
    });
  }

  try {
    const album = new Album({
      title: title.trim(),
      slug: slug.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user?.id || null,
    });

    await album.save();

    logger.info('Tạo album thành công', {
      albumId: album._id,
      title: album.title,
      slug: album.slug,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Tạo album thành công',
      data: {
        album,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Slug đã tồn tại, vui lòng chọn slug khác',
        data: null,
      });
    }

    logger.error('Lỗi khi tạo album', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi tạo album',
      data: null,
    });
  }
};

export const updateAlbum = async (req, res) => {
  const { albumId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(albumId)) {
    return res.status(400).json({
      status: 'error',
      message: 'albumId không hợp lệ',
      data: null,
    });
  }

  const { title, slug, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Tiêu đề album là bắt buộc',
      data: null,
    });
  }

  try {
    const album = await Album.findById(albumId);

    if (!album) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy album',
        data: null,
      });
    }

    album.title = title.trim();
    if (slug && slug.trim()) {
      album.slug = slug.trim();
    }
    if (description !== undefined) {
      album.description = description ? description.trim() : '';
    }
    album.updatedAt = new Date();

    await album.save();

    logger.info('Cập nhật album thành công', {
      albumId,
      title: album.title,
      slug: album.slug,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Cập nhật album thành công',
      data: {
        album: {
          _id: album._id,
          title: album.title,
          slug: album.slug,
          description: album.description,
          coverImageUrl: album.coverImageUrl,
          photoCount: album.photos ? album.photos.length : 0,
          createdAt: album.createdAt,
          updatedAt: album.updatedAt,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Slug đã tồn tại, vui lòng chọn slug khác',
        data: null,
      });
    }

    logger.error('Lỗi khi cập nhật album', {
      error: error.message,
      stack: error.stack,
      albumId,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi cập nhật album',
      data: null,
    });
  }
};

export const deleteAlbum = async (req, res) => {
  const { albumId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(albumId)) {
    return res.status(400).json({
      status: 'error',
      message: 'albumId không hợp lệ',
      data: null,
    });
  }

  try {
    const album = await Album.findById(albumId);

    if (!album) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy album',
        data: null,
      });
    }

    await Album.findByIdAndDelete(albumId);

    logger.info('Xóa album thành công', {
      albumId,
      title: album.title,
      photoCount: album.photos ? album.photos.length : 0,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Xóa album thành công',
      data: {
        deletedAlbumId: albumId,
      },
    });
  } catch (error) {
    logger.error('Lỗi khi xóa album', {
      error: error.message,
      stack: error.stack,
      albumId,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xóa album',
      data: null,
    });
  }
};

export const getAlbumPhotos = async (req, res) => {
  const { albumId } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);

  if (!mongoose.Types.ObjectId.isValid(albumId)) {
    return res.status(400).json({
      status: 'error',
      message: 'albumId không hợp lệ',
      data: null,
    });
  }

  try {
    const album = await Album.findById(albumId).lean();

    if (!album) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy album',
        data: null,
      });
    }

    const allPhotos = album.photos || [];
    const totalPhotos = allPhotos.length;
    const totalPages = Math.ceil(totalPhotos / limit);
    const startIndex = (page - 1) * limit;
    const photos = allPhotos.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách ảnh album thành công',
      data: {
        photos,
        totalPhotos,
        page,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Lỗi khi lấy ảnh album', {
      error: error.message,
      stack: error.stack,
      albumId,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy ảnh album',
      data: null,
    });
  }
};

export const uploadPhotoToAlbum = async (req, res) => {
  const { albumId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(albumId)) {
    return res.status(400).json({
      status: 'error',
      message: 'albumId không hợp lệ',
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
    const album = await Album.findById(albumId);

    if (!album) {
      await fs.unlink(tempPath).catch(() => {});
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy album',
        data: null,
      });
    }

    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(tempPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .toFormat('jpeg', { quality: 80 })
      .toFile(finalPath);

    await fs.unlink(tempPath);

    const imageUrl = `/media/images/${generatedFilename}`;

    const photo = {
      filename: generatedFilename,
      imageUrl,
      caption: req.body.caption ? req.body.caption.trim() : '',
      altText: req.body.altText ? req.body.altText.trim() : '',
      order: req.body.order ? parseInt(req.body.order, 10) : 0,
      uploadedBy: req.user?.id || null,
      createdAt: new Date(),
    };

    album.photos.push(photo);

    if (!album.coverImageUrl) {
      album.coverImageUrl = imageUrl;
    }

    album.updatedAt = new Date();
    await album.save();

    const addedPhoto = album.photos[album.photos.length - 1];

    logger.info('Tải ảnh vào album thành công', {
      albumId,
      photoId: addedPhoto._id,
      originalName: originalname,
      imageUrl,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Tải ảnh vào album thành công',
      data: {
        photo: addedPhoto,
      },
    });
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    await fs.unlink(finalPath).catch(() => {});

    logger.error('Lỗi khi tải ảnh vào album', {
      error: error.message,
      stack: error.stack,
      albumId,
      originalName: originalname,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Không thể xử lý ảnh album',
      data: null,
    });
  }
};

export const deletePhoto = async (req, res) => {
  const { albumId, photoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(albumId)) {
    return res.status(400).json({
      status: 'error',
      message: 'albumId không hợp lệ',
      data: null,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return res.status(400).json({
      status: 'error',
      message: 'photoId không hợp lệ',
      data: null,
    });
  }

  try {
    const album = await Album.findById(albumId);

    if (!album) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy album',
        data: null,
      });
    }

    const photoIndex = album.photos.findIndex(
      (p) => p._id.toString() === photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy ảnh trong album',
        data: null,
      });
    }

    const deletedPhoto = album.photos[photoIndex];
    album.photos.splice(photoIndex, 1);

    if (deletedPhoto.imageUrl === album.coverImageUrl) {
      album.coverImageUrl =
        album.photos.length > 0 ? album.photos[0].imageUrl : '';
    }

    album.updatedAt = new Date();
    await album.save();

    logger.info('Xóa ảnh khỏi album thành công', {
      albumId,
      photoId,
      imageUrl: deletedPhoto.imageUrl,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Xóa ảnh khỏi album thành công',
      data: {
        deletedPhotoId: photoId,
      },
    });
  } catch (error) {
    logger.error('Lỗi khi xóa ảnh khỏi album', {
      error: error.message,
      stack: error.stack,
      albumId,
      photoId,
      ip: req.ip,
    });

    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xóa ảnh',
      data: null,
    });
  }
};
