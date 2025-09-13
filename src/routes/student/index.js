import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { registerStudent, listRegistrations, updateRegistrationStatus } from '../../controllers/student/registration.js';
import { ddosProtection } from '../../middleware/ddosProtection.js';
import logger from '../../config/logger.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// Rate limit: 3 requests / 60s per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  // Use helper to properly normalize IPv6/IPv4 addresses per docs:
  // https://express-rate-limit.github.io/ERR_ERL_KEY_GEN_IPV6/
  keyGenerator: (req) => ipKeyGenerator(req),
  skip: (req) => process.env.NODE_ENV !== 'production' && (req.headers['x-test-bypass-rl'] === 'true'),
  handler: (req, res) => {
    const retryAfterMs = req.rateLimit.resetTime ? (new Date(req.rateLimit.resetTime)).getTime() - Date.now() : 60*1000;
    const remainingSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    logger.warn('⏱️ Vượt giới hạn tốc độ đăng ký', { ip: req.ip, path: req.originalUrl, remainingSec });
    res.status(429).json({
      status: 'error',
      message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ ${remainingSec} giây trước khi gửi lại`,
      data: { remainingSec }
    });
  },
});

// POST: create registration (public)
router.post('/register', ddosProtection, limiter, registerStudent);

// GET: list registrations for admin, with filters & pagination (protected)
router.get('/registrations', authenticate, authorize('admin'), listRegistrations);

// PATCH: update registration status (protected)
router.patch('/registrations/:id/status', authenticate, authorize('admin'), updateRegistrationStatus);

export default router;

