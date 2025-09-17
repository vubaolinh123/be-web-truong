// Static methods for Article model

const addStatics = (schema) => {
  // Tìm bài viết theo slug
  schema.statics.findBySlug = function(slug) {
    return this.findOne({ slug: slug.toLowerCase() })
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role');
  };

  // Tìm các bài viết đã xuất bản
  schema.statics.findPublished = function(filter = {}) {
    return this.find({ ...filter, status: 'published' })
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role');
  };

  // Tìm các bài viết theo trạng thái
  schema.statics.findByStatus = function(status, filter = {}) {
    return this.find({ ...filter, status })
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role');
  };

  // Tìm các bài viết theo danh mục
  schema.statics.findByCategory = function(categoryId, filter = {}) {
    return this.find({ ...filter, categories: categoryId })
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role');
  };

  // Tìm các bài viết theo tác giả
  schema.statics.findByAuthor = function(authorId, filter = {}) {
    return this.find({ ...filter, author: authorId })
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role');
  };

  // Lấy thống kê bài viết
  schema.statics.getStatistics = async function() {
    const totalArticles = await this.countDocuments();
    const publishedArticles = await this.countDocuments({ status: 'published' });
    const draftArticles = await this.countDocuments({ status: 'draft' });
    const archivedArticles = await this.countDocuments({ status: 'archived' });
    const featuredArticles = await this.countDocuments({ featured: true });
    
    const totalViews = await this.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } }
    ]);

    const totalLikes = await this.aggregate([
      { $group: { _id: null, total: { $sum: '$likeCount' } } }
    ]);

    const totalComments = await this.aggregate([
      { $group: { _id: null, total: { $sum: '$commentCount' } } }
    ]);

    const topArticles = await this.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title slug viewCount likeCount')
      .populate('author', 'username firstName lastName');

    const recentArticles = await this.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title slug status createdAt')
      .populate('author', 'username firstName lastName');

    return {
      total: totalArticles,
      published: publishedArticles,
      draft: draftArticles,
      archived: archivedArticles,
      featured: featuredArticles,
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      totalComments: totalComments[0]?.total || 0,
      topArticles,
      recentArticles
    };
  };

  // Tạo slug từ tiêu đề bài viết
  schema.statics.generateSlug = function(title) {
    if (!title) return '';
    
    // Chuyển đổi tiếng Việt sang không dấu
    const vietnameseMap = {
      'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
      'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
      'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
      'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
      'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
      'đ': 'd'
    };

    let slug = title.toLowerCase().trim();
    
    // Thay thế ký tự tiếng Việt
    for (const [vietnamese, english] of Object.entries(vietnameseMap)) {
      slug = slug.replace(new RegExp(vietnamese, 'g'), english);
    }
    
    // Thay thế khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
    slug = slug
      .replace(/[^a-z0-9\s-]/g, '') // Loại bỏ ký tự đặc biệt
      .replace(/\s+/g, '-') // Thay khoảng trắng bằng dấu gạch ngang
      .replace(/-+/g, '-') // Loại bỏ dấu gạch ngang liên tiếp
      .replace(/^-|-$/g, ''); // Loại bỏ dấu gạch ngang ở đầu và cuối

    return slug;
  };

  // Kiểm tra slug có tồn tại không
  schema.statics.isSlugExists = async function(slug, excludeId = null) {
    const query = { slug: slug.toLowerCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const article = await this.findOne(query);
    return !!article;
  };

  // Tạo slug duy nhất
  schema.statics.generateUniqueSlug = async function(title, excludeId = null) {
    let baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.isSlugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  };

  // Tìm bài viết với phân trang
  schema.statics.findWithPagination = async function(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1,
      sort = null,
      select = null,
      populate = true
    } = options;

    // Validate sortOrder to ensure it's a valid MongoDB sort value
    const validSortOrder = (sortOrder === 1 || sortOrder === -1) ? sortOrder : -1;

    // Validate sortBy to prevent injection attacks
    const allowedSortFields = [
      'createdAt', 'updatedAt', 'publishedAt', 'title',
      'viewCount', 'likeCount', 'commentCount', 'status',
      'featured', 'readingTime', 'seoScore'
    ];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const skip = (page - 1) * limit;

    let query = this.find(filter);

    if (select) {
      query = query.select(select);
    }

    if (populate) {
      query = query
        .populate('categories', 'name slug')
        .populate('author', 'username firstName lastName avatar role');
    }

    // Determine sort: prefer explicit sort object if provided, otherwise use sortBy/sortOrder
    const sortObject = (sort && typeof sort === 'object' && Object.keys(sort).length > 0)
      ? sort
      : { [validSortBy]: validSortOrder };

    const [articles, total] = await Promise.all([
      query
        .sort(sortObject)
        .skip(skip)
        .limit(limit),
      this.countDocuments(filter)
    ]);

    return {
      articles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        limit
      }
    };
  };

  // Tìm kiếm bài viết theo từ khóa
  schema.statics.search = function(keyword, options = {}) {
    const {
      status = 'published',
      categories = null,
      author = null,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1
    } = options;

    const searchRegex = new RegExp(keyword, 'i');
    const filter = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { excerpt: searchRegex },
        { metaTitle: searchRegex },
        { metaDescription: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    };

    if (status) {
      filter.status = status;
    }

    if (categories && categories.length > 0) {
      filter.categories = { $in: categories };
    }

    if (author) {
      filter.author = author;
    }

    return this.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role')
      .select('title slug excerpt featuredImage viewCount likeCount createdAt publishedAt');
  };

  // Lấy bài viết liên quan
  schema.statics.getRelatedArticles = async function(articleId, limit = 5) {
    const article = await this.findById(articleId).select('categories tags');
    if (!article) return [];

    const relatedFilter = {
      _id: { $ne: articleId },
      status: 'published',
      $or: [
        { categories: { $in: article.categories } },
        { tags: { $in: article.tags } }
      ]
    };

    return await this.find(relatedFilter)
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role')
      .select('title slug excerpt featuredImage viewCount createdAt publishedAt');
  };

  // Lấy bài viết phổ biến
  schema.statics.getPopularArticles = function(limit = 5, timeframe = null) {
    const filter = { status: 'published' };
    
    // Nếu có timeframe, lọc theo thời gian
    if (timeframe) {
      const date = new Date();
      switch (timeframe) {
        case 'week':
          date.setDate(date.getDate() - 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() - 1);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() - 1);
          break;
      }
      filter.publishedAt = { $gte: date };
    }

    return this.find(filter)
      .sort({ viewCount: -1, likeCount: -1 })
      .limit(limit)
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role')
      .select('title slug excerpt featuredImage viewCount likeCount publishedAt');
  };

  // Lấy bài viết nổi bật
  schema.statics.getFeaturedArticles = function(limit = 5) {
    return this.find({ status: 'published', featured: true })
      .sort({ sortOrder: 1, publishedAt: -1 })
      .limit(limit)
      .populate('categories', 'name slug')
      .populate('author', 'username firstName lastName avatar role')
      .select('title slug excerpt featuredImage viewCount likeCount publishedAt sortOrder');
  };

  // Tính toán thời gian đọc từ content
  schema.statics.calculateReadingTime = function(content) {
    if (!content) return 1;
    
    const textContent = content.replace(/<[^>]*>/g, '');
    const wordCount = textContent.trim().split(/\s+/).length;
    const wordsPerMinute = 200;
    
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };
};

export default addStatics;
