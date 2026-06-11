import express from 'express';
import { createOrder, verifyPayment, verifyUpiPayment, handleWebhook } from '../controllers/payment.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/order', verifyToken, createOrder);
router.post('/verify', verifyToken, verifyPayment);
router.post('/verify-upi', verifyToken, verifyUpiPayment);
router.post('/webhook', handleWebhook);

export default router;
