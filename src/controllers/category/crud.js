import Category from '../../models/Category/index.js';
import logger from '../../config/logger.js';

// Lấy danh sách tất cả danh mục với phân trang
export const getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = null,
      sortBy = 'createdAt',
      sortOrder = -1,
      search = null
    } = req.query;

    // Tạo filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Nếu có search, sử dụng text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Validate và convert sort parameters
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'sortOrder', 'articleCount'];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Convert sortOrder string to MongoDB sort value
    let finalSortOrder;
    if (typeof sortOrder === 'string') {
      finalSortOrder = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
    } else {
      finalSortOrder = parseInt(sortOrder) || -1;
    }

    // Lấy danh mục với phân trang
    const result = await Category.findWithPagination(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: finalSortBy,
      sortOrder: finalSortOrder
    });

    logger.info('Lấy danh sách danh mục thành công', {
      totalCategories: result.pagination.totalCategories,
      currentPage: result.pagination.currentPage,
      sortBy: finalSortBy,
      sortOrder: finalSortOrder,
      filter,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách danh mục thành công',
      data: {
        categories: result.categories.map(category => category.getBasicInfo()),
        pagination: result.pagination
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy danh sách danh mục', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy danh sách danh mục',
      data: null
    });
  }
};

// Lấy thông tin chi tiết một danh mục
export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm danh mục theo ID hoặc slug
    let category;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Nếu là ObjectId
      category = await Category.findById(id)
        .populate('createdBy', 'username firstName lastName')
        .populate('updatedBy', 'username firstName lastName');
    } else {
      // Nếu là slug
      category = await Category.findBySlug(id)
        .populate('createdBy', 'username firstName lastName')
        .populate('updatedBy', 'username firstName lastName');
    }

    if (!category) {
      logger.warn('Danh mục không tồn tại', {
        categoryId: id,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Danh mục không tồn tại',
        data: null
      });
    }

    logger.info('Lấy thông tin danh mục thành công', {
      categoryId: category._id,
      categoryName: category.name,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Lấy thông tin danh mục thành công',
      data: {
        category: category.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thông tin danh mục', {
      error: error.message,
      stack: error.stack,
      categoryId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thông tin danh mục',
      data: null
    });
  }
};

// Tạo danh mục mới
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      status = 'active',
      metaTitle,
      metaDescription,
      sortOrder = 0,
      color = '#3B82F6',
      icon
    } = req.body;

    // Validate dữ liệu đầu vào
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Tên danh mục là bắt buộc',
        data: null
      });
    }

    // Tạo slug nếu không được cung cấp
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = await Category.generateUniqueSlug(name);
    } else {
      // Kiểm tra slug có tồn tại không
      const existingCategory = await Category.findBySlug(finalSlug);
      if (existingCategory) {
        return res.status(400).json({
          status: 'error',
          message: 'Slug đã tồn tại',
          data: null
        });
      }
    }

    // Tạo danh mục mới
    const categoryData = {
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim(),
      status,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
      sortOrder: parseInt(sortOrder) || 0,
      color,
      icon: icon?.trim(),
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const category = await Category.create(categoryData);

    logger.info('Tạo danh mục mới thành công', {
      categoryId: category._id,
      categoryName: category.name,
      categorySlug: category.slug,
      createdBy: req.user.id,
      ip: req.ip
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo danh mục mới thành công',
      data: {
        category: category.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi tạo danh mục mới', {
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
        name: 'Tên danh mục'
      };
      
      return res.status(400).json({
        status: 'error',
        message: `${fieldNames[field] || field} đã tồn tại`,
        data: null
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi tạo danh mục',
      data: null
    });
  }
};

// Cập nhật danh mục
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      status,
      metaTitle,
      metaDescription,
      sortOrder,
      color,
      icon
    } = req.body;

    // Tìm danh mục
    const category = await Category.findById(id);
    if (!category) {
      logger.warn('Danh mục không tồn tại khi cập nhật', {
        categoryId: id,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Danh mục không tồn tại',
        data: null
      });
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (status !== undefined) updateData.status = status;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle?.trim();
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription?.trim();
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon?.trim();

    // Xử lý slug
    if (slug !== undefined) {
      const trimmedSlug = slug.trim();
      if (trimmedSlug !== category.slug) {
        // Kiểm tra slug có tồn tại không
        const existingCategory = await Category.findOne({
          slug: trimmedSlug,
          _id: { $ne: id }
        });

        if (existingCategory) {
          return res.status(400).json({
            status: 'error',
            message: 'Slug đã tồn tại',
            data: null
          });
        }

        updateData.slug = trimmedSlug;
      }
    }

    // Tự động tạo slug mới nếu name thay đổi nhưng slug không được cung cấp
    if (name && name.trim() !== category.name && slug === undefined) {
      updateData.slug = await Category.generateUniqueSlug(name, id);
    }

    // Cập nhật thông tin người dùng cập nhật
    updateData.updatedBy = req.user.id;

    // Cập nhật danh mục
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username firstName lastName')
     .populate('updatedBy', 'username firstName lastName');

    logger.info('Cập nhật danh mục thành công', {
      categoryId: updatedCategory._id,
      categoryName: updatedCategory.name,
      categorySlug: updatedCategory.slug,
      updatedBy: req.user.id,
      updateData,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật danh mục thành công',
      data: {
        category: updatedCategory.getDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi cập nhật danh mục', {
      error: error.message,
      stack: error.stack,
      categoryId: req.params.id,
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
        name: 'Tên danh mục'
      };

      return res.status(400).json({
        status: 'error',
        message: `${fieldNames[field] || field} đã tồn tại`,
        data: null
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi cập nhật danh mục',
      data: null
    });
  }
};

// Xóa danh mục
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm danh mục
    const category = await Category.findById(id);
    if (!category) {
      logger.warn('Danh mục không tồn tại khi xóa', {
        categoryId: id,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(404).json({
        status: 'error',
        message: 'Danh mục không tồn tại',
        data: null
      });
    }

    // Kiểm tra xem danh mục có thể xóa không (không có bài viết)
    if (!category.canBeDeleted()) {
      logger.warn('Không thể xóa danh mục vì còn bài viết', {
        categoryId: category._id,
        categoryName: category.name,
        articleCount: category.articleCount,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(400).json({
        status: 'error',
        message: `Không thể xóa danh mục "${category.name}" vì còn ${category.articleCount} bài viết`,
        data: null
      });
    }

    // Xóa danh mục
    await Category.findByIdAndDelete(id);

    logger.warn('Xóa danh mục thành công', {
      categoryId: category._id,
      categoryName: category.name,
      categorySlug: category.slug,
      deletedBy: req.user.id,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: 'Xóa danh mục thành công',
      data: null
    });

  } catch (error) {
    logger.error('Lỗi khi xóa danh mục', {
      error: error.message,
      stack: error.stack,
      categoryId: req.params.id,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xóa danh mục',
      data: null
    });
  }
};
