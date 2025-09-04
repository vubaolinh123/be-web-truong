import mongoose from 'mongoose';
import { mongooseTimestampTransform } from '../utils/timezone.js';

// Student Registration Schema
const studentRegistrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Họ và tên là bắt buộc'],
    trim: true,
    maxlength: [100, 'Họ và tên không được vượt quá 100 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email không hợp lệ']
  },
  facebook: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    required: [true, 'Số điện thoại là bắt buộc'],
    trim: true,
    // Chấp nhận số VN: 0xxxxxxxxx hoặc +84xxxxxxxxx (9-10 số sau đầu số)
    match: [/^(?:\+84|0)(?:\d){9,10}$/ , 'Số điện thoại Việt Nam không hợp lệ']
  },
  major: {
    type: String,
    required: [true, 'Ngành đăng ký là bắt buộc'],
    trim: true,
    maxlength: [150, 'Tên ngành không được vượt quá 150 ký tự']
  },
  // Thông tin meta để theo dõi
  ipAddress: { type: String, index: true },
  userAgent: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: mongooseTimestampTransform() },
  toObject: { virtuals: true, transform: mongooseTimestampTransform() }
});

// Indexes
studentRegistrationSchema.index({ createdAt: -1 });
studentRegistrationSchema.index({ email: 1 });
studentRegistrationSchema.index({ phone: 1 });
studentRegistrationSchema.index({ ipAddress: 1 });

const StudentRegistration = mongoose.model('StudentRegistration', studentRegistrationSchema);

export default StudentRegistration;

