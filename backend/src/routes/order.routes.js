import express from 'express';
import { getMyPurchases, downloadImage, downloadInvoice } from '../controllers/order.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-purchases', verifyToken, getMyPurchases);
router.get('/download/:image_id', verifyToken, downloadImage);
router.get('/invoice/:order_id', verifyToken, downloadInvoice);

export default router;
