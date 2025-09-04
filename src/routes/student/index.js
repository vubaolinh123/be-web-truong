import express from 'express';
import rateLimit from 'express-rate-limit';
import { registerStudent } from '../../controllers/student/registration.js';
import { ddosProtection } from '../../middleware/ddosProtection.js';
import logger from '../../config/logger.js';

const router = express.Router();

// Rate limit: 3 requests / 60s per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection?.remoteAddress || 'unknown',
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

// Apply DDoS protection and rate limiter, then controller
router.post('/register', ddosProtection, limiter, registerStudent);

export default router;

