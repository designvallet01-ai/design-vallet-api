import db from '../config/db.js';
import { getDownloadUrl } from '../config/s3.js';
import PDFDocument from 'pdfkit';

export async function getMyPurchases(req, res) {
  try {
    const userId = req.user.id;
    
    // In Supabase we query completed orders, joining order items and images
    const { data: orders, error } = await db
      .from('orders')
      .select(`
        id, 
        created_at,
        order_items (
          price,
          images (
            id,
            title,
            description,
            category,
            preview_s3_key
          )
        )
      `)
      .eq('user_id', userId)
      .eq('payment_status', 'completed');

    if (error) throw new Error(error.message);

    const flattened = [];
    if (orders) {
      for (const ord of orders) {
        if (!ord.order_items) continue;
        const itemsList = Array.isArray(ord.order_items) ? ord.order_items : [ord.order_items];
        
        for (const item of itemsList) {
          const img = item.images;
          if (!img) continue;

          let previewUrl = img.preview_s3_key;
          if (img.preview_s3_key.startsWith('mock://') || img.preview_s3_key.startsWith('previews/')) {
            const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
            previewUrl = `${req.protocol}://${host}/api/images/mock-preview/${img.preview_s3_key.split('/').pop()}`;
          }

          flattened.push({
            id: img.id,
            title: img.title,
            description: img.description,
            category: img.category,
            price: item.price,
            preview_s3_key: img.preview_s3_key,
            preview_url: previewUrl,
            order_id: ord.id,
            purchase_date: ord.created_at
          });
        }
      }
    }

    return res.json(flattened);
  } catch (error) {
    console.error('Fetch purchases error:', error);
    return res.status(500).json({ error: 'Failed to retrieve purchased images list.' });
  }
}

export async function downloadImage(req, res) {
  try {
    const { image_id } = req.params;
    const userId = req.user.id;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!image_id) {
      return res.status(400).json({ error: 'Image ID is required for download extraction.' });
    }

    // Verify user purchased this image
    const { data: orders, error } = await db
      .from('orders')
      .select(`
        id,
        order_items (
          image_id,
          images (
            original_s3_key,
            title
          )
        )
      `)
      .eq('user_id', userId)
      .eq('payment_status', 'completed');

    if (error) throw new Error(error.message);

    let matchItem = null;
    let matchOrderId = null;

    if (orders) {
      for (const ord of orders) {
        const items = Array.isArray(ord.order_items) ? ord.order_items : [ord.order_items];
        const matched = items.find(oi => oi.image_id === parseInt(image_id));
        if (matched) {
          matchItem = matched;
          matchOrderId = ord.id;
          break;
        }
      }
    }

    if (!matchItem || !matchItem.images) {
      return res.status(403).json({ error: 'Access Denied. You have not purchased this image, or payment is still pending.' });
    }

    const { original_s3_key } = matchItem.images;

    // Generate expiring signed S3 Url
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const downloadUrl = await getDownloadUrl(original_s3_key, 300, host, req.protocol);

    // Save download audit track to Supabase
    await db
      .from('downloads')
      .insert({
        user_id: userId,
        image_id: parseInt(image_id),
        order_id: matchOrderId,
        ip_address: ip
      });

    return res.json({
      message: 'Download URL generated successfully.',
      download_url: downloadUrl
    });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Failed to generate download URL link.' });
  }
}

export async function downloadInvoice(req, res) {
  try {
    const { order_id } = req.params;
    const userId = req.user.id;

    const { data: order, error: orderError } = await db
      .from('orders')
      .select(`
        id,
        total_amount,
        discount_amount,
        created_at,
        razorpay_payment_id,
        users (
          full_name,
          email
        )
      `)
      .eq('id', order_id)
      .eq('user_id', userId)
      .eq('payment_status', 'completed')
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order invoice not found, or payment is incomplete.' });
    }

    const { data: items, error: itemsError } = await db
      .from('order_items')
      .select(`
        price,
        images (
          title
        )
      `)
      .eq('order_id', order.id);

    if (itemsError || !items) {
      throw new Error('Failed to retrieve purchase list details.');
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.id}.pdf`);

    doc.pipe(res);

    doc.fillColor('#1a1a2e').rect(0, 0, 612, 120).fill();

    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('DESIGN VALLET', 50, 45);
    doc.fontSize(10).font('Helvetica').text('Premium Image Marketplace', 50, 75);

    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('INVOICE', 400, 30, { align: 'right' });
    doc.fontSize(9).font('Helvetica')
       .text(`Invoice ID: INV-2026-${order.id}`, 400, 48, { align: 'right' })
       .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 400, 60, { align: 'right' })
       .text(`Payment ID: ${order.razorpay_payment_id || 'N/A'}`, 400, 72, { align: 'right' });

    doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text('Billed To:', 50, 150);
    doc.fontSize(10).font('Helvetica')
       .text(order.users?.full_name || 'Customer Account', 50, 170)
       .text(order.users?.email || '', 50, 185);

    doc.moveTo(50, 210).lineTo(560, 210).strokeColor('#e2e8f0').stroke();

    doc.fillColor('#1a1a2e').fontSize(11).font('Helvetica-Bold');
    doc.text('Item Description', 50, 230);
    doc.text('Price (INR)', 450, 230, { width: 110, align: 'right' });

    doc.moveTo(50, 250).lineTo(560, 250).strokeColor('#cbd5e1').stroke();

    let y = 265;
    doc.fillColor('#475569').fontSize(10).font('Helvetica');
    
    const itemsList = Array.isArray(items) ? items : [items];
    for (const item of itemsList) {
      doc.text(item.images?.title || 'Creative Visual Asset', 50, y);
      doc.text(parseFloat(item.price).toFixed(2), 450, y, { width: 110, align: 'right' });
      y += 20;
    }

    doc.moveTo(50, y).lineTo(560, y).strokeColor('#e2e8f0').stroke();
    y += 15;

    doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');
    if (parseFloat(order.discount_amount) > 0) {
      doc.text('Discount:', 350, y);
      doc.font('Helvetica').text(`- ${parseFloat(order.discount_amount).toFixed(2)} INR`, 450, y, { width: 110, align: 'right' });
      y += 15;
    }

    doc.font('Helvetica-Bold').text('Total Paid:', 350, y);
    doc.fillColor('#00adb5').fontSize(12).text(`${parseFloat(order.total_amount).toFixed(2)} INR`, 450, y, { width: 110, align: 'right' });

    y += 40;
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Oblique').text('Thank you for purchasing original creative works at Handloom craft.', 50, y, { align: 'center' });
    doc.text('This is a computer generated invoice and requires no signature.', 50, y + 12, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Invoice creation error:', error);
    return res.status(500).json({ error: 'Failed to generate invoice PDF.' });
  }
}
