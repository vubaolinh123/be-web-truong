import mongoose from 'mongoose';
import { mongooseTimestampTransform } from '../../utils/timezone.js';

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
  // Thứ tự hiển thị
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Thứ tự hiển thị không được nhỏ hơn 0']
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
    transform: mongooseTimestampTransform()
  },
  toObject: {
    virtuals: true,
    transform: mongooseTimestampTransform()
  }
});

export default categorySchema;
