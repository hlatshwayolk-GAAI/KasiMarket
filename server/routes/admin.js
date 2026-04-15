const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/admin/stats
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const providers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('provider','both')").get().count;
    const customers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('customer','both')").get().count;
    const listings = db.prepare("SELECT COUNT(*) as count FROM service_listings WHERE status = 'published'").get().count;
    const requests = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'open'").get().count;
    const bookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    const completedBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'").get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'paid'").get().total;
    res.json({ users, providers, customers, listings, requests, bookings, completedBookings, totalRevenue });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, role, search } = req.query;
    let where = ['1=1'];
    let params = [];
    if (role) { where.push('role = ?'); params.push(role); }
    if (search) { where.push('(full_name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM users WHERE ${where.join(' AND ')}`).get(...params);
    const users = db.prepare(`SELECT id, email, phone, full_name, role, avatar_url, is_verified, is_active, created_at FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
    res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(user.is_active ? 0 : 1, req.params.id);
    res.json({ message: user.is_active ? 'User suspended' : 'User activated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/admin/listings
router.get('/listings', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, status } = req.query;
    let where = ['1=1'];
    let params = [];
    if (status) { where.push('sl.status = ?'); params.push(status); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM service_listings sl WHERE ${where.join(' AND ')}`).get(...params);
    const listings = db.prepare(`SELECT sl.*, u.full_name as provider_name, c.name as category_name FROM service_listings sl LEFT JOIN users u ON sl.provider_id = u.id LEFT JOIN categories c ON sl.category_id = c.id WHERE ${where.join(' AND ')} ORDER BY sl.created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
    res.json({ listings: listings.map(l => ({ ...l, images: JSON.parse(l.images || '[]') })), pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// PUT /api/admin/listings/:id/status
router.put('/listings/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    db.prepare('UPDATE service_listings SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Listing status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/admin/requests
router.get('/requests', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const requests = db.prepare(`SELECT sr.*, u.full_name as customer_name, c.name as category_name FROM service_requests sr LEFT JOIN users u ON sr.customer_id = u.id LEFT JOIN categories c ON sr.category_id = c.id ORDER BY sr.created_at DESC LIMIT 50`).all();
    res.json({ requests: requests.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/admin/categories — manage categories
router.get('/categories', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
