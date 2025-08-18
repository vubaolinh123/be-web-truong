import User from '../../models/User/index.js';
import logger from '../../config/logger.js';

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;



    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Handle search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }

    // Get users with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    };

    const result = await User.findWithPagination(filter, options);

    res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách người dùng thành công',
      data: {
        users: result.users.map(user => user.getPublicProfile()),
        pagination: result.pagination
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy danh sách người dùng', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      query: req.query,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy danh sách người dùng',
      data: null
    });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;



    const user = await User.findById(id);
    if (!user) {
      logger.warn('Không tìm thấy người dùng', { 
        adminId: req.user.id,
        targetUserId: id,
        ip: req.ip 
      });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng',
        data: null
      });
    }



    res.status(200).json({
      status: 'success',
      message: 'Lấy thông tin người dùng thành công',
      data: {
        user: user.getDetailedProfile()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thông tin người dùng', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      targetUserId: req.params.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thông tin người dùng',
      data: null
    });
  }
};

// Update user (admin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;



    const user = await User.findById(id);
    if (!user) {
      logger.warn('Không tìm thấy người dùng để cập nhật', { 
        adminId: req.user.id,
        targetUserId: id,
        ip: req.ip 
      });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng',
        data: null
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user.id && updateData.role && updateData.role !== user.role) {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể thay đổi vai trò của chính mình',
        data: null
      });
    }

    // Prevent removing admin role if it's the last admin
    if (user.role === 'admin' && updateData.role && updateData.role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Không thể thay đổi vai trò của quản trị viên cuối cùng',
          data: null
        });
      }
    }

    // Update user
    Object.keys(updateData).forEach(key => {
      if (key !== 'password') { // Password should be updated separately
        user[key] = updateData[key];
      }
    });

    const updatedUser = await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật người dùng thành công',
      data: {
        user: updatedUser.getDetailedProfile()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi cập nhật người dùng', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      targetUserId: req.params.id,
      updateData: req.body,
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

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi cập nhật người dùng',
      data: null
    });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;



    const user = await User.findById(id);
    if (!user) {
      logger.warn('Không tìm thấy người dùng để xóa', { 
        adminId: req.user.id,
        targetUserId: id,
        ip: req.ip 
      });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng',
        data: null
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể xóa tài khoản của chính mình',
        data: null
      });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Không thể xóa quản trị viên cuối cùng',
          data: null
        });
      }
    }

    // Delete user
    await user.remove();

    res.status(200).json({
      status: 'success',
      message: 'Xóa người dùng thành công',
      data: null
    });

  } catch (error) {
    logger.error('Lỗi khi xóa người dùng', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      targetUserId: req.params.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xóa người dùng',
      data: null
    });
  }
};

// Get user statistics (admin only)
export const getUserStatistics = async (req, res) => {
  try {


    const statistics = await User.getStatistics();

    res.status(200).json({
      status: 'success',
      message: 'Lấy thống kê người dùng thành công',
      data: {
        statistics
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thống kê người dùng', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thống kê người dùng',
      data: null
    });
  }
};
