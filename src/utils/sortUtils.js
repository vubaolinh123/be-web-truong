/**
 * Sort Utilities
 * Utility functions để xử lý sorting parameters
 */

/**
 * Chuyển đổi sortOrder từ string sang MongoDB sort value
 * @param {string|number} sortOrder - Sort order từ query params
 * @returns {number} MongoDB sort value (1 hoặc -1)
 */
export const normalizeSortOrder = (sortOrder) => {
  // Handle string values
  if (typeof sortOrder === 'string') {
    const lowerCase = sortOrder.toLowerCase();
    if (lowerCase === 'asc' || lowerCase === '1') {
      return 1;
    } else if (lowerCase === 'desc' || lowerCase === '-1') {
      return -1;
    }
  }
  
  // Handle numeric values
  if (typeof sortOrder === 'number') {
    return sortOrder >= 0 ? 1 : -1;
  }
  
  // Handle numeric strings
  const numericValue = parseInt(sortOrder);
  if (!isNaN(numericValue)) {
    return numericValue >= 0 ? 1 : -1;
  }
  
  // Default to descending
  return -1;
};

/**
 * Validate sortBy field để prevent injection attacks
 * @param {string} sortBy - Sort field từ query params
 * @param {string[]} allowedFields - Danh sách fields được phép sort
 * @param {string} defaultField - Default field nếu invalid
 * @returns {string} Valid sort field
 */
export const validateSortField = (sortBy, allowedFields, defaultField = 'createdAt') => {
  if (typeof sortBy !== 'string') {
    return defaultField;
  }
  
  return allowedFields.includes(sortBy) ? sortBy : defaultField;
};

/**
 * Tạo sort object cho MongoDB
 * @param {string} sortBy - Sort field
 * @param {string|number} sortOrder - Sort order
 * @param {string[]} allowedFields - Allowed sort fields
 * @returns {object} MongoDB sort object
 */
export const createSortObject = (sortBy, sortOrder, allowedFields) => {
  const validSortBy = validateSortField(sortBy, allowedFields);
  const validSortOrder = normalizeSortOrder(sortOrder);
  
  return { [validSortBy]: validSortOrder };
};

/**
 * Default allowed sort fields cho articles
 */
export const ARTICLE_SORT_FIELDS = [
  'createdAt',
  'updatedAt', 
  'publishedAt',
  'title',
  'viewCount',
  'likeCount',
  'commentCount',
  'status',
  'featured',
  'readingTime',
  'seoScore'
];

/**
 * Default allowed sort fields cho categories
 */
export const CATEGORY_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'sortOrder',
  'articleCount'
];

/**
 * Parse pagination parameters
 * @param {object} query - Query parameters
 * @returns {object} Parsed pagination params
 */
export const parsePaginationParams = (query) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  return {
    page: Math.max(1, parseInt(page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit) || 10)), // Max 100 items per page
    sortBy: String(sortBy),
    sortOrder: String(sortOrder)
  };
};

/**
 * Create pagination response object
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination object
 */
export const createPaginationResponse = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};
