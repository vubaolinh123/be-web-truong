import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Tên đăng nhập là bắt buộc'],
    trim: true,
    minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự'],
    maxlength: [30, 'Tên đăng nhập không được vượt quá 30 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Email không hợp lệ'
    ]
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'Họ là bắt buộc'],
    trim: true,
    maxlength: [50, 'Họ không được vượt quá 50 ký tự']
  },
  lastName: {
    type: String,
    required: [true, 'Tên là bắt buộc'],
    trim: true,
    maxlength: [50, 'Tên không được vượt quá 50 ký tự']
  },
  phone: {
    type: String,
    trim: true,
    match: [
      /^[0-9]{10,11}$/,
      'Số điện thoại không hợp lệ'
    ]
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value < new Date();
      },
      message: 'Ngày sinh không thể là ngày trong tương lai'
    }
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Địa chỉ đường không được vượt quá 200 ký tự']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'Tên thành phố không được vượt quá 100 ký tự']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'Tên tỉnh/thành không được vượt quá 100 ký tự']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Mã bưu điện không được vượt quá 20 ký tự']
    },
    country: {
      type: String,
      trim: true,
      default: 'Việt Nam',
      maxlength: [100, 'Tên quốc gia không được vượt quá 100 ký tự']
    }
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'student', 'faculty'],
      message: 'Vai trò phải là admin, student hoặc faculty'
    },
    default: 'student'
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'pending'],
      message: 'Trạng thái phải là active, inactive, suspended hoặc pending'
    },
    default: 'pending'
  },
  avatar: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  }
});

export default userSchema;
