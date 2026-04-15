const express = require('express');
const { getDb } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const { q, type, category, location, limit = 20 } = req.query;
    if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    const s = `%${q.trim()}%`;
    const results = { listings: [], requests: [], providers: [] };

    if (!type || type === 'all' || type === 'listings') {
      results.listings = db.prepare(`
        SELECT sl.id, sl.title, sl.description, sl.price_type, sl.price_amount, sl.images, sl.location,
          u.full_name as provider_name, pp.avg_rating as provider_rating,
          c.name as category_name, c.slug as category_slug
        FROM service_listings sl LEFT JOIN users u ON sl.provider_id = u.id
        LEFT JOIN provider_profiles pp ON sl.provider_id = pp.user_id
        LEFT JOIN categories c ON sl.category_id = c.id
        WHERE sl.status = 'published' AND (sl.title LIKE ? OR sl.description LIKE ?)
        ORDER BY pp.avg_rating DESC LIMIT ?
      `).all(s, s, parseInt(limit)).map(l => ({ ...l, images: JSON.parse(l.images || '[]'), type: 'listing' }));
    }
    if (!type || type === 'all' || type === 'requests') {
      results.requests = db.prepare(`
        SELECT sr.id, sr.title, sr.description, sr.budget_min, sr.budget_max, sr.location, sr.urgency,
          u.full_name as customer_name, c.name as category_name
        FROM service_requests sr LEFT JOIN users u ON sr.customer_id = u.id
        LEFT JOIN categories c ON sr.category_id = c.id
        WHERE sr.status = 'open' AND (sr.title LIKE ? OR sr.description LIKE ?)
        ORDER BY sr.created_at DESC LIMIT ?
      `).all(s, s, parseInt(limit)).map(r => ({ ...r, type: 'request' }));
    }
    if (!type || type === 'all' || type === 'providers') {
      results.providers = db.prepare(`
        SELECT u.id, u.full_name, u.avatar_url, u.location,
          pp.business_name, pp.avg_rating, pp.total_reviews, pp.is_verified
        FROM users u LEFT JOIN provider_profiles pp ON u.id = pp.user_id
        WHERE u.is_active = 1 AND u.role IN ('provider','both')
        AND (u.full_name LIKE ? OR pp.business_name LIKE ?)
        ORDER BY pp.avg_rating DESC LIMIT ?
      `).all(s, s, parseInt(limit)).map(p => ({ ...p, type: 'provider' }));
    }
    res.json({ ...results, total: results.listings.length + results.requests.length + results.providers.length, query: q });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
