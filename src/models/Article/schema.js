import mongoose from 'mongoose';
import { mongooseTimestampTransform } from '../../utils/timezone.js';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề bài viết là bắt buộc'],
    trim: true,
    minlength: [5, 'Tiêu đề phải có ít nhất 5 ký tự'],
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
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
    maxlength: [250, 'Slug không được vượt quá 250 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Nội dung bài viết là bắt buộc'],
    minlength: [50, 'Nội dung phải có ít nhất 50 ký tự']
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Tóm tắt không được vượt quá 500 ký tự']
  },
  featuredImage: {
    type: String,
    trim: true,
    default: ''
  },
  // Many-to-many relationship với Categories
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Bài viết phải thuộc ít nhất một danh mục']
  }],
  // Reference đến User (author)
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tác giả bài viết là bắt buộc']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: 'Trạng thái phải là draft, published hoặc archived'
    },
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  // SEO và metadata
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
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Từ khóa không được vượt quá 50 ký tự']
  }],
  // Thống kê
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'Số lượt xem không được nhỏ hơn 0']
  },
  likeCount: {
    type: Number,
    default: 0,
    min: [0, 'Số lượt thích không được nhỏ hơn 0']
  },
  commentCount: {
    type: Number,
    default: 0,
    min: [0, 'Số bình luận không được nhỏ hơn 0']
  },
  // Cài đặt bài viết
  featured: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  // Thời gian đọc ước tính (phút)
  readingTime: {
    type: Number,
    min: [1, 'Thời gian đọc phải ít nhất 1 phút']
  },
  // Tags
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag không được vượt quá 30 ký tự']
  }],
  // Thứ tự hiển thị (cho bài viết nổi bật)
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, 'Thứ tự hiển thị không được nhỏ hơn 0']
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
    transform: mongooseTimestampTransform(['publishedAt', 'lastModified'])
  },
  toObject: {
    virtuals: true,
    transform: mongooseTimestampTransform(['publishedAt', 'lastModified'])
  }
});

export default articleSchema;
