// Static methods for Category model

const addStatics = (schema) => {
  // Tìm danh mục theo slug
  schema.statics.findBySlug = function(slug) {
    return this.findOne({ slug: slug.toLowerCase() });
  };

  // Tìm các danh mục đang hoạt động
  schema.statics.findActive = function(filter = {}) {
    return this.find({ ...filter, status: 'active' });
  };

  // Tìm các danh mục theo trạng thái
  schema.statics.findByStatus = function(status, filter = {}) {
    return this.find({ ...filter, status });
  };

  // Lấy thống kê danh mục
  schema.statics.getStatistics = async function() {
    const totalCategories = await this.countDocuments();
    const activeCategories = await this.countDocuments({ status: 'active' });
    const inactiveCategories = await this.countDocuments({ status: 'inactive' });
    
    const categoriesWithArticles = await this.countDocuments({ articleCount: { $gt: 0 } });
    const categoriesWithoutArticles = await this.countDocuments({ articleCount: 0 });

    const topCategories = await this.find({ status: 'active' })
      .sort({ articleCount: -1 })
      .limit(5)
      .select('name slug articleCount');

    const recentCategories = await this.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name slug status createdAt');

    return {
      total: totalCategories,
      active: activeCategories,
      inactive: inactiveCategories,
      withArticles: categoriesWithArticles,
      withoutArticles: categoriesWithoutArticles,
      topCategories,
      recentCategories
    };
  };

  // Tạo slug từ tên danh mục
  schema.statics.generateSlug = function(name) {
    if (!name) return '';
    
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

    let slug = name.toLowerCase().trim();
    
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

  // Kiểm tra slug có tồn tại không (cho validation)
  schema.statics.isSlugExists = async function(slug, excludeId = null) {
    const query = { slug: slug.toLowerCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const category = await this.findOne(query);
    return !!category;
  };

  // Tạo slug duy nhất
  schema.statics.generateUniqueSlug = async function(name, excludeId = null) {
    let baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.isSlugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  };

  // Tìm danh mục với phân trang
  schema.statics.findWithPagination = async function(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1,
      select = null
    } = options;

    // Validate sortOrder to prevent NaN errors
    const validSortOrder = typeof sortOrder === 'number' && !isNaN(sortOrder) ? sortOrder : -1;

    const skip = (page - 1) * limit;
    
    let query = this.find(filter);
    
    if (select) {
      query = query.select(select);
    }
    
    const [categories, total] = await Promise.all([
      query
        .sort({ [sortBy]: validSortOrder })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username firstName lastName')
        .populate('updatedBy', 'username firstName lastName'),
      this.countDocuments(filter)
    ]);

    return {
      categories,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCategories: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        limit
      }
    };
  };

  // Tìm kiếm danh mục theo từ khóa
  schema.statics.search = function(keyword, options = {}) {
    const {
      status = null,
      limit = 10,
      sortBy = 'name',
      sortOrder = 1
    } = options;

    const searchRegex = new RegExp(keyword, 'i');
    const filter = {
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { metaTitle: searchRegex },
        { metaDescription: searchRegex }
      ]
    };

    if (status) {
      filter.status = status;
    }

    return this.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .select('name slug description status articleCount createdAt');
  };

  // Cập nhật số lượng bài viết cho danh mục
  schema.statics.updateArticleCount = async function(categoryId, increment = 1) {
    return await this.findByIdAndUpdate(
      categoryId,
      { $inc: { articleCount: increment } },
      { new: true }
    );
  };

  // Lấy danh mục phổ biến (có nhiều bài viết nhất)
  schema.statics.getPopularCategories = function(limit = 5) {
    return this.find({ status: 'active', articleCount: { $gt: 0 } })
      .sort({ articleCount: -1, name: 1 })
      .limit(limit)
      .select('name slug articleCount color icon');
  };

  // Lấy danh mục theo thứ tự hiển thị
  schema.statics.getOrderedCategories = function(status = 'active') {
    const filter = status ? { status } : {};
    return this.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug description color icon articleCount sortOrder');
  };
};

export default addStatics;
