const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations — Get user's conversations
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const conversations = db.prepare(`
      SELECT c.*,
        CASE WHEN c.participant_1 = ? THEN u2.full_name ELSE u1.full_name END as other_name,
        CASE WHEN c.participant_1 = ? THEN u2.avatar_url ELSE u1.avatar_url END as other_avatar,
        CASE WHEN c.participant_1 = ? THEN c.participant_2 ELSE c.participant_1 END as other_id,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count,
        sl.title as listing_title,
        sr.title as request_title
      FROM conversations c
      LEFT JOIN users u1 ON c.participant_1 = u1.id
      LEFT JOIN users u2 ON c.participant_2 = u2.id
      LEFT JOIN service_listings sl ON c.listing_id = sl.id
      LEFT JOIN service_requests sr ON c.request_id = sr.id
      WHERE c.participant_1 = ? OR c.participant_2 = ?
      ORDER BY c.last_message_at DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

    res.json(conversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/conversations/:id — Get messages in a conversation
router.get('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)').get(req.params.id, req.user.id, req.user.id);

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // Mark messages as read
    db.prepare('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?').run(req.params.id, req.user.id);

    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id);

    const otherId = conversation.participant_1 === req.user.id ? conversation.participant_2 : conversation.participant_1;
    const otherUser = db.prepare('SELECT id, full_name, avatar_url, is_verified FROM users WHERE id = ?').get(otherId);

    res.json({ conversation, messages, otherUser });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages — Send a message
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { receiver_id, content, listing_id, request_id, conversation_id } = req.body;

    if (!content) return res.status(400).json({ error: 'Message content is required' });

    let convId = conversation_id;

    if (!convId) {
      if (!receiver_id) return res.status(400).json({ error: 'Receiver ID or conversation ID is required' });

      // Find or create conversation
      const existing = db.prepare(`
        SELECT id FROM conversations
        WHERE (participant_1 = ? AND participant_2 = ?) OR (participant_1 = ? AND participant_2 = ?)
      `).get(req.user.id, receiver_id, receiver_id, req.user.id);

      if (existing) {
        convId = existing.id;
      } else {
        convId = uuidv4();
        db.prepare(`
          INSERT INTO conversations (id, participant_1, participant_2, listing_id, request_id, last_message, last_message_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(convId, req.user.id, receiver_id, listing_id || null, request_id || null, content.substring(0, 100));
      }
    }

    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      VALUES (?, ?, ?, ?)
    `).run(msgId, convId, req.user.id, content);

    // Update conversation last message
    db.prepare("UPDATE conversations SET last_message = ?, last_message_at = datetime('now') WHERE id = ?").run(content.substring(0, 100), convId);

    // Create notification for receiver
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
    const receiverId = conv.participant_1 === req.user.id ? conv.participant_2 : conv.participant_1;
    
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, reference_id, reference_type)
      VALUES (?, ?, 'new_message', 'New Message', ?, ?, 'conversation')
    `).run(uuidv4(), receiverId, `${req.user.full_name}: ${content.substring(0, 80)}`, convId);

    const message = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.id = ?
    `).get(msgId);

    res.status(201).json({ message, conversation_id: convId });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/unread-count
router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { count } = db.prepare(`
      SELECT COUNT(*) as count FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.participant_1 = ? OR c.participant_2 = ?)
      AND m.sender_id != ? AND m.is_read = 0
    `).get(req.user.id, req.user.id, req.user.id);

    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;
