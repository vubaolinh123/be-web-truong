// Instance methods for Article model
import { toVietnamTime } from '../../utils/timezone.js';

const addMethods = (schema) => {
  // Xuất bản bài viết
  schema.methods.publish = async function() {
    this.status = 'published';
    this.publishedAt = new Date();
    
    // Tự động tính thời gian đọc nếu chưa có
    if (!this.readingTime) {
      const Article = this.constructor;
      this.readingTime = Article.calculateReadingTime(this.content);
    }
    
    return await this.save();
  };

  // Chuyển về bản nháp
  schema.methods.unpublish = async function() {
    this.status = 'draft';
    this.publishedAt = null;
    return await this.save({ validateBeforeSave: false });
  };

  // Lưu trữ bài viết
  schema.methods.archive = async function() {
    this.status = 'archived';
    return await this.save({ validateBeforeSave: false });
  };

  // Khôi phục từ lưu trữ
  schema.methods.unarchive = async function() {
    this.status = 'draft';
    return await this.save({ validateBeforeSave: false });
  };

  // Đặt làm bài viết nổi bật
  schema.methods.setFeatured = async function(featured = true) {
    this.featured = featured;
    return await this.save({ validateBeforeSave: false });
  };

  // Tăng lượt xem
  schema.methods.incrementViewCount = async function(count = 1) {
    this.viewCount += count;
    return await this.save({ validateBeforeSave: false });
  };

  // Tăng lượt thích
  schema.methods.incrementLikeCount = async function(count = 1) {
    this.likeCount += count;
    return await this.save({ validateBeforeSave: false });
  };

  // Giảm lượt thích
  schema.methods.decrementLikeCount = async function(count = 1) {
    this.likeCount = Math.max(0, this.likeCount - count);
    return await this.save({ validateBeforeSave: false });
  };

  // Tăng số bình luận
  schema.methods.incrementCommentCount = async function(count = 1) {
    this.commentCount += count;
    return await this.save({ validateBeforeSave: false });
  };

  // Giảm số bình luận
  schema.methods.decrementCommentCount = async function(count = 1) {
    this.commentCount = Math.max(0, this.commentCount - count);
    return await this.save({ validateBeforeSave: false });
  };

  // Cập nhật slug từ tiêu đề
  schema.methods.updateSlugFromTitle = async function() {
    const Article = this.constructor;
    this.slug = await Article.generateUniqueSlug(this.title, this._id);
    return this;
  };

  // Cập nhật thời gian đọc
  schema.methods.updateReadingTime = function() {
    const Article = this.constructor;
    this.readingTime = Article.calculateReadingTime(this.content);
    return this;
  };

  // Tự động tạo excerpt từ content
  schema.methods.generateExcerpt = function(length = 150) {
    if (!this.content) return '';
    
    const textContent = this.content.replace(/<[^>]*>/g, '');
    return textContent.length > length 
      ? textContent.substring(0, length) + '...'
      : textContent;
  };

  // Cập nhật excerpt tự động
  schema.methods.updateExcerpt = function(length = 150) {
    if (!this.excerpt) {
      this.excerpt = this.generateExcerpt(length);
    }
    return this;
  };

  // Thêm danh mục
  schema.methods.addCategory = async function(categoryId) {
    if (!this.categories.includes(categoryId)) {
      this.categories.push(categoryId);
      return await this.save();
    }
    return this;
  };

  // Xóa danh mục
  schema.methods.removeCategory = async function(categoryId) {
    this.categories = this.categories.filter(cat => !cat.equals(categoryId));
    return await this.save();
  };

  // Thêm tag
  schema.methods.addTag = async function(tag) {
    const normalizedTag = tag.trim().toLowerCase();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
      return await this.save();
    }
    return this;
  };

  // Xóa tag
  schema.methods.removeTag = async function(tag) {
    const normalizedTag = tag.trim().toLowerCase();
    this.tags = this.tags.filter(t => t !== normalizedTag);
    return await this.save();
  };

  // Lấy thông tin cơ bản của bài viết
  schema.methods.getBasicInfo = function() {
    return {
      id: this._id,
      title: this.title,
      slug: this.slug,
      excerpt: this.displayExcerpt,
      featuredImage: this.featuredImage,
      status: this.status,
      statusDisplay: this.statusDisplay,
      featured: this.featured,
      viewCount: this.viewCount,
      likeCount: this.likeCount,
      commentCount: this.commentCount,
      readingTime: this.estimatedReadingTime,
      readingTimeDisplay: this.readingTimeDisplay,
      publishedAt: this.publishedAt,
      publishedTimeAgo: this.publishedTimeAgo,
      url: this.url,
      isPublished: this.isPublished,
      isDraft: this.isDraft,
      isArchived: this.isArchived,
      hasFeaturedImage: this.hasFeaturedImage,
      createdAt: toVietnamTime(this.createdAt),
      updatedAt: toVietnamTime(this.updatedAt),
      publishedAt: toVietnamTime(this.publishedAt),
      author: this.author,
      categories: this.categories
    };
  };

  // Lấy thông tin chi tiết của bài viết
  schema.methods.getDetailedInfo = function() {
    return {
      id: this._id,
      title: this.title,
      slug: this.slug,
      content: this.content,
      excerpt: this.excerpt,
      displayExcerpt: this.displayExcerpt,
      featuredImage: this.featuredImage,
      categories: this.categories,
      categoryNames: this.categoryNames,
      author: this.author,
      authorName: this.authorName,
      status: this.status,
      statusDisplay: this.statusDisplay,
      publishedAt: this.publishedAt,
      publishedTimeAgo: this.publishedTimeAgo,
      metaTitle: this.metaTitle,
      metaDescription: this.metaDescription,
      displayTitle: this.displayTitle,
      displayDescription: this.displayDescription,
      keywords: this.keywords,
      tags: this.tags,
      viewCount: this.viewCount,
      viewCountDisplay: this.viewCountDisplay,
      likeCount: this.likeCount,
      likeCountDisplay: this.likeCountDisplay,
      commentCount: this.commentCount,
      commentCountDisplay: this.commentCountDisplay,
      featured: this.featured,
      allowComments: this.allowComments,
      readingTime: this.readingTime,
      estimatedReadingTime: this.estimatedReadingTime,
      readingTimeDisplay: this.readingTimeDisplay,
      wordCount: this.wordCount,
      sortOrder: this.sortOrder,
      url: this.url,
      isPublished: this.isPublished,
      isDraft: this.isDraft,
      isArchived: this.isArchived,
      hasFeaturedImage: this.hasFeaturedImage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdTimeAgo: this.createdTimeAgo,
      updatedTimeAgo: this.updatedTimeAgo,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy
    };
  };

  // Cập nhật thông tin người dùng cập nhật
  schema.methods.updateModifiedBy = function(userId) {
    this.updatedBy = userId;
    return this;
  };

  // Kiểm tra quyền chỉnh sửa
  schema.methods.canBeEditedBy = function(user) {
    if (!user) return false;
    
    // Admin có thể chỉnh sửa tất cả
    if (user.role === 'admin') return true;
    
    // Tác giả có thể chỉnh sửa bài viết của mình
    if (this.author && this.author.equals && this.author.equals(user._id)) return true;
    if (this.author && this.author.toString() === user._id.toString()) return true;
    
    // Faculty có thể chỉnh sửa bài viết draft
    if (user.role === 'faculty' && this.status === 'draft') return true;
    
    return false;
  };

  // Kiểm tra quyền xóa
  schema.methods.canBeDeletedBy = function(user) {
    if (!user) return false;
    
    // Admin có thể xóa tất cả
    if (user.role === 'admin') return true;
    
    // Tác giả có thể xóa bài viết draft của mình
    if (this.author && this.author.equals && this.author.equals(user._id) && this.status === 'draft') return true;
    if (this.author && this.author.toString() === user._id.toString() && this.status === 'draft') return true;
    
    return false;
  };

  // Sao chép bài viết (tạo bản sao)
  schema.methods.duplicate = async function(newTitle = null) {
    const Article = this.constructor;
    
    const duplicateTitle = newTitle || `${this.title} (Copy)`;
    const duplicateSlug = await Article.generateUniqueSlug(duplicateTitle);
    
    const duplicateData = {
      title: duplicateTitle,
      slug: duplicateSlug,
      content: this.content,
      excerpt: this.excerpt,
      featuredImage: this.featuredImage,
      categories: [...this.categories],
      author: this.author,
      status: 'draft', // Bản sao mặc định là draft
      metaTitle: this.metaTitle ? `${this.metaTitle} (Copy)` : null,
      metaDescription: this.metaDescription,
      keywords: [...this.keywords],
      tags: [...this.tags],
      featured: false, // Bản sao không phải featured
      allowComments: this.allowComments,
      readingTime: this.readingTime,
      sortOrder: this.sortOrder,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy
    };

    return await Article.create(duplicateData);
  };

  // Xuất dữ liệu để backup
  schema.methods.exportData = function() {
    return {
      title: this.title,
      slug: this.slug,
      content: this.content,
      excerpt: this.excerpt,
      featuredImage: this.featuredImage,
      categories: this.categories,
      author: this.author,
      status: this.status,
      publishedAt: this.publishedAt,
      metaTitle: this.metaTitle,
      metaDescription: this.metaDescription,
      keywords: this.keywords,
      tags: this.tags,
      viewCount: this.viewCount,
      likeCount: this.likeCount,
      commentCount: this.commentCount,
      featured: this.featured,
      allowComments: this.allowComments,
      readingTime: this.readingTime,
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  };

  // Validate dữ liệu trước khi lưu
  schema.methods.validateData = function() {
    const errors = [];

    if (!this.title || this.title.trim().length === 0) {
      errors.push('Tiêu đề bài viết là bắt buộc');
    }

    if (!this.content || this.content.trim().length === 0) {
      errors.push('Nội dung bài viết là bắt buộc');
    }

    if (!this.categories || this.categories.length === 0) {
      errors.push('Bài viết phải thuộc ít nhất một danh mục');
    }

    if (!this.author) {
      errors.push('Tác giả bài viết là bắt buộc');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };
};

export default addMethods;
