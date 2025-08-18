import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Instance methods for User model

const addMethods = (schema) => {
  // Compare password for this user instance
  schema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
      throw new Error('Mật khẩu không tồn tại cho người dùng này');
    }
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Generate JWT token for this user
  schema.methods.generateAuthToken = function() {
    const payload = {
      id: this._id,
      username: this.username,
      email: this.email,
      role: this.role,
      status: this.status
    };

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

  // Generate refresh token for this user
  schema.methods.generateRefreshToken = function() {
    const payload = {
      id: this._id,
      type: 'refresh'
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        issuer: 'university-backend',
        audience: 'university-users'
      }
    );
  };

  // Update last login time
  schema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return await this.save({ validateBeforeSave: false });
  };

  // Change password for this user
  schema.methods.changePassword = async function(newPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(newPassword, saltRounds);
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    return await this.save();
  };

  // Generate password reset token
  schema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
  };

  // Generate email verification token
  schema.methods.generateEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    
    return verificationToken;
  };

  // Verify email
  schema.methods.verifyEmail = async function() {
    this.emailVerified = true;
    this.emailVerificationToken = undefined;
    this.status = 'active'; // Activate user when email is verified
    return await this.save({ validateBeforeSave: false });
  };

  // Activate user account
  schema.methods.activate = async function() {
    this.status = 'active';
    return await this.save({ validateBeforeSave: false });
  };

  // Deactivate user account
  schema.methods.deactivate = async function() {
    this.status = 'inactive';
    return await this.save({ validateBeforeSave: false });
  };

  // Suspend user account
  schema.methods.suspend = async function() {
    this.status = 'suspended';
    return await this.save({ validateBeforeSave: false });
  };

  // Check if user has permission for a specific action
  schema.methods.hasPermission = function(action) {
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_system'],
      faculty: ['read', 'write', 'manage_students'],
      student: ['read', 'write_own']
    };

    const userPermissions = permissions[this.role] || [];
    return userPermissions.includes(action);
  };

  // Check if user can access a resource
  schema.methods.canAccess = function(resource, action = 'read') {
    // Admin can access everything
    if (this.role === 'admin') {
      return true;
    }

    // User must be active to access resources
    if (this.status !== 'active') {
      return false;
    }

    // Check specific permissions based on role and resource
    switch (resource) {
      case 'users':
        return this.role === 'admin' || (this.role === 'faculty' && action === 'read');
      case 'profile':
        return true; // All active users can access their own profile
      case 'admin_panel':
        return this.role === 'admin';
      default:
        return this.hasPermission(action);
    }
  };

  // Get user's public profile (safe for external use)
  schema.methods.getPublicProfile = function() {
    return {
      id: this._id,
      username: this.username,
      fullName: this.fullName,
      displayName: this.displayName,
      role: this.role,
      roleDisplay: this.roleDisplay,
      status: this.status,
      statusDisplay: this.statusDisplay,
      avatar: this.avatar,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin
    };
  };

  // Get user's detailed profile (for authenticated user)
  schema.methods.getDetailedProfile = function() {
    return {
      id: this._id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      displayName: this.displayName,
      phone: this.phone,
      dateOfBirth: this.dateOfBirth,
      age: this.age,
      address: this.address,
      fullAddress: this.fullAddress,
      role: this.role,
      roleDisplay: this.roleDisplay,
      status: this.status,
      statusDisplay: this.statusDisplay,
      avatar: this.avatar,
      emailVerified: this.emailVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      accountAge: this.accountAge,
      daysSinceLastLogin: this.daysSinceLastLogin
    };
  };

  // Update user profile
  schema.methods.updateProfile = async function(updateData) {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 
      'address', 'avatar'
    ];
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        this[key] = updateData[key];
      }
    });
    
    return await this.save();
  };
};

export default addMethods;
