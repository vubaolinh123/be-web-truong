import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getUserStatistics 
} from '../../controllers/user/admin.js';
import { authenticate, adminOnly } from '../../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// User management routes (admin only)
router.get('/', getAllUsers);
router.get('/statistics', getUserStatistics);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
