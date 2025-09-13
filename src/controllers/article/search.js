import Article from '../../models/Article/index.js';
import logger from '../../config/logger.js';

import Category from '../../models/Category/index.js';
import { parsePaginationParams } from '../../utils/sortUtils.js';

// Simple in-memory cache for by-category results
const categoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const cacheKey = (slug, query) => `${slug}|${JSON.stringify(query)}`;
const setCache = (key, value) => categoryCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
const getCache = (key) => {
  const entry = categoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { categoryCache.delete(key); return null; }
  return entry.value;
};

// Lấy bài viết theo category slug với phân trang và lọc
export const getArticlesByCategorySlug = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const {
      limit = 10,
      page = 1,
      sort = 'newest', // 'newest' | 'oldest' | 'popular' (by viewCount)
      featured,
      search,
      status = 'published'
    } = req.query;

    // Validate query params
    const allowedSort = ['newest', 'oldest', 'popular'];
    if (sort && !allowedSort.includes(String(sort))) {
      return res.status(400).json({ status: 'error', message: 'Tham số sắp xếp không hợp lệ (newest, oldest, popular)', data: null });
    }

    const allowedStatus = ['draft', 'published', 'archived', 'all'];
    if (status && !allowedStatus.includes(String(status))) {
      return res.status(400).json({ status: 'error', message: 'Trạng thái bài viết không hợp lệ', data: null });
    }

    if (featured !== undefined && !['true', 'false'].includes(String(featured))) {
      return res.status(400).json({ status: 'error', message: 'Giá trị featured phải là true hoặc false', data: null });
    }

    // Find category
    const slug = String(categorySlug).toLowerCase().trim();
    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Danh mục không tồn tại', data: null });
    }

    // Cache check (by slug + sanitized query)
    const key = cacheKey(slug, { limit, page, sort, featured, search, status });
    const cached = getCache(key);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Build filter
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    // Restrict to target category (articles.categories contains category._id)
    filter.categories = { $in: [category._id] };

    if (featured !== undefined) {
      filter.featured = String(featured) === 'true';
    }

    if (search) {
      // Text search on title/content (requires index)
      filter.$text = { $search: String(search) };
    }

    // Sort
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { viewCount: -1 };
        break;
      case 'oldest':
        sortOption = { publishedAt: 1 };
        break;
      case 'newest':
      default:
        sortOption = { publishedAt: -1 };
        break;
    }

    // Pagination
    const { page: p, limit: l } = parsePaginationParams({ page, limit });

    // Query using model pagination helper with populate
    const result = await Article.findWithPagination(filter, {
      page: p,
      limit: l,
      sort: sortOption,
      populate: true
    });

    logger.info('Lấy bài viết theo category slug thành công', {
      categoryId: category._id,
      categorySlug: slug,
      total: result.pagination?.totalArticles,
      page: p,
      limit: l,
      sort: sortOption,
      featured: filter.featured,
      hasSearch: !!search,
      ip: req.ip,
      userId: req.user?.id
    });

    const responseBody = {
      status: 'success',
      message: 'Lấy bài viết theo danh mục thành công',
      data: {
        articles: result.articles.map(a => a.getBasicInfo()),
        pagination: result.pagination,
        category: { id: category.id, name: category.name, slug: category.slug }
      }
    };

    setCache(key, responseBody);

    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error('Lỗi khi lấy bài viết theo category slug', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userId: req.user?.id
    });

    return res.status(500).json({ status: 'error', message: 'Lỗi hệ thống khi lấy bài viết theo danh mục', data: null });
  }
};

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
