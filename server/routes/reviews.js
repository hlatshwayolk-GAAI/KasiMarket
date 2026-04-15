const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/reviews
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { booking_id, reviewee_id, overall_rating, quality, communication, punctuality, value, comment } = req.body;
    if (!reviewee_id || !overall_rating) return res.status(400).json({ error: 'Reviewee and rating required' });

    const id = uuidv4();
    db.prepare(`INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, overall_rating, quality, communication, punctuality, value, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, booking_id || null, req.user.id, reviewee_id, overall_rating, quality || null, communication || null, punctuality || null, value || null, comment || null);

    // Update provider avg rating
    const stats = db.prepare('SELECT AVG(overall_rating) as avg, COUNT(*) as cnt FROM reviews WHERE reviewee_id = ?').get(reviewee_id);
    db.prepare('UPDATE provider_profiles SET avg_rating = ?, total_reviews = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(Math.round(stats.avg * 10) / 10, stats.cnt, reviewee_id);

    // Notify
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type) VALUES (?, ?, 'review_received', 'New Review', ?, ?, 'review')`).run(uuidv4(), reviewee_id, `You received a ${overall_rating}-star review`, id);

    const review = db.prepare('SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id WHERE r.id = ?').get(id);
    res.status(201).json(review);
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews/provider/:id
router.get('/provider/:id', (req, res) => {
  try {
    const db = getDb();
    const reviews = db.prepare(`SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id WHERE r.reviewee_id = ? ORDER BY r.created_at DESC LIMIT 50`).all(req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
