const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

const router = express.Router();

// GET /api/requests — Browse customer requests
router.get('/', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const { category, location, budget_min, budget_max, urgency, sort, page = 1, limit = 20, status = 'open', customer_id, search } = req.query;

    let where = ['sr.status = ?'];
    let params = [status];

    if (category) {
      where.push('(sr.category_id = ? OR c.slug = ?)');
      params.push(category, category);
    }
    if (location) {
      where.push('sr.location LIKE ?');
      params.push(`%${location}%`);
    }
    if (budget_min) {
      where.push('sr.budget_max >= ?');
      params.push(parseFloat(budget_min));
    }
    if (budget_max) {
      where.push('sr.budget_min <= ?');
      params.push(parseFloat(budget_max));
    }
    if (urgency) {
      where.push('sr.urgency = ?');
      params.push(urgency);
    }
    if (customer_id) {
      where.push('sr.customer_id = ?');
      params.push(customer_id);
    }
    if (search) {
      where.push('(sr.title LIKE ? OR sr.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    let orderBy = 'sr.created_at DESC';
    if (sort === 'budget_low') orderBy = 'sr.budget_min ASC';
    if (sort === 'budget_high') orderBy = 'sr.budget_max DESC';
    if (sort === 'urgent') orderBy = "CASE sr.urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END";
    if (sort === 'newest') orderBy = 'sr.created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM service_requests sr LEFT JOIN categories c ON sr.category_id = c.id WHERE ${where.join(' AND ')}`).get(...params);

    const requests = db.prepare(`
      SELECT sr.*, 
        u.full_name as customer_name, u.avatar_url as customer_avatar, u.location as customer_location,
        c.name as category_name, c.slug as category_slug,
        (SELECT COUNT(*) FROM quotes q WHERE q.request_id = sr.id) as quote_count
      FROM service_requests sr
      LEFT JOIN users u ON sr.customer_id = u.id
      LEFT JOIN categories c ON sr.category_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      requests: requests.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/requests/latest
router.get('/latest', (req, res) => {
  try {
    const db = getDb();
    const requests = db.prepare(`
      SELECT sr.*, 
        u.full_name as customer_name, u.avatar_url as customer_avatar,
        c.name as category_name, c.slug as category_slug,
        (SELECT COUNT(*) FROM quotes q WHERE q.request_id = sr.id) as quote_count
      FROM service_requests sr
      LEFT JOIN users u ON sr.customer_id = u.id
      LEFT JOIN categories c ON sr.category_id = c.id
      WHERE sr.status = 'open'
      ORDER BY sr.created_at DESC
      LIMIT 6
    `).all();

    res.json(requests.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })));
  } catch (err) {
    console.error('Get latest requests error:', err);
    res.status(500).json({ error: 'Failed to fetch latest requests' });
  }
});

// GET /api/requests/:id
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const request = db.prepare(`
      SELECT sr.*,
        u.full_name as customer_name, u.avatar_url as customer_avatar, u.location as customer_location, u.created_at as customer_joined,
        c.name as category_name, c.slug as category_slug
      FROM service_requests sr
      LEFT JOIN users u ON sr.customer_id = u.id
      LEFT JOIN categories c ON sr.category_id = c.id
      WHERE sr.id = ?
    `).get(req.params.id);

    if (!request) return res.status(404).json({ error: 'Request not found' });

    const quotes = db.prepare(`
      SELECT q.*,
        u.full_name as provider_name, u.avatar_url as provider_avatar,
        pp.avg_rating, pp.total_reviews, pp.is_verified, pp.business_name
      FROM quotes q
      LEFT JOIN users u ON q.provider_id = u.id
      LEFT JOIN provider_profiles pp ON q.provider_id = pp.user_id
      WHERE q.request_id = ?
      ORDER BY q.created_at DESC
    `).all(req.params.id);

    res.json({
      ...request,
      images: JSON.parse(request.images || '[]'),
      quotes,
    });
  } catch (err) {
    console.error('Get request error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST /api/requests
router.post('/', authenticateToken, setUploadType('requests'), upload.array('images', 4), (req, res) => {
  try {
    const db = getDb();
    const { title, description, category_id, budget_min, budget_max, location, preferred_date, urgency } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const id = uuidv4();
    const images = req.files ? req.files.map(f => `/uploads/requests/${f.filename}`) : [];

    db.prepare(`
      INSERT INTO service_requests (id, customer_id, category_id, title, description, budget_min, budget_max, location, preferred_date, urgency, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, category_id || null, title, description, budget_min ? parseFloat(budget_min) : null, budget_max ? parseFloat(budget_max) : null, location || null, preferred_date || null, urgency || 'normal', JSON.stringify(images));

    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(id);
    res.status(201).json({ ...request, images: JSON.parse(request.images || '[]') });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// PUT /api/requests/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, category_id, budget_min, budget_max, location, preferred_date, urgency, status } = req.body;

    db.prepare(`
      UPDATE service_requests SET
        title = COALESCE(?, title), description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        budget_min = COALESCE(?, budget_min), budget_max = COALESCE(?, budget_max),
        location = COALESCE(?, location), preferred_date = COALESCE(?, preferred_date),
        urgency = COALESCE(?, urgency), status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(title, description, category_id, budget_min ? parseFloat(budget_min) : null, budget_max ? parseFloat(budget_max) : null, location, preferred_date, urgency, status, req.params.id);

    const updated = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(req.params.id);
    res.json({ ...updated, images: JSON.parse(updated.images || '[]') });
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// DELETE /api/requests/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM service_requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'Request deleted' });
  } catch (err) {
    console.error('Delete request error:', err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

module.exports = router;
