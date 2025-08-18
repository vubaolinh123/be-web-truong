import User from '../../models/User/index.js';
import logger from '../../config/logger.js';

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;



    const user = await User.findById(userId);
    if (!user) {
      logger.warn('Không tìm thấy người dùng', { userId, ip: req.ip });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy thông tin người dùng',
        data: null
      });
    }



    res.status(200).json({
      status: 'success',
      message: 'Lấy thông tin cá nhân thành công',
      data: {
        user: user.getDetailedProfile()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi lấy thông tin cá nhân', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi lấy thông tin cá nhân',
      data: null
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;



    // Remove sensitive fields that shouldn't be updated via this endpoint
    const restrictedFields = ['password', 'role', 'status', 'emailVerified', 'createdAt', 'updatedAt'];
    restrictedFields.forEach(field => delete updateData[field]);

    const user = await User.findById(userId);
    if (!user) {
      logger.warn('Không tìm thấy người dùng để cập nhật', { userId, ip: req.ip });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy thông tin người dùng',
        data: null
      });
    }

    // Update user profile using the instance method
    const updatedUser = await user.updateProfile(updateData);

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật thông tin cá nhân thành công',
      data: {
        user: updatedUser.getDetailedProfile()
      }
    });

  } catch (error) {
    logger.error('Lỗi khi cập nhật thông tin cá nhân', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
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
      message: 'Lỗi hệ thống khi cập nhật thông tin cá nhân',
      data: null
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;



    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập đầy đủ thông tin mật khẩu',
        data: null
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp',
        data: null
      });
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      logger.warn('Không tìm thấy người dùng để đổi mật khẩu', { userId, ip: req.ip });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy thông tin người dùng',
        data: null
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logger.warn('Đổi mật khẩu thất bại - mật khẩu hiện tại sai', { 
        userId,
        username: user.username,
        ip: req.ip 
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu hiện tại không chính xác',
        data: null
      });
    }

    // Validate new password strength
    const passwordValidation = User.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: passwordValidation.errors.join(', '),
        data: null
      });
    }

    // Change password
    await user.changePassword(newPassword);

    res.status(200).json({
      status: 'success',
      message: 'Đổi mật khẩu thành công',
      data: null
    });

  } catch (error) {
    logger.error('Lỗi khi đổi mật khẩu', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi đổi mật khẩu',
      data: null
    });
  }
};

// Delete user account (self-deletion)
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;



    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản',
        data: null
      });
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      logger.warn('Không tìm thấy người dùng để xóa', { userId, ip: req.ip });
      
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy thông tin người dùng',
        data: null
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn('Xóa tài khoản thất bại - mật khẩu sai', { 
        userId,
        username: user.username,
        ip: req.ip 
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu không chính xác',
        data: null
      });
    }

    // Prevent admin from deleting their own account if they're the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Không thể xóa tài khoản quản trị viên cuối cùng',
          data: null
        });
      }
    }

    // Delete user
    await user.remove();

    res.status(200).json({
      status: 'success',
      message: 'Xóa tài khoản thành công',
      data: null
    });

  } catch (error) {
    logger.error('Lỗi khi xóa tài khoản', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });

    res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi xóa tài khoản',
      data: null
    });
  }
};
