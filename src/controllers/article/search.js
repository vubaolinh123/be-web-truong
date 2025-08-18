import Article from '../../models/Article/index.js';
import logger from '../../config/logger.js';

// Tìm kiếm bài viết
export const searchArticles = async (req, res) => {
  try {
    const {
      keyword,
      status = 'published',
      categories = null,
      author = null,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Từ khóa tìm kiếm là bắt buộc',
        data: null
      });
    }

    const categoriesArray = categories ? categories.split(',') : null;

    const articles = await Article.search(keyword.trim(), {
      status,
      categories: categoriesArray,
      author,
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    });

    logger.info('Tìm kiếm bài viết thành công', {
      keyword: keyword.trim(),
      resultCount: articles.length,
      status,
      categories: categoriesArray,
      author,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Tìm kiếm bài viết thành công',
      data: {
        articles: articles.map(article => article.getBasicInfo()),
        keyword: keyword.trim(),
        resultCount: articles.length
      }
    });

  } catch (error) {
    logger.error('Lỗi khi tìm kiếm bài viết', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi tìm kiếm bài viết',
      data: null
    });
  }
};

// Lấy bài viết liên quan
export const getRelatedArticles = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const relatedArticles = await Article.getRelatedArticles(id, parseInt(limit));

    logger.info('Lấy bài viết liên quan thành công', {
      articleId: id,
      resultCount: relatedArticles.length,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy bài viết liên quan thành công',
      data: {
        articles: relatedArticles.map(article => article.getBasicInfo())
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy bài viết liên quan', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy bài viết liên quan',
      data: null
    });
  }
};

// Lấy bài viết phổ biến
export const getPopularArticles = async (req, res) => {
  try {
    const { limit = 5, timeframe = null } = req.query;

    const articles = await Article.getPopularArticles(parseInt(limit), timeframe);

    logger.info('Lấy bài viết phổ biến thành công', {
      resultCount: articles.length,
      timeframe,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy bài viết phổ biến thành công',
      data: {
        articles: articles.map(article => article.getBasicInfo())
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy bài viết phổ biến', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy bài viết phổ biến',
      data: null
    });
  }
};

// Lấy bài viết nổi bật
export const getFeaturedArticles = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const articles = await Article.getFeaturedArticles(parseInt(limit));

    logger.info('Lấy bài viết nổi bật thành công', {
      resultCount: articles.length,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy bài viết nổi bật thành công',
      data: {
        articles: articles.map(article => article.getBasicInfo())
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy bài viết nổi bật', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy bài viết nổi bật',
      data: null
    });
  }
};
