import Article from '../../models/Article/index.js';
import logger from '../../config/logger.js';

// Xuất bản bài viết
export const publishArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm bài viết
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Kiểm tra quyền chỉnh sửa
    if (!article.canBeEditedBy(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xuất bản bài viết này',
        data: null
      });
    }

    // Xuất bản bài viết
    await article.publish();
    await article.populate('categories', 'name slug color icon');
    await article.populate('author', 'username firstName lastName avatar');

    logger.info('Xuất bản bài viết thành công', {
      articleId: article._id,
      articleTitle: article.title,
      publishedBy: req.user.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Xuất bản bài viết thành công',
      data: {
        article: article.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi xuất bản bài viết', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xuất bản bài viết',
      data: null
    });
  }
};

// Hủy xuất bản bài viết
export const unpublishArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm bài viết
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Kiểm tra quyền chỉnh sửa
    if (!article.canBeEditedBy(req.user)) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền hủy xuất bản bài viết này',
        data: null
      });
    }

    // Hủy xuất bản bài viết
    await article.unpublish();
    await article.populate('categories', 'name slug color icon');
    await article.populate('author', 'username firstName lastName avatar');

    logger.info('Hủy xuất bản bài viết thành công', {
      articleId: article._id,
      articleTitle: article.title,
      unpublishedBy: req.user.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Hủy xuất bản bài viết thành công',
      data: {
        article: article.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi hủy xuất bản bài viết', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi hủy xuất bản bài viết',
      data: null
    });
  }
};
