import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStatistics,
  searchCategories,
  getPopularCategories,
  getOrderedCategories
} from '../../controllers/category/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// Public routes (không cần authentication)
// Lấy danh sách danh mục (chỉ active)
router.get('/public', async (req, res, next) => {
  req.query.status = 'active'; // Force chỉ lấy active categories
  return getCategories(req, res, next);
});

// Lấy thông tin chi tiết một danh mục (public)
router.get('/public/:id', getCategory);

// Lấy danh mục phổ biến (public)
router.get('/public/popular', getPopularCategories);

// Lấy danh mục theo thứ tự hiển thị (public)
router.get('/public/ordered', getOrderedCategories);

// Tìm kiếm danh mục (public, chỉ active)
router.get('/public/search', async (req, res, next) => {
  req.query.status = 'active'; // Force chỉ tìm active categories
  return searchCategories(req, res, next);
});

// Protected routes (cần authentication)
// Lấy danh sách tất cả danh mục (admin/faculty)
router.get('/', authenticate, authorize('admin', 'faculty'), getCategories);

// Lấy thông tin chi tiết một danh mục (admin/faculty)
router.get('/:id', authenticate, authorize('admin', 'faculty'), getCategory);

// Tạo danh mục mới (admin only)
router.post('/', authenticate, authorize('admin'), createCategory);

// Cập nhật danh mục (admin only)
router.put('/:id', authenticate, authorize('admin'), updateCategory);

// Xóa danh mục (admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteCategory);

// Lấy thống kê danh mục (admin/faculty)
router.get('/admin/statistics', authenticate, authorize('admin', 'faculty'), getCategoryStatistics);

// Tìm kiếm danh mục (admin/faculty)
router.get('/admin/search', authenticate, authorize('admin', 'faculty'), searchCategories);

// Lấy danh mục phổ biến (admin/faculty)
router.get('/admin/popular', authenticate, authorize('admin', 'faculty'), getPopularCategories);

// Lấy danh mục theo thứ tự hiển thị (admin/faculty)
router.get('/admin/ordered', authenticate, authorize('admin', 'faculty'), getOrderedCategories);

export default router;
