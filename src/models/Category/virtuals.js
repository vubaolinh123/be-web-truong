// Virtual properties for Category model

const addVirtuals = (schema) => {
  // URL virtual - tạo URL đầy đủ cho danh mục
  schema.virtual('url').get(function() {
    return `/categories/${this.slug}`;
  });

  // Display name virtual - sử dụng name
  schema.virtual('displayName').get(function() {
    return this.name;
  });

  // Display description virtual - sử dụng description
  schema.virtual('displayDescription').get(function() {
    return this.description || '';
  });

  // Status display virtual - hiển thị trạng thái bằng tiếng Việt
  schema.virtual('statusDisplay').get(function() {
    const statusMap = {
      active: 'Hoạt động',
      inactive: 'Không hoạt động'
    };
    return statusMap[this.status] || this.status;
  });

  // Is active virtual - kiểm tra xem danh mục có đang hoạt động không
  schema.virtual('isActive').get(function() {
    return this.status === 'active';
  });

  // Has articles virtual - kiểm tra xem danh mục có bài viết không
  schema.virtual('hasArticles').get(function() {
    return this.articleCount > 0;
  });

  // Created time ago virtual - hiển thị thời gian tạo theo dạng "x ngày trước"
  schema.virtual('createdTimeAgo').get(function() {
    if (!this.createdAt) return null;
    
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffInMs = now - created;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return diffInMinutes <= 1 ? 'Vừa xong' : `${diffInMinutes} phút trước`;
      }
      return diffInHours === 1 ? '1 giờ trước' : `${diffInHours} giờ trước`;
    } else if (diffInDays === 1) {
      return '1 ngày trước';
    } else if (diffInDays < 30) {
      return `${diffInDays} ngày trước`;
    } else if (diffInDays < 365) {
      const diffInMonths = Math.floor(diffInDays / 30);
      return diffInMonths === 1 ? '1 tháng trước' : `${diffInMonths} tháng trước`;
    } else {
      const diffInYears = Math.floor(diffInDays / 365);
      return diffInYears === 1 ? '1 năm trước' : `${diffInYears} năm trước`;
    }
  });

  // Updated time ago virtual - hiển thị thời gian cập nhật theo dạng "x ngày trước"
  schema.virtual('updatedTimeAgo').get(function() {
    if (!this.updatedAt) return null;
    
    const now = new Date();
    const updated = new Date(this.updatedAt);
    const diffInMs = now - updated;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return diffInMinutes <= 1 ? 'Vừa xong' : `${diffInMinutes} phút trước`;
      }
      return diffInHours === 1 ? '1 giờ trước' : `${diffInHours} giờ trước`;
    } else if (diffInDays === 1) {
      return '1 ngày trước';
    } else if (diffInDays < 30) {
      return `${diffInDays} ngày trước`;
    } else if (diffInDays < 365) {
      const diffInMonths = Math.floor(diffInDays / 30);
      return diffInMonths === 1 ? '1 tháng trước' : `${diffInMonths} tháng trước`;
    } else {
      const diffInYears = Math.floor(diffInDays / 365);
      return diffInYears === 1 ? '1 năm trước' : `${diffInYears} năm trước`;
    }
  });

  // Article count display virtual - hiển thị số lượng bài viết với định dạng
  schema.virtual('articleCountDisplay').get(function() {
    if (this.articleCount === 0) {
      return 'Chưa có bài viết';
    } else if (this.articleCount === 1) {
      return '1 bài viết';
    } else {
      return `${this.articleCount} bài viết`;
    }
  });

  // Color with opacity virtual - tạo màu với độ trong suốt cho background
  schema.virtual('colorWithOpacity').get(function() {
    if (!this.color) return null;
    
    // Chuyển đổi hex sang rgba với opacity 0.1
    const hex = this.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  });
};

export default addVirtuals;
