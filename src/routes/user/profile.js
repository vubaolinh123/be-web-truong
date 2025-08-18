import express from 'express';
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from '../../controllers/user/profile.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

// Profile management routes
router.get('/', getProfile);
router.put('/', updateProfile);
router.put('/change-password', changePassword);
router.delete('/', deleteAccount);

export default router;
