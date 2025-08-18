// Virtual properties for User model

const addVirtuals = (schema) => {
  // Full name virtual
  schema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`.trim();
  });

  // Display name virtual (prioritizes full name, falls back to username)
  schema.virtual('displayName').get(function() {
    if (this.firstName && this.lastName) {
      return this.fullName;
    }
    return this.username;
  });

  // Age virtual (calculated from date of birth)
  schema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  });

  // Full address virtual
  schema.virtual('fullAddress').get(function() {
    if (!this.address) return null;
    
    const addressParts = [
      this.address.street,
      this.address.city,
      this.address.state,
      this.address.zipCode,
      this.address.country
    ].filter(part => part && part.trim());
    
    return addressParts.length > 0 ? addressParts.join(', ') : null;
  });

  // Role display virtual (Vietnamese translation)
  schema.virtual('roleDisplay').get(function() {
    const roleTranslations = {
      admin: 'Quản trị viên',
      student: 'Sinh viên',
      faculty: 'Giảng viên'
    };
    
    return roleTranslations[this.role] || this.role;
  });

  // Status display virtual (Vietnamese translation)
  schema.virtual('statusDisplay').get(function() {
    const statusTranslations = {
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      suspended: 'Bị đình chỉ',
      pending: 'Chờ xác nhận'
    };
    
    return statusTranslations[this.status] || this.status;
  });

  // Is admin virtual
  schema.virtual('isAdmin').get(function() {
    return this.role === 'admin';
  });

  // Is student virtual
  schema.virtual('isStudent').get(function() {
    return this.role === 'student';
  });

  // Is faculty virtual
  schema.virtual('isFaculty').get(function() {
    return this.role === 'faculty';
  });

  // Is active virtual
  schema.virtual('isActive').get(function() {
    return this.status === 'active';
  });

  // Days since last login virtual
  schema.virtual('daysSinceLastLogin').get(function() {
    if (!this.lastLogin) return null;
    
    const today = new Date();
    const lastLoginDate = new Date(this.lastLogin);
    const diffTime = Math.abs(today - lastLoginDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  });

  // Account age virtual (days since creation)
  schema.virtual('accountAge').get(function() {
    if (!this.createdAt) return null;
    
    const today = new Date();
    const createdDate = new Date(this.createdAt);
    const diffTime = Math.abs(today - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  });
};

export default addVirtuals;
