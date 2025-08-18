import bcrypt from 'bcryptjs';
import logger from '../../config/logger.js';

// Pre and post hooks for User model

const addHooks = (schema) => {
  // Pre-save hook to hash password
  schema.pre('save', async function(next) {
    try {
      // Only hash password if it's modified or new
      if (!this.isModified('password')) {
        return next();
      }

      // Validate password strength before hashing
      const User = this.constructor;
      const validation = User.validatePassword(this.password);
      
      if (!validation.isValid) {
        const error = new Error(validation.errors.join(', '));
        error.name = 'ValidationError';
        return next(error);
      }

      // Hash the password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      this.password = await bcrypt.hash(this.password, saltRounds);

      next();
    } catch (error) {
      logger.error('Lỗi khi mã hóa mật khẩu', { 
        error: error.message,
        userId: this._id,
        username: this.username 
      });
      next(error);
    }
  });

  // Pre-save hook to normalize email
  schema.pre('save', function(next) {
    if (this.isModified('email')) {
      this.email = this.email.toLowerCase().trim();
    }
    next();
  });

  // Pre-save hook to normalize username
  schema.pre('save', function(next) {
    if (this.isModified('username')) {
      this.username = this.username.trim();
    }
    next();
  });

  // Pre-save hook to validate role changes
  schema.pre('save', function(next) {
    next();
  });

  // Pre-save hook to validate status changes
  schema.pre('save', function(next) {
    next();
  });

  // Post-remove hook to log user deletion
  schema.post('remove', function(doc, next) {
    logger.warn('⚠️ Người dùng đã được xóa', {
      userId: doc._id,
      username: doc.username,
      email: doc.email,
      role: doc.role
    });
    next();
  });

  // Pre-remove hook to prevent admin deletion if it's the last admin
  schema.pre('remove', async function(next) {
    try {
      if (this.role === 'admin') {
        const adminCount = await this.constructor.countDocuments({ role: 'admin' });
        
        if (adminCount <= 1) {
          const error = new Error('Không thể xóa quản trị viên cuối cùng trong hệ thống');
          error.name = 'ValidationError';
          return next(error);
        }
      }
      next();
    } catch (error) {
      logger.error('Lỗi khi kiểm tra xóa quản trị viên', { 
        error: error.message,
        userId: this._id 
      });
      next(error);
    }
  });

  // Pre-findOneAndUpdate hook to hash password if being updated
  schema.pre('findOneAndUpdate', async function(next) {
    try {
      const update = this.getUpdate();
      
      if (update.password) {
        // Validate password strength
        const User = this.model;
        const validation = User.validatePassword(update.password);
        
        if (!validation.isValid) {
          const error = new Error(validation.errors.join(', '));
          error.name = 'ValidationError';
          return next(error);
        }

        // Hash the password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        update.password = await bcrypt.hash(update.password, saltRounds);
      }

      // Normalize email if being updated
      if (update.email) {
        update.email = update.email.toLowerCase().trim();
      }

      // Normalize username if being updated
      if (update.username) {
        update.username = update.username.trim();
      }

      next();
    } catch (error) {
      logger.error('Lỗi trong hook findOneAndUpdate', { error: error.message });
      next(error);
    }
  });

  // Post-findOneAndUpdate hook to log updates
  schema.post('findOneAndUpdate', function(doc, next) {
    next();
  });

  // Index creation hooks
  schema.post('init', function() {
    // Ensure indexes are created
    this.constructor.createIndexes().catch(error => {
      logger.error('Lỗi khi tạo index cho User model', { error: error.message });
    });
  });
};

export default addHooks;
