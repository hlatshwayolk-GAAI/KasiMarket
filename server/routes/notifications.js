const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { unread_only, limit = 50 } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    if (unread_only === 'true') query += ' AND is_read = 0';
    query += ' ORDER BY created_at DESC LIMIT ?';
    const notifs = db.prepare(query).all(req.user.id, parseInt(limit));
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { count } = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/read-all', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
