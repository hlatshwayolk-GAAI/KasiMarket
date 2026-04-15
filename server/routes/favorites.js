const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/favorites — Get user's saved listings
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const favorites = db.prepare(`
      SELECT f.id as favorite_id, f.created_at as saved_at,
        sl.id, sl.title, sl.description, sl.price_type, sl.price_amount, sl.images, sl.location, sl.views_count,
        c.name as category_name, c.icon as category_icon,
        u.full_name as provider_name, u.avatar_url as provider_avatar,
        pp.business_name, pp.avg_rating as provider_rating, pp.is_verified as provider_verified
      FROM favorites f
      JOIN service_listings sl ON f.listing_id = sl.id
      LEFT JOIN categories c ON sl.category_id = c.id
      LEFT JOIN users u ON sl.provider_id = u.id
      LEFT JOIN provider_profiles pp ON sl.provider_id = pp.user_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(req.user.id);

    res.json(favorites.map(f => ({ ...f, images: JSON.parse(f.images || '[]') })));
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites — Save a listing
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { listing_id } = req.body;
    if (!listing_id) return res.status(400).json({ error: 'Listing ID required' });

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?')
      .get(req.user.id, listing_id);
    if (existing) return res.status(400).json({ error: 'Already saved' });

    const id = uuidv4();
    db.prepare('INSERT INTO favorites (id, user_id, listing_id) VALUES (?, ?, ?)').run(id, req.user.id, listing_id);
    res.status(201).json({ id, listing_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save listing' });
  }
});

// DELETE /api/favorites/:listing_id — Unsave a listing
router.delete('/:listing_id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(req.user.id, req.params.listing_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// GET /api/favorites/check/:listing_id — Check if a listing is saved
router.get('/check/:listing_id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?')
      .get(req.user.id, req.params.listing_id);
    res.json({ saved: !!fav });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

module.exports = router;
