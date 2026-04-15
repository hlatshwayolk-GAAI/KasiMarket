const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// PayFast configuration (sandbox for development)
const PAYFAST_CONFIG = {
  merchant_id: process.env.PAYFAST_MERCHANT_ID || '10000100',
  merchant_key: process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a',
  passphrase: process.env.PAYFAST_PASSPHRASE || 'jt7NOE43FZPn',
  sandbox: process.env.PAYFAST_SANDBOX !== 'false',
  get baseUrl() {
    return this.sandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za';
  },
};

// Generate PayFast signature
function generateSignature(data, passphrase) {
  const params = Object.entries(data)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, '+')}`)
    .join('&');
  const withPassphrase = passphrase ? `${params}&passphrase=${encodeURIComponent(passphrase.trim())}` : params;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}

// POST /api/payments/create — Initiate a payment for a booking
router.post('/create', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { booking_id, amount, payment_type = 'full' } = req.body;

    if (!booking_id) return res.status(400).json({ error: 'Booking ID required' });

    const booking = db.prepare(`
      SELECT b.*, 
        cust.full_name as customer_name, cust.email as customer_email, cust.phone as customer_phone,
        prov.full_name as provider_name,
        sl.title as listing_title, sr.title as request_title
      FROM bookings b
      LEFT JOIN users cust ON b.customer_id = cust.id
      LEFT JOIN users prov ON b.provider_id = prov.id
      LEFT JOIN service_listings sl ON b.listing_id = sl.id
      LEFT JOIN service_requests sr ON b.request_id = sr.id
      WHERE b.id = ? AND b.customer_id = ?
    `).get(booking_id, req.user.id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.payment_status === 'paid') return res.status(400).json({ error: 'Booking already paid' });

    const paymentAmount = amount ? parseFloat(amount) : booking.total_amount;
    if (paymentAmount <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

    // Create payment record
    const paymentId = uuidv4();
    db.prepare(`
      INSERT INTO payments (id, booking_id, payer_id, amount, payment_method, status)
      VALUES (?, ?, ?, ?, 'payfast', 'pending')
    `).run(paymentId, booking_id, req.user.id, paymentAmount);

    // Build PayFast payment data
    const returnUrl = `${req.headers.origin || 'http://localhost:5173'}/payment/success?payment_id=${paymentId}`;
    const cancelUrl = `${req.headers.origin || 'http://localhost:5173'}/payment/cancel?payment_id=${paymentId}`;
    const notifyUrl = `${process.env.APP_URL || 'http://localhost:3001'}/api/payments/notify`;

    const itemName = booking.listing_title || booking.request_title || 'Kasi Market Service';

    const paymentData = {
      merchant_id: PAYFAST_CONFIG.merchant_id,
      merchant_key: PAYFAST_CONFIG.merchant_key,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      name_first: booking.customer_name?.split(' ')[0] || '',
      name_last: booking.customer_name?.split(' ').slice(1).join(' ') || '',
      email_address: booking.customer_email || '',
      m_payment_id: paymentId,
      amount: paymentAmount.toFixed(2),
      item_name: itemName.substring(0, 100),
      item_description: `Booking #${booking_id.substring(0, 8)} - ${payment_type === 'deposit' ? 'Deposit' : 'Full Payment'}`,
      custom_str1: booking_id,
      custom_str2: payment_type,
    };

    // Generate signature
    paymentData.signature = generateSignature(paymentData, PAYFAST_CONFIG.passphrase);

    res.json({
      payment_id: paymentId,
      payfast_url: `${PAYFAST_CONFIG.baseUrl}/eng/process`,
      payfast_data: paymentData,
      sandbox: PAYFAST_CONFIG.sandbox,
    });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// POST /api/payments/notify — PayFast ITN (Instant Transaction Notification)
router.post('/notify', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    console.log('📩 PayFast ITN received:', JSON.stringify(data, null, 2));

    // 1. Verify the signature
    const receivedSignature = data.signature;
    const dataWithoutSig = { ...data };
    delete dataWithoutSig.signature;

    const expectedSignature = generateSignature(dataWithoutSig, PAYFAST_CONFIG.passphrase);
    if (receivedSignature !== expectedSignature) {
      console.error('❌ PayFast signature mismatch');
      return res.status(400).send('Signature mismatch');
    }

    // 2. Process based on payment status
    const paymentId = data.m_payment_id;
    const paymentStatus = data.payment_status;
    const payfast_ref = data.pf_payment_id;
    const bookingId = data.custom_str1;

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!payment) {
      console.error('❌ Payment not found:', paymentId);
      return res.status(404).send('Payment not found');
    }

    // 3. Verify amount
    const receivedAmount = parseFloat(data.amount_gross);
    if (Math.abs(receivedAmount - payment.amount) > 0.01) {
      console.error('❌ Amount mismatch:', receivedAmount, '!=', payment.amount);
      return res.status(400).send('Amount mismatch');
    }

    // 4. Update payment status
    let newStatus = 'pending';
    if (paymentStatus === 'COMPLETE') newStatus = 'paid';
    else if (paymentStatus === 'FAILED') newStatus = 'failed';
    else if (paymentStatus === 'CANCELLED') newStatus = 'cancelled';

    db.prepare("UPDATE payments SET status = ?, payfast_ref = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newStatus, payfast_ref, paymentId);

    // 5. Update booking payment status
    if (newStatus === 'paid') {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
      if (booking) {
        const newPaid = (booking.paid_amount || 0) + receivedAmount;
        const bookingPayStatus = newPaid >= booking.total_amount ? 'paid' : 'pending';

        db.prepare("UPDATE bookings SET paid_amount = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?")
          .run(newPaid, bookingPayStatus, bookingId);

        // Auto-confirm booking if pending and payment received
        if (booking.status === 'pending') {
          db.prepare("UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(bookingId);
        }

        // Notify both parties
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type) VALUES (?, ?, 'payment_received', 'Payment Received', ?, ?, 'booking')`)
          .run(uuidv4(), booking.customer_id, `Payment of R${receivedAmount.toFixed(2)} confirmed`, bookingId);

        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type) VALUES (?, ?, 'payment_received', 'Payment Received', ?, ?, 'booking')`)
          .run(uuidv4(), booking.provider_id, `Customer payment of R${receivedAmount.toFixed(2)} received for your booking`, bookingId);
      }
    } else if (newStatus === 'failed') {
      // Notify customer of failure
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type) VALUES (?, ?, 'payment_failed', 'Payment Failed', 'Your payment could not be processed. Please try again.', ?, 'booking')`)
        .run(uuidv4(), payment.payer_id, bookingId);
    }

    console.log(`✅ Payment ${paymentId} updated to: ${newStatus}`);
    res.status(200).send('OK');
  } catch (err) {
    console.error('PayFast ITN error:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/payments/verify/:id — Check payment status
router.get('/verify/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const payment = db.prepare(`
      SELECT p.*, b.status as booking_status, b.total_amount as booking_total
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.id = ? AND p.payer_id = ?
    `).get(req.params.id, req.user.id);

    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// GET /api/payments/history — User's payment history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { total } = db.prepare('SELECT COUNT(*) as total FROM payments WHERE payer_id = ?').get(req.user.id);

    const payments = db.prepare(`
      SELECT p.*,
        b.id as booking_id, b.status as booking_status,
        sl.title as listing_title, sr.title as request_title,
        prov.full_name as provider_name
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN service_listings sl ON b.listing_id = sl.id
      LEFT JOIN service_requests sr ON b.request_id = sr.id
      LEFT JOIN users prov ON b.provider_id = prov.id
      WHERE p.payer_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, parseInt(limit), offset);

    res.json({
      payments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// GET /api/payments/receipt/:id — Generate receipt data
router.get('/receipt/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const payment = db.prepare(`
      SELECT p.*,
        b.id as booking_id, b.total_amount, b.scheduled_date, b.completed_date, b.status as booking_status,
        cust.full_name as customer_name, cust.email as customer_email, cust.phone as customer_phone,
        prov.full_name as provider_name, prov.email as provider_email, prov.phone as provider_phone,
        pp.business_name,
        sl.title as listing_title, sl.description as listing_description,
        sr.title as request_title, sr.description as request_description
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN users cust ON b.customer_id = cust.id
      LEFT JOIN users prov ON b.provider_id = prov.id
      LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
      LEFT JOIN service_listings sl ON b.listing_id = sl.id
      LEFT JOIN service_requests sr ON b.request_id = sr.id
      WHERE p.id = ? AND (b.customer_id = ? OR b.provider_id = ?)
    `).get(req.params.id, req.user.id, req.user.id);

    if (!payment) return res.status(404).json({ error: 'Receipt not found' });

    const receipt = {
      receipt_number: `KM-${payment.id.substring(0, 8).toUpperCase()}`,
      date: payment.created_at,
      status: payment.status,
      payfast_ref: payment.payfast_ref,
      amount: payment.amount,
      service: payment.listing_title || payment.request_title || 'Service',
      service_description: payment.listing_description || payment.request_description || '',
      customer: { name: payment.customer_name, email: payment.customer_email, phone: payment.customer_phone },
      provider: { name: payment.provider_name, business: payment.business_name, email: payment.provider_email, phone: payment.provider_phone },
      booking: { id: payment.booking_id, status: payment.booking_status, scheduled: payment.scheduled_date, completed: payment.completed_date },
      platform_fee: (payment.amount * 0.05).toFixed(2), // 5% platform fee
      provider_payout: (payment.amount * 0.95).toFixed(2),
    };

    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

module.exports = router;
