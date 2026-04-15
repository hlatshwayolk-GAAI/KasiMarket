const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/quotes — Submit a quote for a request
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { request_id, amount, message, proposed_date, estimated_duration } = req.body;

    if (!request_id || !amount) {
      return res.status(400).json({ error: 'Request ID and amount are required' });
    }

    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(request_id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customer_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot quote on your own request' });
    }

    // Check for existing quote
    const existing = db.prepare('SELECT id FROM quotes WHERE request_id = ? AND provider_id = ?').get(request_id, req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'You have already submitted a quote for this request' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO quotes (id, request_id, provider_id, amount, message, proposed_date, estimated_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, request_id, req.user.id, parseFloat(amount), message || null, proposed_date || null, estimated_duration || null);

    // Update request status if first quote
    const quoteCount = db.prepare('SELECT COUNT(*) as count FROM quotes WHERE request_id = ?').get(request_id).count;
    if (quoteCount === 1) {
      db.prepare("UPDATE service_requests SET status = 'quoted', updated_at = datetime('now') WHERE id = ?").run(request_id);
    }

    // Notify the customer
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type)
      VALUES (?, ?, 'quote_received', 'New Quote Received', ?, ?, 'request')
    `).run(uuidv4(), request.customer_id, `You received a quote of R${amount} for "${request.title}"`, request_id);

    const quote = db.prepare(`
      SELECT q.*, u.full_name as provider_name, u.avatar_url as provider_avatar,
        pp.avg_rating, pp.total_reviews, pp.is_verified, pp.business_name
      FROM quotes q
      LEFT JOIN users u ON q.provider_id = u.id
      LEFT JOIN provider_profiles pp ON q.provider_id = pp.user_id
      WHERE q.id = ?
    `).get(id);

    res.status(201).json(quote);
  } catch (err) {
    console.error('Create quote error:', err);
    res.status(500).json({ error: 'Failed to submit quote' });
  }
});

// PUT /api/quotes/:id/accept
router.put('/:id/accept', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(quote.request_id);
    if (request.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the request owner can accept quotes' });
    }

    // Accept this quote, reject others
    db.prepare("UPDATE quotes SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE quotes SET status = 'rejected', updated_at = datetime('now') WHERE request_id = ? AND id != ?").run(quote.request_id, req.params.id);
    db.prepare("UPDATE service_requests SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(quote.request_id);

    // Create a booking
    const bookingId = uuidv4();
    db.prepare(`
      INSERT INTO bookings (id, request_id, customer_id, provider_id, quote_id, total_amount, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(bookingId, quote.request_id, req.user.id, quote.provider_id, quote.id, quote.amount, quote.proposed_date);

    // Notify the provider
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type)
      VALUES (?, ?, 'quote_accepted', 'Quote Accepted!', ?, ?, 'booking')
    `).run(uuidv4(), quote.provider_id, `Your quote of R${quote.amount} for "${request.title}" was accepted!`, bookingId);

    res.json({ message: 'Quote accepted', bookingId });
  } catch (err) {
    console.error('Accept quote error:', err);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

// PUT /api/quotes/:id/reject
router.put('/:id/reject', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(quote.request_id);
    if (request.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the request owner can reject quotes' });
    }

    db.prepare("UPDATE quotes SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    res.json({ message: 'Quote rejected' });
  } catch (err) {
    console.error('Reject quote error:', err);
    res.status(500).json({ error: 'Failed to reject quote' });
  }
});

// GET /api/quotes/my — Provider's quotes
router.get('/my', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const quotes = db.prepare(`
      SELECT q.*, sr.title as request_title, sr.description as request_description,
        sr.budget_min, sr.budget_max, sr.location as request_location,
        u.full_name as customer_name, u.avatar_url as customer_avatar
      FROM quotes q
      LEFT JOIN service_requests sr ON q.request_id = sr.id
      LEFT JOIN users u ON sr.customer_id = u.id
      WHERE q.provider_id = ?
      ORDER BY q.created_at DESC
    `).all(req.user.id);

    res.json(quotes);
  } catch (err) {
    console.error('Get my quotes error:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

module.exports = router;
