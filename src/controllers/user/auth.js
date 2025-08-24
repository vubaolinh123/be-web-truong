import User from '../../models/User/index.js';
import logger from '../../config/logger.js';

// User registration
export const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;



    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      logger.warn('Đăng ký thất bại - người dùng đã tồn tại', {
        username,
        email,
        ip: req.ip
      });

      return res.status(400).json({
        status: 'error',
        message: 'Tên đăng nhập hoặc email đã được sử dụng',
        data: null
      });
    }

    // Create new user
    const userData = {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'student'
    };

    const user = new User(userData);
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    res.status(201).json({
      status: 'success',
      message: 'Đăng ký tài khoản thành công',
      data: {
        user: user.getPublicProfile(),
        tokens: {
          accessToken: authToken,
          refreshToken: refreshToken
        }
      }
    });

  } catch (error) {
    logger.error('Lỗi đăng ký người dùng', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      ip: req.ip
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: errors.join(', '),
        data: null
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        username: 'Tên đăng nhập',
        email: 'Email'
      };

      return res.status(400).json({
        status: 'error',
        message: `${fieldNames[field] || field} đã được sử dụng`,
        data: null
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi đăng ký tài khoản',
      data: null
    });
  }
};

// User login
export const login = async (req, res) => {
  try {

    const { identifier, password } = req.body;



    // Validate input
    if (!identifier || !password) {
      logger.warn('Đăng nhập thất bại - thiếu thông tin', {
        identifier,
        ip: req.ip
      });

      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu',
        data: null
      });
    }

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier).select('+password');
    if (!user) {
      logger.warn('Đăng nhập thất bại - người dùng không tồn tại', {
        identifier,
        ip: req.ip
      });

      return res.status(401).json({
        status: 'error',
        message: 'Tên đăng nhập/email hoặc mật khẩu không chính xác',
        data: null
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn('Đăng nhập thất bại - mật khẩu sai', {
        userId: user._id,
        username: user.username,
        ip: req.ip
      });

      return res.status(401).json({
        status: 'error',
        message: 'Tên đăng nhập/email hoặc mật khẩu không chính xác',
        data: null
      });
    }

    // Check if user is active
    if (user.status !== 'active' && user.status !== 'pending') {
      logger.warn('Đăng nhập thất bại - tài khoản bị khóa', {
        userId: user._id,
        username: user.username,
        status: user.status,
        ip: req.ip
      });

      return res.status(403).json({
        status: 'error',
        message: 'Tài khoản của bạn đã bị khóa hoặc đình chỉ',
        data: null
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    res.status(200).json({
      status: 'success',
      message: 'Đăng nhập thành công',
      data: {
        user: user.getDetailedProfile(),
        tokens: {
          accessToken: authToken,
          refreshToken: refreshToken
        }
      }
    });

  } catch (error) {
    logger.error('Lỗi đăng nhập', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi đăng nhập',
      data: null
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token là bắt buộc',
        data: null
      });
    }

    // Verify refresh token
    const decoded = User.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Token không hợp lệ',
        data: null
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        status: 'error',
        message: 'Người dùng không tồn tại hoặc đã bị khóa',
        data: null
      });
    }

    // Generate new tokens
    const newAuthToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    res.status(200).json({
      status: 'success',
      message: 'Token đã được làm mới thành công',
      data: {
        tokens: {
          accessToken: newAuthToken,
          refreshToken: newRefreshToken
        }
      }
    });

  } catch (error) {
    logger.error('Lỗi làm mới token', {
      error: error.message,
      ip: req.ip
    });

    res.status(401).json({
      status: 'error',
      message: 'Token không hợp lệ hoặc đã hết hạn',
      data: null
    });
  }
};

// User logout
export const logout = async (req, res) => {
  try {
    // Get user from authentication middleware
    const userId = req.user ? req.user.id : null;

    if (userId) {
      // Log the logout action
      logger.info('Người dùng đăng xuất thành công', {
        userId,
        username: req.user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // In a more advanced implementation, you might:
    // 1. Add the token to a blacklist
    // 2. Clear refresh tokens from database
    // 3. Update user's last activity

    // For now, we just return success since JWT tokens are stateless
    // The client will remove the token from storage
    res.status(200).json({
      status: 'success',
      message: 'Đăng xuất thành công',
      data: null
    });

  } catch (error) {
    logger.error('Lỗi đăng xuất', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi đăng xuất',
      data: null
    });
  }
};
