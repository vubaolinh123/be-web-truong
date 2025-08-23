import User from '../models/User/index.js';
import logger from '../config/logger.js';

// JWT Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Yêu cầu không có token xác thực', { 
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      
      return res.status(401).json({
        status: 'error',
        message: 'Vui lòng đăng nhập để truy cập',
        data: null
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = User.verifyToken(token);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      logger.warn('Token hợp lệ nhưng người dùng không tồn tại', { 
        userId: decoded.id,
        ip: req.ip,
        url: req.url
      });
      
      return res.status(401).json({
        status: 'error',
        message: 'Người dùng không tồn tại',
        data: null
      });
    }

    // Check if user is active
    if (user.status !== 'active' && user.status !== 'pending') {
      logger.warn('Người dùng bị khóa cố gắng truy cập', { 
        userId: user._id,
        username: user.username,
        status: user.status,
        ip: req.ip,
        url: req.url
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Tài khoản của bạn đã bị khóa hoặc đình chỉ',
        data: null
      });
    }

    // Add user to request object
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();

  } catch (error) {
    logger.error('Lỗi xác thực token', {
      error: error.message,
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    return res.status(401).json({
      status: 'error',
      message: 'Token không hợp lệ hoặc đã hết hạn',
      data: null
    });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.error('Middleware authorize được gọi mà không có thông tin user', {
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      
      return res.status(401).json({
        status: 'error',
        message: 'Vui lòng đăng nhập để truy cập',
        data: null
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Người dùng không có quyền truy cập', { 
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền truy cập tính năng này',
        data: null
      });
    }

    next();
  };
};

// Admin only middleware
export const adminOnly = authorize('admin');

// Faculty and Admin middleware
export const facultyOrAdmin = authorize('faculty', 'admin');

// Student, Faculty and Admin middleware (all authenticated users)
export const authenticatedUsers = authorize('student', 'faculty', 'admin');

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  console.log('--- ENTERING optionalAuth ---');
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      console.log('optionalAuth: No token found. Calling next().');
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = User.verifyToken(token);
    
    const user = await User.findById(decoded.id);
    if (user && (user.status === 'active' || user.status === 'pending')) {
      req.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      };
      

    }

    next();

  } catch (error) {
    // Token is invalid, but continue without authentication
    
    console.log('optionalAuth: Error caught. Calling next().');
    next();
  }
};

// Check if user owns the resource or is admin
export const ownerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Vui lòng đăng nhập để truy cập',
        data: null
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.id !== resourceUserId) {
      logger.warn('Người dùng cố gắng truy cập tài nguyên không thuộc về họ', { 
        userId: req.user.id,
        username: req.user.username,
        resourceUserId,
        ip: req.ip,
        url: req.url
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Bạn chỉ có thể truy cập tài nguyên của chính mình',
        data: null
      });
    }

    next();
  };
};
