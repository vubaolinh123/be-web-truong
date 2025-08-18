import Article from '../../models/Article/index.js';
import logger from '../../config/logger.js';

// Lấy thống kê bài viết
export const getArticleStatistics = async (req, res) => {
  try {
    const statistics = await Article.getStatistics();

    logger.info('Lấy thống kê bài viết thành công', {
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy thống kê bài viết thành công',
      data: {
        statistics
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thống kê bài viết', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thống kê bài viết',
      data: null
    });
  }
};
