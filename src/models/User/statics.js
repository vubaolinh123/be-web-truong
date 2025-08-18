import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Static methods for User model

const addStatics = (schema) => {
  // Find user by email or username
  schema.statics.findByEmailOrUsername = function(identifier) {
    return this.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });
  };

  // Find active users only
  schema.statics.findActive = function(filter = {}) {
    return this.find({ ...filter, status: 'active' });
  };

  // Find users by role
  schema.statics.findByRole = function(role, filter = {}) {
    return this.find({ ...filter, role });
  };

  // Get user statistics
  schema.statics.getStatistics = async function() {
    const totalUsers = await this.countDocuments();
    const activeUsers = await this.countDocuments({ status: 'active' });
    const pendingUsers = await this.countDocuments({ status: 'pending' });
    const suspendedUsers = await this.countDocuments({ status: 'suspended' });
    
    const usersByRole = await this.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await this.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('username email role status createdAt');

    return {
      total: totalUsers,
      active: activeUsers,
      pending: pendingUsers,
      suspended: suspendedUsers,
      byRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recent: recentUsers
    };
  };

  // Search users with text search
  schema.statics.searchUsers = function(searchTerm, options = {}) {
    const {
      role,
      status,
      limit = 20,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = -1
    } = options;

    const searchRegex = new RegExp(searchTerm, 'i');
    
    let query = {
      $or: [
        { username: searchRegex },
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ]
    };

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    return this.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip)
      .select('-password');
  };

  // Validate password strength
  schema.statics.validatePassword = function(password) {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 6;
    const errors = [];

    if (!password) {
      errors.push('Mật khẩu là bắt buộc');
      return { isValid: false, errors };
    }

    if (password.length < minLength) {
      errors.push(`Mật khẩu phải có ít nhất ${minLength} ký tự`);
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất một chữ cái thường');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất một chữ cái hoa');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Mật khẩu phải chứa ít nhất một số');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Hash password
  schema.statics.hashPassword = async function(password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  };

  // Compare password
  schema.statics.comparePassword = async function(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  };

  // Generate JWT token
  schema.statics.generateToken = function(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'university-backend',
        audience: 'university-users'
      }
    );
  };

  // Verify JWT token
  schema.statics.verifyToken = function(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'university-backend',
        audience: 'university-users'
      });
    } catch (error) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn');
    }
  };

  // Find users with pagination
  schema.statics.findWithPagination = async function(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1,
      select = '-password'
    } = options;

    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.find(filter)
        .select(select)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  };
};

export default addStatics;
