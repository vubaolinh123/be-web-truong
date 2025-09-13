import express from 'express';
import {
  getArticles,
  getArticle,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleStatistics,
  searchArticles,
  getRelatedArticles,
  getRelatedArticlesByCategory,
  getPopularArticles,
  getFeaturedArticles,
  publishArticle,
  unpublishArticle,
  getArticlesByCategorySlug
} from '../../controllers/article/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// Public routes (không cần authentication)
// Public: Lấy bài viết theo category slug
router.get('/by-category/:categorySlug', (req, res, next) => {
  // Mặc định chỉ trả published nếu không truyền status
  if (!req.query.status) req.query.status = 'published';
  next();
}, getArticlesByCategorySlug);

// Lấy danh sách bài viết đã xuất bản
router.get('/public', async (req, res, next) => {
  req.query.status = 'published'; // Force chỉ lấy published articles
  return getArticles(req, res, next);
});

// Lấy bài viết phổ biến (public) - phải đặt trước :id routes
router.get('/public/popular', async (req, res, next) => {
  return getPopularArticles(req, res, next);
});

// Lấy bài viết nổi bật (public) - phải đặt trước :id routes
router.get('/public/featured', async (req, res, next) => {
  return getFeaturedArticles(req, res, next);
});

// Tìm kiếm bài viết (public, chỉ published) - phải đặt trước :id routes
router.get('/public/search', async (req, res, next) => {
  req.query.status = 'published'; // Force chỉ tìm published articles
  return searchArticles(req, res, next);
});

// Lấy bài viết theo slug (public) - phải đặt trước :id routes
router.get('/public/slug/:slug', async (req, res, next) => {
  // Tự động tăng view count cho public access
  req.query.incrementView = 'true';
  return getArticleBySlug(req, res, next);
});

// Lấy thông tin chi tiết một bài viết đã xuất bản
router.get('/public/:id', async (req, res, next) => {
  // Tự động tăng view count cho public access
  req.query.incrementView = 'true';
  return getArticle(req, res, next);
});

// Lấy bài viết liên quan (public)
router.get('/public/:id/related', getRelatedArticles);

// Lấy bài viết liên quan theo danh mục (public)
router.get('/public/related/:categoryId', getRelatedArticlesByCategory);

// Protected routes (cần authentication)
// Lấy danh sách tất cả bài viết (admin/faculty/student)
router.get('/', authenticate, getArticles);

// Admin/Faculty only routes
// IMPORTANT: These must be defined BEFORE the generic '/:id' route
router.get('/admin', authenticate, authorize('admin', 'faculty'), getArticles);
router.get('/admin/statistics', authenticate, authorize('admin', 'faculty'), getArticleStatistics);
router.get('/admin/search', authenticate, authorize('admin', 'faculty'), searchArticles);
router.get('/admin/popular', authenticate, authorize('admin', 'faculty'), getPopularArticles);
router.get('/admin/featured', authenticate, authorize('admin', 'faculty'), getFeaturedArticles);

// Lấy thông tin chi tiết một bài viết (admin/faculty/student)
router.get('/:id', authenticate, getArticle);

// Tạo bài viết mới (admin/faculty/student)
router.post('/', authenticate, authorize('admin', 'faculty', 'student'), createArticle);

// Cập nhật bài viết (admin/faculty hoặc author)
router.put('/:id', authenticate, updateArticle);

// Xóa bài viết (admin hoặc author với điều kiện)
router.delete('/:id', authenticate, deleteArticle);

// Xuất bản bài viết (admin/faculty hoặc author)
router.patch('/:id/publish', authenticate, publishArticle);

// Hủy xuất bản bài viết (admin/faculty hoặc author)
router.patch('/:id/unpublish', authenticate, unpublishArticle);

// Lấy bài viết liên quan (protected)
router.get('/:id/related', authenticate, getRelatedArticles);



export default router;
