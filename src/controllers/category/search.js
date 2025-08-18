import Category from '../../models/Category/index.js';
import logger from '../../config/logger.js';

// Tìm kiếm danh mục
export const searchCategories = async (req, res) => {
  try {
    const {
      keyword,
      status = 'active',
      limit = 10,
      sortBy = 'name',
      sortOrder = 1
    } = req.query;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Từ khóa tìm kiếm là bắt buộc',
        data: null
      });
    }

    const categories = await Category.search(keyword.trim(), {
      status,
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    });

    logger.info('Tìm kiếm danh mục thành công', {
      keyword: keyword.trim(),
      resultCount: categories.length,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Tìm kiếm danh mục thành công',
      data: {
        categories: categories.map(category => category.getBasicInfo()),
        keyword: keyword.trim(),
        resultCount: categories.length
      }
    });

  } catch (error) {
    logger.error('Lỗi khi tìm kiếm danh mục', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi tìm kiếm danh mục',
      data: null
    });
  }
};

// Lấy danh mục phổ biến
export const getPopularCategories = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const categories = await Category.getPopularCategories(parseInt(limit));

    logger.info('Lấy danh mục phổ biến thành công', {
      resultCount: categories.length,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy danh mục phổ biến thành công',
      data: {
        categories: categories.map(category => category.getBasicInfo())
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy danh mục phổ biến', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy danh mục phổ biến',
      data: null
    });
  }
};

// Lấy danh mục theo thứ tự hiển thị
export const getOrderedCategories = async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    const categories = await Category.getOrderedCategories(status);

    logger.info('Lấy danh mục theo thứ tự hiển thị thành công', {
      resultCount: categories.length,
      status,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy danh mục theo thứ tự hiển thị thành công',
      data: {
        categories: categories.map(category => category.getBasicInfo())
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy danh mục theo thứ tự hiển thị', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy danh mục theo thứ tự hiển thị',
      data: null
    });
  }
};
