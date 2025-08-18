import express from 'express';
import { register, login, refreshToken, logout } from '../../controllers/user/auth.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// Public authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected authentication routes
router.post('/logout', authenticate, logout);

// Protected route to verify token (optional)
router.get('/verify', authenticate, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token hợp lệ',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status
      }
    }
  });
});

export default router;
