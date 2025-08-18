import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên danh mục là bắt buộc'],
    trim: true,
    minlength: [2, 'Tên danh mục phải có ít nhất 2 ký tự'],
    maxlength: [100, 'Tên danh mục không được vượt quá 100 ký tự']
  },
  slug: {
    type: String,
    required: [true, 'Slug là bắt buộc'],
    trim: true,
    lowercase: true,
    match: [
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang'
    ],
    maxlength: [150, 'Slug không được vượt quá 150 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: 'Trạng thái phải là active hoặc inactive'
    },
    default: 'active'
  },
  // Metadata cho SEO và hiển thị
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title không được vượt quá 60 ký tự']
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description không được vượt quá 160 ký tự']
  },
  // Thứ tự hiển thị
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Thứ tự hiển thị không được nhỏ hơn 0']
  },
  // Màu sắc cho hiển thị (hex color)
  color: {
    type: String,
    trim: true,
    match: [
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      'Màu sắc phải là mã hex hợp lệ (ví dụ: #FF0000)'
    ],
    default: '#3B82F6' // Blue color
  },
  // Icon cho danh mục
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon không được vượt quá 50 ký tự']
  },
  // Thống kê
  articleCount: {
    type: Number,
    default: 0,
    min: [0, 'Số lượng bài viết không được nhỏ hơn 0']
  },
  // Người tạo và cập nhật
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Loại bỏ các field không cần thiết khi trả về JSON
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

export default categorySchema;
