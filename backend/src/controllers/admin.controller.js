import db from '../config/db.js';

export async function getDashboardStats(req, res) {
  try {
    // 1. Fetch completed orders to calculate total revenue & counts
    const { data: completedOrders, error: orderError } = await db
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'completed');

    if (orderError) throw new Error(orderError.message);

    const totalRevenue = completedOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;
    const totalOrders = completedOrders?.length || 0;

    // 2. Count registered users
    const { data: customers, error: userError } = await db
      .from('users')
      .select('id')
      .eq('is_admin', false);

    if (userError) throw new Error(userError.message);
    const totalUsers = customers?.length || 0;

    // 3. Count total downloads
    const { data: downloads, error: dlError } = await db
      .from('downloads')
      .select('id');

    if (dlError) throw new Error(dlError.message);
    const totalDownloads = downloads?.length || 0;

    // 4. Fetch category counts from active images
    const { data: images, error: imgError } = await db
      .from('images')
      .select('category')
      .eq('is_active', true);

    if (imgError) throw new Error(imgError.message);

    const catMap = {};
    images?.forEach(img => {
      catMap[img.category] = (catMap[img.category] || 0) + 1;
    });
    const categories = Object.keys(catMap).map(cat => ({
      category: cat,
      count: catMap[cat]
    }));

    // 5. Fetch 5 most recent sales details
    const { data: sales, error: salesError } = await db
      .from('orders')
      .select(`
        id, 
        total_amount, 
        created_at,
        users (
          full_name,
          email
        )
      `)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (salesError) throw new Error(salesError.message);

    const recentSales = sales?.map(s => ({
      id: s.id,
      total_amount: s.total_amount,
      created_at: s.created_at,
      full_name: s.users?.full_name || 'Guest User',
      email: s.users?.email || ''
    })) || [];

    return res.json({
      revenue: totalRevenue,
      orders: totalOrders,
      users: totalUsers,
      downloads: totalDownloads,
      categories,
      recentSales
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to aggregate dashboard analytics.' });
  }
}

export async function getUsersList(req, res) {
  try {
    const { data: users, error } = await db
      .from('users')
      .select('id, email, full_name, phone_number, created_at')
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch completed orders count grouped by user
    const { data: orders, error: ordersError } = await db
      .from('orders')
      .select('user_id')
      .eq('payment_status', 'completed');

    if (ordersError) throw new Error(ordersError.message);

    const userPurchaseCountMap = {};
    orders?.forEach(o => {
      userPurchaseCountMap[o.user_id] = (userPurchaseCountMap[o.user_id] || 0) + 1;
    });

    const list = users.map(u => ({
      ...u,
      completed_purchases: userPurchaseCountMap[u.id] || 0
    }));

    return res.json(list);
  } catch (error) {
    console.error('Admin get users list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user directories.' });
  }
}

export async function getOrdersList(req, res) {
  try {
    const { data: orders, error } = await db
      .from('orders')
      .select(`
        id, 
        total_amount, 
        discount_amount, 
        payment_status, 
        razorpay_order_id, 
        razorpay_payment_id, 
        created_at,
        users (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = orders.map(o => ({
      id: o.id,
      total_amount: o.total_amount,
      discount_amount: o.discount_amount,
      payment_status: o.payment_status,
      razorpay_order_id: o.razorpay_order_id,
      razorpay_payment_id: o.razorpay_payment_id,
      created_at: o.created_at,
      full_name: o.users?.full_name || 'Guest User',
      email: o.users?.email || ''
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Admin get orders list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve transaction logs.' });
  }
}

export async function getDownloadsList(req, res) {
  try {
    const { data: dls, error } = await db
      .from('downloads')
      .select(`
        id, 
        downloaded_at, 
        ip_address,
        users (
          full_name,
          email
        ),
        images (
          title,
          category
        )
      `)
      .order('downloaded_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = dls.map(d => ({
      id: d.id,
      downloaded_at: d.downloaded_at,
      ip_address: d.ip_address,
      full_name: d.users?.full_name || 'Guest User',
      email: d.users?.email || '',
      title: d.images?.title || 'Visual Design File',
      category: d.images?.category || 'Creative'
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Admin get downloads list error:', error);
    return res.status(500).json({ error: 'Failed to retrieve download tracking analytics.' });
  }
}

export async function getCoupons(req, res) {
  try {
    const { data: coupons, error } = await db
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return res.json(coupons);
  } catch (error) {
    console.error('Admin get coupons error:', error);
    return res.status(500).json({ error: 'Failed to retrieve active coupons.' });
  }
}

export async function createCoupon(req, res) {
  try {
    const { code, discount_percent, expires_at } = req.body;

    if (!code || !discount_percent || !expires_at) {
      return res.status(400).json({ error: 'Coupon code, discount percentage, and expiry date are required.' });
    }

    const percent = parseInt(discount_percent);
    if (isNaN(percent) || percent < 1 || percent > 100) {
      return res.status(400).json({ error: 'Discount must be a valid percentage between 1 and 100.' });
    }

    const { data: existing } = await db
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase());

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Coupon code already exists.' });
    }

    const { error: insertError } = await db
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        discount_percent: percent,
        expires_at
      });

    if (insertError) throw new Error(insertError.message);

    return res.status(201).json({ message: 'Coupon code generated successfully.' });
  } catch (error) {
    console.error('Admin create coupon error:', error);
    return res.status(500).json({ error: 'Failed to generate coupon.' });
  }
}

export async function toggleCoupon(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { error } = await db
      .from('coupons')
      .update({ is_active })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return res.json({ message: 'Coupon state toggled successfully.' });
  } catch (error) {
    console.error('Admin toggle coupon error:', error);
    return res.status(500).json({ error: 'Failed to toggle coupon.' });
  }
}

export async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;

    const { error } = await db
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return res.json({ message: 'Coupon removed successfully.' });
  } catch (error) {
    console.error('Admin delete coupon error:', error);
    return res.status(500).json({ error: 'Failed to delete coupon.' });
  }
}

export async function approveOrder(req, res) {
  try {
    const { id } = req.params;

    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.payment_status === 'completed') {
      return res.status(400).json({ error: 'Order is already marked as completed.' });
    }

    // Update status to completed
    await db
      .from('orders')
      .update({ payment_status: 'completed' })
      .eq('id', order.id);

    // Record the transaction
    await db
      .from('transactions')
      .insert({
        order_id: order.id,
        user_id: order.user_id,
        amount: order.total_amount,
        status: 'admin_approved',
        razorpay_payment_id: order.razorpay_payment_id || `admin_approved_${Date.now()}`,
        razorpay_signature: 'admin_manual_override',
        raw_response: JSON.stringify({ approved_by: req.user?.email || 'Admin' })
      });

    return res.json({ message: 'Order approved successfully.' });
  } catch (error) {
    console.error('Admin approve order error:', error);
    return res.status(500).json({ error: 'Failed to approve order.' });
  }
}

export async function rejectOrder(req, res) {
  try {
    const { id } = req.params;

    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    await db
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', order.id);

    return res.json({ message: 'Order rejected and marked as failed.' });
  } catch (error) {
    console.error('Admin reject order error:', error);
    return res.status(500).json({ error: 'Failed to reject order.' });
  }
}
