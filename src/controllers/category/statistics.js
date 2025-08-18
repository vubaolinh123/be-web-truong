import Category from '../../models/Category/index.js';
import logger from '../../config/logger.js';

// Lấy thống kê danh mục
export const getCategoryStatistics = async (req, res) => {
  try {
    const statistics = await Category.getStatistics();

    logger.info('Lấy thống kê danh mục thành công', {
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy thống kê danh mục thành công',
      data: {
        statistics
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thống kê danh mục', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thống kê danh mục',
      data: null
    });
  }
};
