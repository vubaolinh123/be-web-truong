// Instance methods for Category model
import { toVietnamTime } from '../../utils/timezone.js';

const addMethods = (schema) => {
  // Kích hoạt danh mục
  schema.methods.activate = async function() {
    this.status = 'active';
    return await this.save({ validateBeforeSave: false });
  };

  // Vô hiệu hóa danh mục
  schema.methods.deactivate = async function() {
    this.status = 'inactive';
    return await this.save({ validateBeforeSave: false });
  };

  // Chuyển đổi trạng thái
  schema.methods.toggleStatus = async function() {
    this.status = this.status === 'active' ? 'inactive' : 'active';
    return await this.save({ validateBeforeSave: false });
  };

  // Cập nhật slug từ tên
  schema.methods.updateSlugFromName = async function() {
    const Category = this.constructor;
    this.slug = await Category.generateUniqueSlug(this.name, this._id);
    return this;
  };

  // Lấy thông tin cơ bản của danh mục
  schema.methods.getBasicInfo = function() {
    return {
      id: this._id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      status: this.status,
      statusDisplay: this.statusDisplay,
      color: this.color,
      icon: this.icon,
      articleCount: this.articleCount,
      articleCountDisplay: this.articleCountDisplay,
      url: this.url,
      isActive: this.isActive,
      hasArticles: this.hasArticles,
      createdAt: toVietnamTime(this.createdAt),
      updatedAt: toVietnamTime(this.updatedAt),
      sortOrder: this.sortOrder,
      createdBy: this.createdBy
    };
  };

  // Lấy thông tin chi tiết của danh mục
  schema.methods.getDetailedInfo = function() {
    return {
      id: this._id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      status: this.status,
      statusDisplay: this.statusDisplay,
      metaTitle: this.metaTitle,
      metaDescription: this.metaDescription,
      displayName: this.displayName,
      displayDescription: this.displayDescription,
      sortOrder: this.sortOrder,
      color: this.color,
      colorWithOpacity: this.colorWithOpacity,
      icon: this.icon,
      articleCount: this.articleCount,
      articleCountDisplay: this.articleCountDisplay,
      url: this.url,
      isActive: this.isActive,
      hasArticles: this.hasArticles,
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

  // Tăng số lượng bài viết
  schema.methods.incrementArticleCount = async function(count = 1) {
    this.articleCount += count;
    return await this.save({ validateBeforeSave: false });
  };

  // Giảm số lượng bài viết
  schema.methods.decrementArticleCount = async function(count = 1) {
    this.articleCount = Math.max(0, this.articleCount - count);
    return await this.save({ validateBeforeSave: false });
  };

  // Đặt lại số lượng bài viết về 0
  schema.methods.resetArticleCount = async function() {
    this.articleCount = 0;
    return await this.save({ validateBeforeSave: false });
  };

  // Kiểm tra xem có thể xóa danh mục không
  schema.methods.canBeDeleted = function() {
    return this.articleCount === 0;
  };

  // Lấy thông tin để hiển thị trong dropdown/select
  schema.methods.getSelectOption = function() {
    return {
      value: this._id,
      label: this.name,
      slug: this.slug,
      color: this.color,
      icon: this.icon,
      articleCount: this.articleCount,
      isActive: this.isActive
    };
  };

  // Cập nhật thứ tự hiển thị
  schema.methods.updateSortOrder = async function(newOrder) {
    this.sortOrder = newOrder;
    return await this.save({ validateBeforeSave: false });
  };

  // Sao chép danh mục (tạo bản sao)
  schema.methods.duplicate = async function(newName = null) {
    const Category = this.constructor;
    
    const duplicateName = newName || `${this.name} (Copy)`;
    const duplicateSlug = await Category.generateUniqueSlug(duplicateName);
    
    const duplicateData = {
      name: duplicateName,
      slug: duplicateSlug,
      description: this.description,
      status: 'inactive', // Bản sao mặc định là inactive
      metaTitle: this.metaTitle ? `${this.metaTitle} (Copy)` : null,
      metaDescription: this.metaDescription,
      sortOrder: this.sortOrder + 1,
      color: this.color,
      icon: this.icon,
      articleCount: 0, // Bản sao không có bài viết
      createdBy: this.createdBy,
      updatedBy: this.updatedBy
    };

    return await Category.create(duplicateData);
  };

  // Xuất dữ liệu để backup
  schema.methods.exportData = function() {
    return {
      name: this.name,
      slug: this.slug,
      description: this.description,
      status: this.status,
      metaTitle: this.metaTitle,
      metaDescription: this.metaDescription,
      sortOrder: this.sortOrder,
      color: this.color,
      icon: this.icon,
      articleCount: this.articleCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  };

  // Cập nhật từ dữ liệu import
  schema.methods.updateFromImport = async function(importData, userId = null) {
    const allowedFields = [
      'name', 'description', 'status', 'metaTitle', 'metaDescription',
      'sortOrder', 'color', 'icon'
    ];

    allowedFields.forEach(field => {
      if (importData[field] !== undefined) {
        this[field] = importData[field];
      }
    });

    // Cập nhật slug nếu tên thay đổi
    if (importData.name && importData.name !== this.name) {
      await this.updateSlugFromName();
    }

    if (userId) {
      this.updatedBy = userId;
    }

    return await this.save();
  };

  // Validate dữ liệu trước khi lưu
  schema.methods.validateData = function() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Tên danh mục là bắt buộc');
    }

    if (!this.slug || this.slug.trim().length === 0) {
      errors.push('Slug là bắt buộc');
    }

    if (this.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(this.color)) {
      errors.push('Màu sắc phải là mã hex hợp lệ');
    }

    if (this.sortOrder < 0) {
      errors.push('Thứ tự hiển thị không được nhỏ hơn 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };
};

export default addMethods;
