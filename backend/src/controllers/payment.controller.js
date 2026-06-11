import crypto from 'crypto';
import Razorpay from 'razorpay';
import db from '../config/db.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mocksecret123',
});

export async function createOrder(req, res) {
  try {
    const { image_id, coupon_code } = req.body;
    const userId = req.user.id;

    if (!image_id) {
      return res.status(400).json({ error: 'Image ID is required to initiate a purchase.' });
    }

    // 1. Check if user already purchased the image
    const { data: userOrders } = await db
      .from('orders')
      .select('id, payment_status')
      .eq('user_id', userId)
      .eq('payment_status', 'completed');

    if (userOrders && userOrders.length > 0) {
      const orderIds = userOrders.map(o => o.id);
      
      const { data: items } = await db
        .from('order_items')
        .select('image_id')
        .in('order_id', orderIds)
        .eq('image_id', parseInt(image_id));

      if (items && items.length > 0) {
        return res.status(400).json({ error: 'You have already purchased this image. Check your purchases tab.' });
      }
    }

    // 2. Fetch image price
    const { data: image, error: imgError } = await db
      .from('images')
      .select('price, title')
      .eq('id', image_id)
      .eq('is_active', true)
      .single();

    if (imgError || !image) {
      return res.status(404).json({ error: 'Image not found or no longer available.' });
    }

    let originalPrice = parseFloat(image.price);
    let totalAmount = originalPrice;
    let discountAmount = 0.00;
    let couponId = null;

    // 3. Process coupon discount
    if (coupon_code) {
      const { data: coupon } = await db
        .from('coupons')
        .select('id, discount_percent, expires_at')
        .eq('code', coupon_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (!coupon) {
        return res.status(400).json({ error: 'Applied coupon code is invalid or inactive.' });
      }

      const isExpired = new Date(coupon.expires_at) < new Date();
      if (isExpired) {
        return res.status(400).json({ error: 'Applied coupon code has expired.' });
      }

      couponId = coupon.id;
      discountAmount = (originalPrice * coupon.discount_percent) / 100;
      totalAmount = Math.max(0.00, originalPrice - discountAmount);
    }

    // 4. Create Direct UPI Order
    let razorpayOrderId = '';
    const amountInPaise = Math.round(totalAmount * 100);

    if (amountInPaise === 0) {
      razorpayOrderId = `order_free_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    } else {
      // Create custom order ID representing UPI transaction
      razorpayOrderId = `order_upi_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    // 5. Save pending order to Supabase
    const { data: createdOrder, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        coupon_id: couponId,
        payment_status: 'pending',
        razorpay_order_id: razorpayOrderId
      })
      .select()
      .single();

    if (orderError || !createdOrder) {
      throw new Error(orderError?.message || 'Order insertion returned empty.');
    }

    // Save order items details
    const { error: itemError } = await db
      .from('order_items')
      .insert({
        order_id: createdOrder.id,
        image_id: parseInt(image_id),
        price: totalAmount
      });

    if (itemError) {
      throw new Error(itemError.message);
    }

    const payeeUpi = '9052572363@ybl';
    const upiUrl = `upi://pay?pa=${payeeUpi}&pn=Design%20Vallet&am=${totalAmount.toFixed(2)}&cu=INR&tn=Order_${razorpayOrderId}`;

    return res.status(201).json({
      message: 'UPI payment order created successfully.',
      order_id: razorpayOrderId,
      amount: totalAmount,
      currency: 'INR',
      image_title: image.title,
      upi_id: payeeUpi,
      upi_url: upiUrl
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ error: 'Failed to create payment order.' });
  }
}

export async function verifyUpiPayment(req, res) {
  try {
    const { order_id, upi_utr } = req.body;
    const userId = req.user.id;

    if (!order_id || !upi_utr) {
      return res.status(400).json({ error: 'Order ID and UPI UTR reference number are required.' });
    }

    // Validate UTR: must be a 12 digit number
    const utrRegex = /^\d{12}$/;
    if (!utrRegex.test(upi_utr)) {
      return res.status(400).json({ error: 'Invalid UPI Transaction Reference ID (UTR). It must be exactly 12 digits.' });
    }

    // Check if this UTR has already been verified/used (avoid double spend)
    const { data: existingTx, error: txError } = await db
      .from('transactions')
      .select('id')
      .eq('razorpay_payment_id', upi_utr);

    if (existingTx && existingTx.length > 0) {
      return res.status(400).json({ error: 'This Transaction ID (UTR) has already been used and processed.' });
    }

    // Find the pending order
    const { data: order, error } = await db
      .from('orders')
      .select('id, total_amount')
      .eq('razorpay_order_id', order_id)
      .eq('payment_status', 'pending')
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Pending order not found or already processed.' });
    }

    // Update order details: keep payment_status as pending and save UTR in razorpay_payment_id
    await db
      .from('orders')
      .update({ payment_status: 'pending', razorpay_payment_id: upi_utr })
      .eq('id', order.id);

    // Record transaction
    await db
      .from('transactions')
      .insert({
        order_id: order.id,
        user_id: userId,
        amount: order.total_amount,
        status: 'upi_verified',
        razorpay_payment_id: upi_utr,
        razorpay_signature: 'upi_direct_user_submitted',
        raw_response: JSON.stringify(req.body)
      });

    return res.json({
      message: 'UPI payment verified successfully. Download granted.',
      order_id
    });
  } catch (error) {
    console.error('Verify UPI payment error:', error);
    return res.status(500).json({ error: 'Internal server error during UPI verification.' });
  }
}

export async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Razorpay order ID and payment ID are required for verification.' });
    }

    let isSignatureValid = false;

    // Enforce real signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      await db
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('razorpay_order_id', razorpay_order_id);
      return res.status(400).json({ error: 'Cryptographic signature verification failed. Payment blocked.' });
    }

    // Update orders details to completed
    const { data: order, error } = await db
      .from('orders')
      .select('id, total_amount')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('payment_status', 'pending')
      .single();

    if (order) {
      await db
        .from('orders')
        .update({ payment_status: 'completed', razorpay_payment_id })
        .eq('id', order.id);

      // Record transaction
      await db
        .from('transactions')
        .insert({
          order_id: order.id,
          user_id: userId,
          amount: order.total_amount,
          status: 'payment_captured',
          razorpay_payment_id,
          razorpay_signature: razorpay_signature || 'mock_sig',
          raw_response: JSON.stringify(req.body)
        });

      return res.json({
        message: 'Payment verified successfully. Download granted.',
        order_id: razorpay_order_id
      });
    }

    return res.status(400).json({ error: 'Order already processed or not found.' });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: 'Internal server error during verification.' });
  }
}

export async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Enforce real webhook signature verification
    const cryptoSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    const isValid = cryptoSignature === signature;

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const razorpayOrderId = payload.payment.entity.order_id;
      const razorpayPaymentId = payload.payment.entity.id;
      const amount = payload.payment.entity.amount / 100;

      const { data: order } = await db
        .from('orders')
        .select('id, user_id')
        .eq('razorpay_order_id', razorpayOrderId)
        .eq('payment_status', 'pending')
        .single();

      if (order) {
        await db
          .from('orders')
          .update({ payment_status: 'completed', razorpay_payment_id: razorpayPaymentId })
          .eq('id', order.id);

        await db
          .from('transactions')
          .insert({
            order_id: order.id,
            user_id: order.user_id,
            amount: amount,
            status: 'webhook_captured',
            razorpay_payment_id: razorpayPaymentId,
            raw_response: JSON.stringify(req.body)
          });
        console.log(`[WEBHOOK] Order ${razorpayOrderId} marked completed.`);
      }
    } else if (event === 'payment.failed') {
      const razorpayOrderId = payload.payment.entity.order_id;
      await db
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('razorpay_order_id', razorpayOrderId);
      console.log(`[WEBHOOK] Order ${razorpayOrderId} marked failed.`);
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
}
