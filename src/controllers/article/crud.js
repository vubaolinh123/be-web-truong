import Article from '../../models/Article/index.js';
import Category from '../../models/Category/index.js';
import logger from '../../config/logger.js';
import {
  normalizeSortOrder,
  validateSortField,
  ARTICLE_SORT_FIELDS,
  parsePaginationParams
} from '../../utils/sortUtils.js';

// Lấy danh sách tất cả bài viết với phân trang
export const getArticles = async (req, res) => {
  try {
    // Parse pagination parameters với validation
    const paginationParams = parsePaginationParams(req.query);

    const {
      status = null,
      categoryId = null,
      author = null,
      featured = null,
      search = null
    } = req.query;

    // Tạo filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (categoryId && categoryId !== 'all') {
      filter.categories = categoryId;
    }
    if (author) {
      filter.author = author;
    }
    if (featured !== null) {
      filter.featured = featured === 'true';
    }

    // Nếu có search, sử dụng text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Sử dụng utility functions để xử lý sorting
    const mongoSortOrder = normalizeSortOrder(paginationParams.sortOrder);
    const validSortBy = validateSortField(paginationParams.sortBy, ARTICLE_SORT_FIELDS);

    // Debug logging
    logger.info('Article query parameters', {
      originalSortOrder: paginationParams.sortOrder,
      mongoSortOrder,
      originalSortBy: paginationParams.sortBy,
      validSortBy,
      page: paginationParams.page,
      limit: paginationParams.limit,
      filter,
      originalCategoryId: categoryId,
      originalStatus: status
    });

    // Lấy bài viết với phân trang
    const result = await Article.findWithPagination(filter, {
      page: paginationParams.page,
      limit: paginationParams.limit,
      sortBy: validSortBy,
      sortOrder: mongoSortOrder,
      populate: true
    });

    logger.info('Lấy danh sách bài viết thành công', {
      totalArticles: result.pagination.totalArticles,
      currentPage: result.pagination.currentPage,
      filter,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách bài viết thành công',
      data: {
        articles: result.articles.map(article => article.getBasicInfo()),
        pagination: result.pagination
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy danh sách bài viết', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy danh sách bài viết',
      data: null
    });
  }
};

// Lấy thông tin chi tiết một bài viết
export const getArticle = async (req, res) => {
  try {
        const { id } = req.params;

    // If this is the admin route, call getArticles instead
    if (id === 'admin') {
      return getArticles(req, res);
    }


    const { incrementView = 'false' } = req.query;

    // Tìm bài viết theo ID hoặc slug
    let article;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Nếu là ObjectId
      article = await Article.findById(id)
        .populate('categories', 'name slug color icon')
        .populate('author', 'username firstName lastName avatar')
        .populate('createdBy', 'username firstName lastName')
        .populate('updatedBy', 'username firstName lastName');
    } else {
      // Nếu là slug
      article = await Article.findBySlug(id);
    }

    if (!article) {
      logger.warn('Bài viết không tồn tại', {
        articleId: id,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Tăng lượt xem nếu được yêu cầu
    if (incrementView === 'true') {
      await article.incrementViewCount();
    }

    logger.info('Lấy thông tin bài viết thành công', {
      articleId: article._id,
      articleTitle: article.title,
      incrementView: incrementView === 'true',
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy thông tin bài viết thành công',
      data: {
        article: article.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thông tin bài viết', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thông tin bài viết',
      data: null
    });
  }
};

// Lấy bài viết theo slug
export const getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { incrementView = 'false' } = req.query;

    // Tìm bài viết theo slug
    const article = await Article.findBySlug(slug);

    if (!article) {
      logger.warn('Bài viết không tồn tại', {
        slug,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Kiểm tra quyền truy cập cho bài viết chưa xuất bản
    if (article.status !== 'published' && !req.user) {
      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Tăng lượt xem nếu được yêu cầu
    if (incrementView === 'true') {
      await article.incrementViewCount();
    }

    logger.info('Lấy thông tin bài viết theo slug thành công', {
      articleId: article._id,
      slug: article.slug,
      articleTitle: article.title,
      incrementView: incrementView === 'true',
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy thông tin bài viết thành công',
      data: {
        article
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thông tin bài viết theo slug', {
      error: error.message,
      stack: error.stack,
      slug: req.params.slug,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thông tin bài viết',
      data: null
    });
  }
};

// Tạo bài viết mới với category count update (không dùng transaction vì MongoDB standalone)
export const createArticle = async (req, res) => {
  try {

    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      categories, // Chỉ sử dụng categories array (có thể 1 hoặc nhiều categories)
      status = 'draft',
      metaTitle,
      metaDescription,
      keywords = [],
      tags = [],
      featured = false,
      allowComments = true,
      sortOrder = 0
    } = req.body;

    // Validate dữ liệu đầu vào
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Tiêu đề bài viết là bắt buộc',
        data: null
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Nội dung bài viết là bắt buộc',
        data: null
      });
    }

    // Xử lý categories - chỉ sử dụng categories array
    let finalCategories = [];

    if (categories && Array.isArray(categories) && categories.length > 0) {
      // Loại bỏ duplicates nếu có
      finalCategories = [...new Set(categories)];
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Bài viết phải thuộc ít nhất một danh mục (categories array)',
        data: null
      });
    }

    // Kiểm tra tất cả categories có tồn tại và active không
    const existingCategories = await Category.find({
      _id: { $in: finalCategories },
      status: 'active'
    });

    if (existingCategories.length !== finalCategories.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Một hoặc nhiều danh mục không tồn tại hoặc không hoạt động',
        data: null
      });
    }

    // Tạo slug nếu không được cung cấp
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = await Article.generateUniqueSlug(title);
    } else {
      // Kiểm tra slug có tồn tại không
      const existingArticle = await Article.findOne({ slug: finalSlug });
      if (existingArticle) {
        return res.status(400).json({
          status: 'error',
          message: 'Slug đã tồn tại',
          data: null
        });
      }
    }

    // Tạo bài viết mới
    const articleData = {
      title: title.trim(),
      slug: finalSlug,
      content: content.trim(),
      excerpt: excerpt?.trim(),
      featuredImage,
      categories: finalCategories,
      author: req.user.id,
      status,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
      keywords: Array.isArray(keywords) ? keywords.filter(k => k.trim()) : [],
      tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : [],
      featured,
      allowComments,
      sortOrder: parseInt(sortOrder) || 0,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    // Tự động set publishedAt nếu status là published
    if (status === 'published') {
      articleData.publishedAt = new Date();
    }

    const article = await Article.create(articleData);

    // Cập nhật articleCount cho tất cả categories liên quan
    await Category.updateMany(
      { _id: { $in: finalCategories } },
      { $inc: { articleCount: 1 } }
    );

    // Populate để trả về thông tin đầy đủ
    await article.populate('categories', 'name slug color icon');
    await article.populate('author', 'username firstName lastName avatar');

    logger.info('Tạo bài viết mới thành công', {
      articleId: article._id,
      articleTitle: article.title,
      articleSlug: article.slug,
      status: article.status,
      categories: article.categories.map(cat => cat.name),
      createdBy: req.user.id,
      ip: req.ip
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo bài viết mới thành công',
      data: {
        article: article.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi tạo bài viết mới', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      userId: req.user?.id,
      ip: req.ip
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: errors.join(', '),
        data: null
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        slug: 'Slug',
        title: 'Tiêu đề bài viết'
      };
      
      return res.status(400).json({
        status: 'error',
        message: `${fieldNames[field] || field} đã tồn tại`,
        data: null
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi tạo bài viết',
      data: null
    });
  }
};

// Cập nhật bài viết với category count update (không dùng transaction vì MongoDB standalone)
export const updateArticle = async (req, res) => {
  try {

    const { id } = req.params;
    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      categories, // Chỉ sử dụng categories array (có thể 1 hoặc nhiều categories)
      status,
      metaTitle,
      metaDescription,
      keywords,
      tags,
      featured,
      allowComments,
      sortOrder
    } = req.body;

    // Tìm bài viết
    const article = await Article.findById(id);
    if (!article) {
      logger.warn('Bài viết không tồn tại khi cập nhật', {
        articleId: id,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Kiểm tra quyền chỉnh sửa
    if (!article.canBeEditedBy(req.user)) {
      logger.warn('Không có quyền chỉnh sửa bài viết', {
        articleId: article._id,
        articleTitle: article.title,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
      });

      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền chỉnh sửa bài viết này',
        data: null
      });
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (excerpt !== undefined) updateData.excerpt = excerpt?.trim();
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (status !== undefined) updateData.status = status;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle?.trim();
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription?.trim();
    if (keywords !== undefined) updateData.keywords = Array.isArray(keywords) ? keywords.filter(k => k.trim()) : [];
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.filter(t => t.trim()) : [];
    if (featured !== undefined) updateData.featured = featured;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;

    // Xử lý categories với category count update - chỉ sử dụng categories array
    let newCategories = null;
    let oldCategories = article.categories.map(cat => cat.toString());

    if (categories !== undefined) {
      // Validate categories array
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Bài viết phải thuộc ít nhất một danh mục (categories array)',
          data: null
        });
      }
      // Loại bỏ duplicates nếu có
      newCategories = [...new Set(categories)];
    }

    if (newCategories) {
      // Kiểm tra tất cả categories có tồn tại và active không
      const existingCategories = await Category.find({
        _id: { $in: newCategories },
        status: 'active'
      });

      if (existingCategories.length !== newCategories.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Một hoặc nhiều danh mục không tồn tại hoặc không hoạt động',
          data: null
        });
      }

      // Cập nhật category counts nếu categories thay đổi
      const newCategoriesStr = newCategories.map(cat => cat.toString());
      const categoriesToRemove = oldCategories.filter(cat => !newCategoriesStr.includes(cat));
      const categoriesToAdd = newCategoriesStr.filter(cat => !oldCategories.includes(cat));

      // Giảm count cho categories bị remove
      if (categoriesToRemove.length > 0) {
        await Category.updateMany(
          { _id: { $in: categoriesToRemove } },
          { $inc: { articleCount: -1 } }
        );
      }

      // Tăng count cho categories được add
      if (categoriesToAdd.length > 0) {
        await Category.updateMany(
          { _id: { $in: categoriesToAdd } },
          { $inc: { articleCount: 1 } }
        );
      }

      updateData.categories = newCategories;
    }

    // Xử lý slug
    if (slug !== undefined) {
      const trimmedSlug = slug.trim();
      if (trimmedSlug !== article.slug) {
        // Kiểm tra slug có tồn tại không
        const existingArticle = await Article.findOne({
          slug: trimmedSlug,
          _id: { $ne: id }
        });

        if (existingArticle) {
          return res.status(400).json({
            status: 'error',
            message: 'Slug đã tồn tại',
            data: null
          });
        }

        updateData.slug = trimmedSlug;
      }
    }

    // Tự động tạo slug mới nếu title thay đổi nhưng slug không được cung cấp
    if (title && title.trim() !== article.title && slug === undefined) {
      updateData.slug = await Article.generateUniqueSlug(title, id);
    }

    // Xử lý publishedAt khi thay đổi status
    if (status !== undefined) {
      if (status === 'published' && article.status !== 'published') {
        updateData.publishedAt = new Date();
      } else if (status !== 'published') {
        updateData.publishedAt = null;
      }
    }

    // Cập nhật thông tin người dùng cập nhật
    updateData.updatedBy = req.user.id;

    // Cập nhật bài viết
    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('categories', 'name slug color icon')
     .populate('author', 'username firstName lastName avatar')
     .populate('createdBy', 'username firstName lastName')
     .populate('updatedBy', 'username firstName lastName');

    logger.info('Cập nhật bài viết thành công', {
      articleId: updatedArticle._id,
      articleTitle: updatedArticle.title,
      articleSlug: updatedArticle.slug,
      status: updatedArticle.status,
      updatedBy: req.user.id,
      updateData: Object.keys(updateData),
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật bài viết thành công',
      data: {
        article: updatedArticle.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi cập nhật bài viết', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id,
      body: req.body,
      userId: req.user?.id,
      ip: req.ip
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: errors.join(', '),
        data: null
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        slug: 'Slug',
        title: 'Tiêu đề bài viết'
      };

      return res.status(400).json({
        status: 'error',
        message: `${fieldNames[field] || field} đã tồn tại`,
        data: null
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi cập nhật bài viết',
      data: null
    });
  }
};

// Xóa bài viết với category count update (không dùng transaction vì MongoDB standalone)
export const deleteArticle = async (req, res) => {
  try {

    const { id } = req.params;

    // Tìm bài viết
    const article = await Article.findById(id);
    if (!article) {
      logger.warn('Bài viết không tồn tại khi xóa', {
        articleId: id,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Bài viết không tồn tại',
        data: null
      });
    }

    // Kiểm tra quyền xóa
    if (!article.canBeDeletedBy(req.user)) {
      logger.warn('Không có quyền xóa bài viết', {
        articleId: article._id,
        articleTitle: article.title,
        articleStatus: article.status,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
      });

      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xóa bài viết này',
        data: null
      });
    }

    // Lưu categories trước khi xóa để cập nhật count
    const articleCategories = article.categories.map(cat => cat.toString());

    // Xóa bài viết
    await Article.findByIdAndDelete(id);

    // Giảm articleCount cho tất cả categories liên quan
    if (articleCategories.length > 0) {
      await Category.updateMany(
        { _id: { $in: articleCategories } },
        { $inc: { articleCount: -1 } }
      );
    }

    logger.warn('Xóa bài viết thành công', {
      articleId: article._id,
      articleTitle: article.title,
      articleSlug: article.slug,
      articleStatus: article.status,
      deletedBy: req.user.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Xóa bài viết thành công',
      data: null
    });

  } catch (error) {
    logger.error('Lỗi khi xóa bài viết', {
      error: error.message,
      stack: error.stack,
      articleId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xóa bài viết',
      data: null
    });
  }
};
