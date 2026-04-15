const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/bookings — Get user's bookings
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { status, role, page = 1, limit = 20 } = req.query;

    let where = ['(b.customer_id = ? OR b.provider_id = ?)'];
    let params = [req.user.id, req.user.id];

    if (status) {
      where.push('b.status = ?');
      params.push(status);
    }
    if (role === 'customer') {
      where = ['b.customer_id = ?'];
      params = [req.user.id];
      if (status) { where.push('b.status = ?'); params.push(status); }
    }
    if (role === 'provider') {
      where = ['b.provider_id = ?'];
      params = [req.user.id];
      if (status) { where.push('b.status = ?'); params.push(status); }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM bookings b WHERE ${where.join(' AND ')}`).get(...params);

    const bookings = db.prepare(`
      SELECT b.*,
        cust.full_name as customer_name, cust.avatar_url as customer_avatar, cust.email as customer_email, cust.phone as customer_phone,
        prov.full_name as provider_name, prov.avatar_url as provider_avatar, prov.email as provider_email, prov.phone as provider_phone,
        pp.business_name, pp.avg_rating as provider_rating, pp.is_verified as provider_verified,
        sl.title as listing_title, sl.images as listing_images, sl.price_type as listing_price_type,
        sr.title as request_title,
        q.amount as quote_amount, q.message as quote_message,
        (SELECT COUNT(*) FROM reviews r WHERE r.booking_id = b.id) as review_count
      FROM bookings b
      LEFT JOIN users cust ON b.customer_id = cust.id
      LEFT JOIN users prov ON b.provider_id = prov.id
      LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
      LEFT JOIN service_listings sl ON b.listing_id = sl.id
      LEFT JOIN service_requests sr ON b.request_id = sr.id
      LEFT JOIN quotes q ON b.quote_id = q.id
      WHERE ${where.join(' AND ')}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      bookings: bookings.map(b => ({
        ...b,
        listing_images: b.listing_images ? JSON.parse(b.listing_images) : [],
      })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const booking = db.prepare(`
      SELECT b.*,
        cust.full_name as customer_name, cust.avatar_url as customer_avatar, cust.email as customer_email, cust.phone as customer_phone, cust.location as customer_location,
        prov.full_name as provider_name, prov.avatar_url as provider_avatar, prov.email as provider_email, prov.phone as provider_phone, prov.location as provider_location,
        pp.business_name, pp.avg_rating as provider_rating, pp.is_verified as provider_verified, pp.total_jobs, pp.years_experience,
        sl.title as listing_title, sl.description as listing_description, sl.images as listing_images, sl.price_type, sl.price_amount as listing_price,
        sr.title as request_title, sr.description as request_description, sr.budget_min, sr.budget_max,
        q.amount as quote_amount, q.message as quote_message, q.proposed_date as quote_proposed_date, q.estimated_duration
      FROM bookings b
      LEFT JOIN users cust ON b.customer_id = cust.id
      LEFT JOIN users prov ON b.provider_id = prov.id
      LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
      LEFT JOIN service_listings sl ON b.listing_id = sl.id
      LEFT JOIN service_requests sr ON b.request_id = sr.id
      LEFT JOIN quotes q ON b.quote_id = q.id
      WHERE b.id = ? AND (b.customer_id = ? OR b.provider_id = ?)
    `).get(req.params.id, req.user.id, req.user.id);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Get reviews for this booking
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
      FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.booking_id = ?
    `).all(req.params.id);

    // Get payment history
    const payments = db.prepare(`
      SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({
      ...booking,
      listing_images: booking.listing_images ? JSON.parse(booking.listing_images) : [],
      reviews,
      payments,
    });
  } catch (err) {
    console.error('Get booking error:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// POST /api/bookings — Create a booking from a listing (direct book)
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { listing_id, notes, scheduled_date } = req.body;

    if (!listing_id) return res.status(400).json({ error: 'Listing ID required' });

    const listing = db.prepare('SELECT * FROM service_listings WHERE id = ? AND status = ?').get(listing_id, 'published');
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.provider_id === req.user.id) return res.status(400).json({ error: 'Cannot book your own service' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO bookings (id, listing_id, customer_id, provider_id, total_amount, notes, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, listing_id, req.user.id, listing.provider_id, listing.price_amount || 0, notes || null, scheduled_date || null);

    // Notify provider
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type)
      VALUES (?, ?, 'new_booking', 'New Booking!', ?, ?, 'booking')
    `).run(uuidv4(), listing.provider_id, `You have a new booking for "${listing.title}"`, id);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json(booking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PUT /api/bookings/:id/status — Update booking status
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customer_id !== req.user.id && booking.provider_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Status transition rules
    const isProvider = booking.provider_id === req.user.id;
    const isCustomer = booking.customer_id === req.user.id;

    if (status === 'confirmed' && !isProvider) return res.status(403).json({ error: 'Only provider can confirm' });
    if (status === 'in_progress' && !isProvider) return res.status(403).json({ error: 'Only provider can start work' });
    if (status === 'completed' && !isProvider) return res.status(403).json({ error: 'Only provider can mark complete' });

    const updates = { status, updated_at: "datetime('now')" };
    if (status === 'completed') {
      db.prepare("UPDATE bookings SET status = ?, completed_date = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);

      // Update provider stats
      db.prepare("UPDATE provider_profiles SET total_jobs = total_jobs + 1, updated_at = datetime('now') WHERE user_id = ?").run(booking.provider_id);

      // Update related request if exists
      if (booking.request_id) {
        db.prepare("UPDATE service_requests SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(booking.request_id);
      }
    } else if (status === 'cancelled') {
      db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
      if (booking.request_id) {
        db.prepare("UPDATE service_requests SET status = 'open', updated_at = datetime('now') WHERE id = ?").run(booking.request_id);
      }
    } else {
      db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    }

    // Notify the other party
    const notifyUserId = isProvider ? booking.customer_id : booking.provider_id;
    const statusMessages = {
      confirmed: 'Your booking has been confirmed!',
      in_progress: 'Work has started on your booking',
      completed: 'Your booking has been marked as completed',
      cancelled: 'A booking has been cancelled',
      disputed: 'A dispute has been raised on a booking',
    };

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type)
      VALUES (?, ?, 'booking_update', 'Booking Updated', ?, ?, 'booking')
    `).run(uuidv4(), notifyUserId, statusMessages[status] || `Booking status changed to ${status}`, req.params.id);

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update booking status error:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// GET /api/bookings/stats — Get booking stats for dashboard
router.get('/stats/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const uid = req.user.id;

    const asCustomer = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN paid_amount ELSE 0 END), 0) as total_spent
      FROM bookings WHERE customer_id = ?
    `).get(uid);

    const asProvider = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN paid_amount ELSE 0 END), 0) as total_earned
      FROM bookings WHERE provider_id = ?
    `).get(uid);

    res.json({ asCustomer, asProvider });
  } catch (err) {
    console.error('Booking stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
