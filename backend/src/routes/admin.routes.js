import express from 'express';
import {
  getDashboardStats,
  getUsersList,
  getOrdersList,
  getDownloadsList,
  getCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
  approveOrder,
  rejectOrder
} from '../controllers/admin.controller.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth + admin validations to all admin routes
router.use(verifyToken, verifyAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsersList);
router.get('/orders', getOrdersList);
router.get('/downloads', getDownloadsList);

// Order approval/rejection
router.post('/orders/:id/approve', approveOrder);
router.post('/orders/:id/reject', rejectOrder);

// Coupon endpoints
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', toggleCoupon);
router.delete('/coupons/:id', deleteCoupon);

export default router;
