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
      sortOrder: sortOrder === 'asc' ? 1 : -1
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

// Lấy bài viết liên quan theo ID bài viết
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

// Lấy bài viết liên quan theo categoryId
export const getRelatedArticlesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      limit = 6,
      excludeId = null,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate categoryId
    if (!categoryId) {
      return res.status(400).json({
        status: 'error',
        message: 'Category ID là bắt buộc',
        data: null
      });
    }

    // Build query filter - Article model uses 'categories' array, not 'categoryId'
    const filter = {
      status: 'published',
      categories: categoryId  // Use categories array field
    };

    // Exclude specific article if provided
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Debug logging
    console.log('Related Articles Query:', {
      filter,
      sortObj,
      limit: parseInt(limit)
    });

    // Find related articles
    const relatedArticles = await Article.find(filter)
      .populate('categories', 'id name slug')
      .populate('author', 'id username firstName lastName avatar')
      .sort(sortObj)
      .limit(parseInt(limit))
      .select('id title slug excerpt featuredImage publishedAt readingTime categories author viewCount likeCount commentCount');

    // Debug logging
    console.log('Related Articles Found:', {
      count: relatedArticles.length,
      articles: relatedArticles.map(a => ({ id: a.id, title: a.title, categories: a.categories }))
    });

    logger.info('Lấy bài viết liên quan theo danh mục thành công', {
      categoryId,
      excludeId,
      resultCount: relatedArticles.length,
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy bài viết liên quan theo danh mục thành công',
      data: {
        articles: relatedArticles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featuredImage,
          publishedAt: article.publishedAt,
          readingTime: article.readingTime || 5,
          category: article.categories && article.categories.length > 0 ? {
            id: article.categories[0].id,
            name: article.categories[0].name,
            slug: article.categories[0].slug
          } : null,
          categories: article.categories ? article.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug
          })) : [],
          author: article.author ? {
            id: article.author.id,
            username: article.author.username,
            firstName: article.author.firstName,
            lastName: article.author.lastName,
            avatar: article.author.avatar
          } : null,
          viewCount: article.viewCount || 0,
          likeCount: article.likeCount || 0,
          commentCount: article.commentCount || 0
        })),
        categoryId,
        total: relatedArticles.length
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy bài viết liên quan theo danh mục', {
      error: error.message,
      stack: error.stack,
      categoryId: req.params.categoryId,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy bài viết liên quan theo danh mục',
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
