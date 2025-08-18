// Virtual properties for Article model

const addVirtuals = (schema) => {
  // URL virtual - tạo URL đầy đủ cho bài viết
  schema.virtual('url').get(function() {
    return `/articles/${this.slug}`;
  });

  // Display title virtual - ưu tiên metaTitle, fallback về title
  schema.virtual('displayTitle').get(function() {
    return this.metaTitle || this.title;
  });

  // Display description virtual - ưu tiên metaDescription, fallback về excerpt
  schema.virtual('displayDescription').get(function() {
    return this.metaDescription || this.excerpt;
  });

  // Status display virtual - hiển thị trạng thái bằng tiếng Việt
  schema.virtual('statusDisplay').get(function() {
    const statusMap = {
      draft: 'Bản nháp',
      published: 'Đã xuất bản',
      archived: 'Đã lưu trữ'
    };
    return statusMap[this.status] || this.status;
  });

  // Is published virtual - kiểm tra xem bài viết có được xuất bản không
  schema.virtual('isPublished').get(function() {
    return this.status === 'published';
  });

  // Is draft virtual - kiểm tra xem bài viết có phải bản nháp không
  schema.virtual('isDraft').get(function() {
    return this.status === 'draft';
  });

  // Is archived virtual - kiểm tra xem bài viết có bị lưu trữ không
  schema.virtual('isArchived').get(function() {
    return this.status === 'archived';
  });

  // Has featured image virtual
  schema.virtual('hasFeaturedImage').get(function() {
    return !!(this.featuredImage && this.featuredImage.url);
  });

  // Word count virtual - đếm số từ trong content
  schema.virtual('wordCount').get(function() {
    if (!this.content) return 0;
    
    // Loại bỏ HTML tags và đếm từ
    const textContent = this.content.replace(/<[^>]*>/g, '');
    const words = textContent.trim().split(/\s+/);
    return words.length > 0 && words[0] !== '' ? words.length : 0;
  });

  // Reading time virtual - tính thời gian đọc (nếu chưa có)
  schema.virtual('estimatedReadingTime').get(function() {
    if (this.readingTime) return this.readingTime;
    
    const wordsPerMinute = 200; // Tốc độ đọc trung bình
    const wordCount = this.wordCount;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  });

  // Published time ago virtual - hiển thị thời gian xuất bản theo dạng "x ngày trước"
  schema.virtual('publishedTimeAgo').get(function() {
    if (!this.publishedAt) return null;
    
    const now = new Date();
    const published = new Date(this.publishedAt);
    const diffInMs = now - published;
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

  // Created time ago virtual
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

  // Updated time ago virtual
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

  // View count display virtual
  schema.virtual('viewCountDisplay').get(function() {
    if (this.viewCount === 0) {
      return 'Chưa có lượt xem';
    } else if (this.viewCount === 1) {
      return '1 lượt xem';
    } else if (this.viewCount < 1000) {
      return `${this.viewCount} lượt xem`;
    } else if (this.viewCount < 1000000) {
      return `${(this.viewCount / 1000).toFixed(1)}K lượt xem`;
    } else {
      return `${(this.viewCount / 1000000).toFixed(1)}M lượt xem`;
    }
  });

  // Like count display virtual
  schema.virtual('likeCountDisplay').get(function() {
    if (this.likeCount === 0) {
      return 'Chưa có lượt thích';
    } else if (this.likeCount === 1) {
      return '1 lượt thích';
    } else if (this.likeCount < 1000) {
      return `${this.likeCount} lượt thích`;
    } else if (this.likeCount < 1000000) {
      return `${(this.likeCount / 1000).toFixed(1)}K lượt thích`;
    } else {
      return `${(this.likeCount / 1000000).toFixed(1)}M lượt thích`;
    }
  });

  // Comment count display virtual
  schema.virtual('commentCountDisplay').get(function() {
    if (this.commentCount === 0) {
      return 'Chưa có bình luận';
    } else if (this.commentCount === 1) {
      return '1 bình luận';
    } else {
      return `${this.commentCount} bình luận`;
    }
  });

  // Reading time display virtual
  schema.virtual('readingTimeDisplay').get(function() {
    const time = this.estimatedReadingTime;
    return time === 1 ? '1 phút đọc' : `${time} phút đọc`;
  });

  // Excerpt or auto-generated virtual
  schema.virtual('displayExcerpt').get(function() {
    if (this.excerpt) return this.excerpt;
    
    // Tự động tạo excerpt từ content (150 ký tự đầu)
    if (this.content) {
      const textContent = this.content.replace(/<[^>]*>/g, '');
      return textContent.length > 150 
        ? textContent.substring(0, 150) + '...'
        : textContent;
    }
    
    return '';
  });

  // Category names virtual (for display)
  schema.virtual('categoryNames').get(function() {
    if (!this.categories || !Array.isArray(this.categories)) return [];
    
    return this.categories.map(category => {
      return typeof category === 'object' && category.name 
        ? category.name 
        : category;
    });
  });

  // Author name virtual (for display)
  schema.virtual('authorName').get(function() {
    if (!this.author) return 'Không xác định';
    
    if (typeof this.author === 'object') {
      if (this.author.fullName) return this.author.fullName;
      if (this.author.firstName && this.author.lastName) {
        return `${this.author.firstName} ${this.author.lastName}`;
      }
      if (this.author.username) return this.author.username;
    }
    
    return 'Không xác định';
  });
};

export default addVirtuals;
