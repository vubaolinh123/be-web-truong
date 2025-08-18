import logger from '../../config/logger.js';

// Pre and post hooks for Category model

const addHooks = (schema) => {
  // Pre-save hook để tự động tạo slug từ name nếu chưa có
  schema.pre('save', async function(next) {
    try {
      // Nếu name thay đổi và slug chưa được set hoặc cần cập nhật
      if (this.isModified('name') && (!this.slug || this.isNew)) {
        const Category = this.constructor;
        this.slug = await Category.generateUniqueSlug(this.name, this._id);
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-save hook của Category', { 
        error: error.message,
        categoryId: this._id,
        categoryName: this.name 
      });
      next(error);
    }
  });

  // Pre-save hook để normalize dữ liệu
  schema.pre('save', function(next) {
    // Normalize name - trim và capitalize first letter
    if (this.isModified('name')) {
      this.name = this.name.trim();
      if (this.name) {
        this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
      }
    }

    // Normalize slug - lowercase và trim
    if (this.isModified('slug')) {
      this.slug = this.slug.toLowerCase().trim();
    }

    // Normalize description - trim
    if (this.isModified('description') && this.description) {
      this.description = this.description.trim();
    }

    // Normalize metaTitle - trim
    if (this.isModified('metaTitle') && this.metaTitle) {
      this.metaTitle = this.metaTitle.trim();
    }

    // Normalize metaDescription - trim
    if (this.isModified('metaDescription') && this.metaDescription) {
      this.metaDescription = this.metaDescription.trim();
    }

    // Normalize color - uppercase
    if (this.isModified('color') && this.color) {
      this.color = this.color.toUpperCase();
    }

    // Normalize icon - trim
    if (this.isModified('icon') && this.icon) {
      this.icon = this.icon.trim();
    }

    next();
  });

  // Pre-save hook để validate slug uniqueness
  schema.pre('save', async function(next) {
    try {
      if (this.isModified('slug')) {
        const Category = this.constructor;
        const existingCategory = await Category.findOne({
          slug: this.slug,
          _id: { $ne: this._id }
        });

        if (existingCategory) {
          const error = new Error('Slug đã tồn tại');
          error.name = 'ValidationError';
          return next(error);
        }
      }

      next();
    } catch (error) {
      logger.error('Lỗi khi validate slug uniqueness', { 
        error: error.message,
        categoryId: this._id,
        slug: this.slug 
      });
      next(error);
    }
  });

  // Post-save hook để log thông tin
  schema.post('save', function(doc, next) {
    if (this.isNew) {
      logger.info('Danh mục mới được tạo', {
        categoryId: doc._id,
        name: doc.name,
        slug: doc.slug,
        status: doc.status,
        createdBy: doc.createdBy
      });
    } else {
      logger.info('Danh mục được cập nhật', {
        categoryId: doc._id,
        name: doc.name,
        slug: doc.slug,
        status: doc.status,
        updatedBy: doc.updatedBy
      });
    }
    next();
  });

  // Pre-remove hook để kiểm tra ràng buộc
  schema.pre('remove', async function(next) {
    try {
      // Kiểm tra xem danh mục có bài viết không
      if (this.articleCount > 0) {
        const error = new Error(`Không thể xóa danh mục "${this.name}" vì còn ${this.articleCount} bài viết`);
        error.name = 'ValidationError';
        return next(error);
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-remove hook của Category', { 
        error: error.message,
        categoryId: this._id,
        categoryName: this.name 
      });
      next(error);
    }
  });

  // Post-remove hook để log thông tin
  schema.post('remove', function(doc, next) {
    logger.warn('Danh mục đã bị xóa', {
      categoryId: doc._id,
      name: doc.name,
      slug: doc.slug,
      articleCount: doc.articleCount
    });
    next();
  });

  // Pre-findOneAndUpdate hook để normalize dữ liệu
  schema.pre('findOneAndUpdate', async function(next) {
    try {
      const update = this.getUpdate();
      
      // Normalize name
      if (update.name) {
        update.name = update.name.trim();
        if (update.name) {
          update.name = update.name.charAt(0).toUpperCase() + update.name.slice(1);
        }
      }

      // Normalize slug
      if (update.slug) {
        update.slug = update.slug.toLowerCase().trim();
        
        // Kiểm tra slug uniqueness
        const Category = this.model;
        const existingCategory = await Category.findOne({
          slug: update.slug,
          _id: { $ne: this.getQuery()._id }
        });

        if (existingCategory) {
          const error = new Error('Slug đã tồn tại');
          error.name = 'ValidationError';
          return next(error);
        }
      }

      // Tự động tạo slug từ name nếu name thay đổi nhưng slug không được cung cấp
      if (update.name && !update.slug) {
        const Category = this.model;
        update.slug = await Category.generateUniqueSlug(update.name, this.getQuery()._id);
      }

      // Normalize description
      if (update.description) {
        update.description = update.description.trim();
      }

      // Normalize metaTitle
      if (update.metaTitle) {
        update.metaTitle = update.metaTitle.trim();
      }

      // Normalize metaDescription
      if (update.metaDescription) {
        update.metaDescription = update.metaDescription.trim();
      }

      // Normalize color
      if (update.color) {
        update.color = update.color.toUpperCase();
      }

      // Normalize icon
      if (update.icon) {
        update.icon = update.icon.trim();
      }

      // Cập nhật updatedAt
      update.updatedAt = new Date();

      next();
    } catch (error) {
      logger.error('Lỗi trong hook findOneAndUpdate của Category', { 
        error: error.message 
      });
      next(error);
    }
  });

  // Post-findOneAndUpdate hook để log cập nhật
  schema.post('findOneAndUpdate', function(doc, next) {
    if (doc) {
      logger.info('Danh mục được cập nhật qua findOneAndUpdate', {
        categoryId: doc._id,
        name: doc.name,
        slug: doc.slug,
        status: doc.status
      });
    }
    next();
  });

  // Pre-findOneAndDelete hook để kiểm tra ràng buộc
  schema.pre('findOneAndDelete', async function(next) {
    try {
      const doc = await this.model.findOne(this.getQuery());
      
      if (doc && doc.articleCount > 0) {
        const error = new Error(`Không thể xóa danh mục "${doc.name}" vì còn ${doc.articleCount} bài viết`);
        error.name = 'ValidationError';
        return next(error);
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-findOneAndDelete hook của Category', { 
        error: error.message 
      });
      next(error);
    }
  });

  // Post-findOneAndDelete hook để log xóa
  schema.post('findOneAndDelete', function(doc, next) {
    if (doc) {
      logger.warn('Danh mục đã bị xóa qua findOneAndDelete', {
        categoryId: doc._id,
        name: doc.name,
        slug: doc.slug,
        articleCount: doc.articleCount
      });
    }
    next();
  });

  // Index creation hooks
  schema.post('init', function() {
    // Đảm bảo indexes được tạo
    this.constructor.createIndexes().catch(error => {
      logger.error('Lỗi khi tạo index cho Category model', { error: error.message });
    });
  });
};

export default addHooks;
