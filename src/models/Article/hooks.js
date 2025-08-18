import logger from '../../config/logger.js';

// Pre and post hooks for Article model

const addHooks = (schema) => {
  // Pre-save hook để tự động tạo slug từ title nếu chưa có
  schema.pre('save', async function(next) {
    try {
      // Nếu title thay đổi và slug chưa được set hoặc cần cập nhật
      if (this.isModified('title') && (!this.slug || this.isNew)) {
        const Article = this.constructor;
        this.slug = await Article.generateUniqueSlug(this.title, this._id);
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-save hook của Article', { 
        error: error.message,
        articleId: this._id,
        articleTitle: this.title 
      });
      next(error);
    }
  });

  // Pre-save hook để tự động cập nhật thời gian đọc
  schema.pre('save', function(next) {
    if (this.isModified('content') && !this.readingTime) {
      const Article = this.constructor;
      this.readingTime = Article.calculateReadingTime(this.content);
    }
    next();
  });

  // Pre-save hook để tự động tạo excerpt nếu chưa có
  schema.pre('save', function(next) {
    if (this.isModified('content') && !this.excerpt) {
      this.updateExcerpt();
    }
    next();
  });

  // Pre-save hook để normalize dữ liệu
  schema.pre('save', function(next) {
    // Normalize title - trim và capitalize first letter
    if (this.isModified('title')) {
      this.title = this.title.trim();
    }

    // Normalize slug - lowercase và trim
    if (this.isModified('slug')) {
      this.slug = this.slug.toLowerCase().trim();
    }

    // Normalize content - trim
    if (this.isModified('content')) {
      this.content = this.content.trim();
    }

    // Normalize excerpt - trim
    if (this.isModified('excerpt') && this.excerpt) {
      this.excerpt = this.excerpt.trim();
    }

    // Normalize metaTitle - trim
    if (this.isModified('metaTitle') && this.metaTitle) {
      this.metaTitle = this.metaTitle.trim();
    }

    // Normalize metaDescription - trim
    if (this.isModified('metaDescription') && this.metaDescription) {
      this.metaDescription = this.metaDescription.trim();
    }

    // Normalize tags - lowercase và trim
    if (this.isModified('tags')) {
      this.tags = this.tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    }

    // Normalize keywords - trim
    if (this.isModified('keywords')) {
      this.keywords = this.keywords.map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
    }

    // Normalize featuredImage alt và caption
    if (this.isModified('featuredImage')) {
      if (this.featuredImage && this.featuredImage.alt) {
        this.featuredImage.alt = this.featuredImage.alt.trim();
      }
      if (this.featuredImage && this.featuredImage.caption) {
        this.featuredImage.caption = this.featuredImage.caption.trim();
      }
    }

    next();
  });

  // Pre-save hook để validate slug uniqueness
  schema.pre('save', async function(next) {
    try {
      if (this.isModified('slug')) {
        const Article = this.constructor;
        const existingArticle = await Article.findOne({
          slug: this.slug,
          _id: { $ne: this._id }
        });

        if (existingArticle) {
          const error = new Error('Slug đã tồn tại');
          error.name = 'ValidationError';
          return next(error);
        }
      }

      next();
    } catch (error) {
      logger.error('Lỗi khi validate slug uniqueness của Article', { 
        error: error.message,
        articleId: this._id,
        slug: this.slug 
      });
      next(error);
    }
  });

  // Pre-save hook để validate categories
  schema.pre('save', async function(next) {
    try {
      if (this.isModified('categories')) {
        // Kiểm tra xem tất cả categories có tồn tại không
        const Category = this.db.model('Category');
        const existingCategories = await Category.find({
          _id: { $in: this.categories },
          status: 'active'
        });

        if (existingCategories.length !== this.categories.length) {
          const error = new Error('Một hoặc nhiều danh mục không tồn tại hoặc không hoạt động');
          error.name = 'ValidationError';
          return next(error);
        }
      }

      next();
    } catch (error) {
      logger.error('Lỗi khi validate categories của Article', { 
        error: error.message,
        articleId: this._id,
        categories: this.categories 
      });
      next(error);
    }
  });

  // Pre-save hook để set publishedAt khi publish
  schema.pre('save', function(next) {
    if (this.isModified('status')) {
      if (this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
      } else if (this.status !== 'published') {
        this.publishedAt = null;
      }
    }
    next();
  });

  // Post-save hook để cập nhật article count trong categories
  schema.post('save', async function(doc, next) {
    try {
      const Category = this.db.model('Category');
      
      // Nếu là bài viết mới được tạo
      if (this.isNew) {
        // Tăng article count cho tất cả categories
        await Category.updateMany(
          { _id: { $in: doc.categories } },
          { $inc: { articleCount: 1 } }
        );
        
        logger.info('Bài viết mới được tạo', {
          articleId: doc._id,
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
          author: doc.author,
          categories: doc.categories
        });
      } else {
        logger.info('Bài viết được cập nhật', {
          articleId: doc._id,
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
          updatedBy: doc.updatedBy
        });
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong post-save hook của Article', { 
        error: error.message,
        articleId: doc._id 
      });
      next();
    }
  });

  // Pre-remove hook để cập nhật article count trong categories
  schema.pre('remove', async function(next) {
    try {
      const Category = this.db.model('Category');

      // Giảm article count cho tất cả categories
      await Category.updateMany(
        { _id: { $in: this.categories } },
        { $inc: { articleCount: -1 } }
      );

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-remove hook của Article', {
        error: error.message,
        articleId: this._id,
        articleTitle: this.title
      });
      next(error);
    }
  });

  // Pre-findByIdAndDelete hook để cập nhật article count trong categories
  schema.pre('findOneAndDelete', async function(next) {
    try {
      const doc = await this.model.findOne(this.getQuery());

      if (doc) {
        const Category = this.model.db.model('Category');

        // Giảm article count cho tất cả categories
        await Category.updateMany(
          { _id: { $in: doc.categories } },
          { $inc: { articleCount: -1 } }
        );
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-findOneAndDelete hook của Article', {
        error: error.message
      });
      next(error);
    }
  });

  // Post-remove hook để log thông tin
  schema.post('remove', function(doc, next) {
    logger.warn('Bài viết đã bị xóa', {
      articleId: doc._id,
      title: doc.title,
      slug: doc.slug,
      status: doc.status,
      categories: doc.categories
    });
    next();
  });

  // Pre-findOneAndUpdate hook để normalize dữ liệu
  schema.pre('findOneAndUpdate', async function(next) {
    try {
      const update = this.getUpdate();
      
      // Normalize title
      if (update.title) {
        update.title = update.title.trim();
      }

      // Normalize slug
      if (update.slug) {
        update.slug = update.slug.toLowerCase().trim();
        
        // Kiểm tra slug uniqueness
        const Article = this.model;
        const existingArticle = await Article.findOne({
          slug: update.slug,
          _id: { $ne: this.getQuery()._id }
        });

        if (existingArticle) {
          const error = new Error('Slug đã tồn tại');
          error.name = 'ValidationError';
          return next(error);
        }
      }

      // Tự động tạo slug từ title nếu title thay đổi nhưng slug không được cung cấp
      if (update.title && !update.slug) {
        const Article = this.model;
        update.slug = await Article.generateUniqueSlug(update.title, this.getQuery()._id);
      }

      // Normalize content
      if (update.content) {
        update.content = update.content.trim();
        
        // Tự động cập nhật reading time
        if (!update.readingTime) {
          const Article = this.model;
          update.readingTime = Article.calculateReadingTime(update.content);
        }
      }

      // Normalize excerpt
      if (update.excerpt) {
        update.excerpt = update.excerpt.trim();
      }

      // Normalize metaTitle
      if (update.metaTitle) {
        update.metaTitle = update.metaTitle.trim();
      }

      // Normalize metaDescription
      if (update.metaDescription) {
        update.metaDescription = update.metaDescription.trim();
      }

      // Normalize tags
      if (update.tags) {
        update.tags = update.tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
      }

      // Normalize keywords
      if (update.keywords) {
        update.keywords = update.keywords.map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
      }

      // Set publishedAt khi publish
      if (update.status === 'published' && !update.publishedAt) {
        update.publishedAt = new Date();
      } else if (update.status && update.status !== 'published') {
        update.publishedAt = null;
      }

      // Cập nhật updatedAt
      update.updatedAt = new Date();

      next();
    } catch (error) {
      logger.error('Lỗi trong hook findOneAndUpdate của Article', { 
        error: error.message 
      });
      next(error);
    }
  });

  // Post-findOneAndUpdate hook để log cập nhật
  schema.post('findOneAndUpdate', function(doc, next) {
    if (doc) {
      logger.info('Bài viết được cập nhật qua findOneAndUpdate', {
        articleId: doc._id,
        title: doc.title,
        slug: doc.slug,
        status: doc.status
      });
    }
    next();
  });

  // Pre-findOneAndDelete hook để cập nhật article count
  schema.pre('findOneAndDelete', async function(next) {
    try {
      const doc = await this.model.findOne(this.getQuery());
      
      if (doc) {
        const Category = this.model.db.model('Category');
        
        // Giảm article count cho tất cả categories
        await Category.updateMany(
          { _id: { $in: doc.categories } },
          { $inc: { articleCount: -1 } }
        );
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong pre-findOneAndDelete hook của Article', { 
        error: error.message 
      });
      next(error);
    }
  });

  // Post-findOneAndDelete hook để log xóa
  schema.post('findOneAndDelete', function(doc, next) {
    if (doc) {
      logger.warn('Bài viết đã bị xóa qua findOneAndDelete', {
        articleId: doc._id,
        title: doc.title,
        slug: doc.slug,
        status: doc.status,
        categories: doc.categories
      });
    }
    next();
  });

  // Index creation hooks
  schema.post('init', function() {
    // Đảm bảo indexes được tạo
    this.constructor.createIndexes().catch(error => {
      logger.error('Lỗi khi tạo index cho Article model', { error: error.message });
    });
  });
};

export default addHooks;
