/**
 * Script seed 3 tài khoản admin với quyền giới hạn category
 * 
 * Admin 1: admin-tintuc   -> chỉ được truy cập category "Tin Tức" (slug: tin-tuc)
 * Admin 2: admin-daotao   -> chỉ được truy cập category "Đào Tạo" (slug: dao-tao)
 * Admin 3: admin-congnghe -> chỉ được truy cập category "Công Nghệ Số" (slug: cong-nghe-so)
 * 
 * Chạy: node scripts/seed-restricted-admins.js
 * Hoặc: npm run seed:admins
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ============================================================
// User Schema (minimal, chỉ dùng cho seed script)
// ============================================================
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'student', 'faculty'],
    default: 'student'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  avatar: {
    type: String,
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  // Danh sách category được phép truy cập (dựa trên slug)
  // Mảng rỗng = super admin, truy cập tất cả
  allowedCategories: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

const User = mongoose.model('User', userSchema);

// ============================================================
// Category Schema (minimal, để kiểm tra categories tồn tại)
// ============================================================
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  articleCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

categorySchema.index({ slug: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

// ============================================================
// Seed Data
// ============================================================
const ADMIN_ACCOUNTS = [
  {
    username: 'admin-tintuc',
    email: 'admin.tintuc@university.edu.vn',
    password: 'Admin@123456',
    firstName: 'Admin',
    lastName: 'Tin Tức',
    phone: '0901000001',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    allowedCategories: ['tin-tuc']
  },
  {
    username: 'admin-daotao',
    email: 'admin.daotao@university.edu.vn',
    password: 'Admin@789123',
    firstName: 'Admin',
    lastName: 'Đào Tạo',
    phone: '0901000002',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    allowedCategories: ['dao-tao']
  },
  {
    username: 'admin-congnghe',
    email: 'admin.congnghe@university.edu.vn',
    password: 'Admin@123789',
    firstName: 'Admin',
    lastName: 'Công Nghệ Số',
    phone: '0901000003',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    allowedCategories: ['cong-nghe-so']
  }
];

// Categories cần đảm bảo tồn tại
const REQUIRED_CATEGORIES = [
  {
    name: 'Tin Tức',
    slug: 'tin-tuc',
    description: 'Danh mục tin tức chung của trường đại học',
    status: 'active',
    sortOrder: 1
  },
  {
    name: 'Đào Tạo',
    slug: 'dao-tao',
    description: 'Danh mục thông tin đào tạo, tuyển sinh',
    status: 'active',
    sortOrder: 2
  },
  {
    name: 'Công Nghệ Số',
    slug: 'cong-nghe-so',
    description: 'Danh mục công nghệ số, chuyển đổi số',
    status: 'active',
    sortOrder: 3
  }
];

// ============================================================
// Main seed function
// ============================================================
async function seed() {
  console.log('============================================');
  console.log('  Seed Restricted Admin Accounts');
  console.log('============================================');
  console.log();

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university';
  const dbName = process.env.DB_NAME || 'university';

  try {
    // Connect to MongoDB
    console.log(`[1/4] Đang kết nối tới MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI, { dbName });
    console.log('      Ket noi MongoDB thanh cong!');
    console.log();

    // Step 2: Ensure required categories exist
    console.log('[2/4] Kiem tra va tao categories can thiet...');
    for (const catData of REQUIRED_CATEGORIES) {
      const existing = await Category.findOne({ slug: catData.slug });
      if (existing) {
        console.log(`      - Category "${catData.name}" (${catData.slug}) da ton tai, bo qua`);
      } else {
        await Category.create(catData);
        console.log(`      + Da tao category "${catData.name}" (${catData.slug})`);
      }
    }
    console.log();

    // Step 3: Verify all required categories exist
    console.log('[3/4] Xac minh categories...');
    const allSlugs = REQUIRED_CATEGORIES.map(c => c.slug);
    const foundCategories = await Category.find({ slug: { $in: allSlugs } });
    if (foundCategories.length !== allSlugs.length) {
      const foundSlugs = foundCategories.map(c => c.slug);
      const missing = allSlugs.filter(s => !foundSlugs.includes(s));
      console.error(`      LOI: Thieu categories: ${missing.join(', ')}`);
      process.exit(1);
    }
    console.log('      Tat ca categories can thiet da ton tai!');
    console.log();

    // Step 4: Create admin accounts
    console.log('[4/4] Tao tai khoan admin...');
    for (const adminData of ADMIN_ACCOUNTS) {
      const existingUser = await User.findOne({
        $or: [
          { username: adminData.username },
          { email: adminData.email }
        ]
      });

      if (existingUser) {
        // Update existing user if needed
        let updated = false;
        if (existingUser.allowedCategories === undefined || 
            JSON.stringify(existingUser.allowedCategories || []) !== JSON.stringify(adminData.allowedCategories)) {
          existingUser.allowedCategories = adminData.allowedCategories;
          updated = true;
        }
        if (existingUser.role !== adminData.role) {
          existingUser.role = adminData.role;
          updated = true;
        }
        if (existingUser.status !== adminData.status) {
          existingUser.status = adminData.status;
          updated = true;
        }
        if (existingUser.emailVerified !== adminData.emailVerified) {
          existingUser.emailVerified = adminData.emailVerified;
          updated = true;
        }

        if (updated) {
          await existingUser.save();
          console.log(`      ~ Da cap nhat: ${adminData.username} -> allowedCategories: [${adminData.allowedCategories.join(', ')}]`);
        } else {
          console.log(`      - Tai khoan ${adminData.username} da ton tai, bo qua`);
        }
      } else {
        // Create new admin
        const newUser = new User(adminData);
        await newUser.save();
        console.log(`      + Da tao: ${adminData.username} -> allowedCategories: [${adminData.allowedCategories.join(', ')}]`);
      }
    }
    console.log();

    // Summary
    console.log('============================================');
    console.log('  Ket qua seed');
    console.log('============================================');
    console.log();
    
    const createdAdmins = await User.find({ role: 'admin' }).select('username email role allowedCategories status');
    
    for (const admin of createdAdmins) {
      const catDesc = (admin.allowedCategories && admin.allowedCategories.length > 0)
        ? admin.allowedCategories.join(', ')
        : 'TAT CA (super admin)';
      console.log(`  Username: ${admin.username}`);
      console.log(`  Email:    ${admin.email}`);
      console.log(`  Role:     ${admin.role}`);
      console.log(`  Status:   ${admin.status}`);
      console.log(`  Categories duoc phep: ${catDesc}`);
      console.log('  ----------------------------------------');
    }
    console.log();
    console.log('Seed hoan tat!');
    console.log();

  } catch (error) {
    console.error('LOI khi seed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Da dong ket noi MongoDB.');
  }
}

// Run
seed();