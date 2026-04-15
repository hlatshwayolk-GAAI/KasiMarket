const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, full_name, role, location } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const validRoles = ['customer', 'provider', 'both'];
    const userRole = validRoles.includes(role) ? role : 'customer';

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, email, phone, password_hash, full_name, role, location)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, phone || null, password_hash, full_name, userRole, location || null);

    // If provider or both, create provider profile
    if (userRole === 'provider' || userRole === 'both') {
      db.prepare(`
        INSERT INTO provider_profiles (id, user_id, business_name, phone, email)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), id, full_name, phone || null, email);
    }

    const user = db.prepare('SELECT id, email, full_name, role, avatar_url, location, created_at FROM users WHERE id = ?').get(id);
    const token = generateToken(user);

    // Create welcome notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'welcome', 'Welcome to Kasi Market!', 'Start exploring local services or post your own.')
    `).run(uuidv4(), id);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, phone, full_name, role, avatar_url, bio, location, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let providerProfile = null;
    if (user.role === 'provider' || user.role === 'both') {
      providerProfile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(user.id);
    }

    res.json({ user, providerProfile });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, phone, bio, location } = req.body;
    const db = getDb();

    db.prepare(`
      UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), 
      bio = COALESCE(?, bio), location = COALESCE(?, location), updated_at = datetime('now')
      WHERE id = ?
    `).run(full_name, phone, bio, location, req.user.id);

    const user = db.prepare('SELECT id, email, phone, full_name, role, avatar_url, bio, location, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);

    res.json({ user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/provider-profile
router.put('/provider-profile', authenticateToken, (req, res) => {
  try {
    const { business_name, bio, years_experience, service_areas, pricing_model, availability, phone, email } = req.body;
    const db = getDb();

    const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    
    if (!profile) {
      // Create if doesn't exist
      const id = uuidv4();
      db.prepare(`
        INSERT INTO provider_profiles (id, user_id, business_name, phone, email, bio, years_experience, service_areas, pricing_model, availability)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, business_name, phone, email, bio, years_experience || 0, service_areas, pricing_model, availability);

      // Update user role if needed
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
      if (user.role === 'customer') {
        db.prepare("UPDATE users SET role = 'both' WHERE id = ?").run(req.user.id);
      }
    } else {
      db.prepare(`
        UPDATE provider_profiles SET
          business_name = COALESCE(?, business_name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          bio = COALESCE(?, bio),
          years_experience = COALESCE(?, years_experience),
          service_areas = COALESCE(?, service_areas),
          pricing_model = COALESCE(?, pricing_model),
          availability = COALESCE(?, availability),
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(business_name, phone, email, bio, years_experience, service_areas, pricing_model, availability, req.user.id);
    }

    const updatedProfile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    res.json({ providerProfile: updatedProfile });
  } catch (err) {
    console.error('Update provider profile error:', err);
    res.status(500).json({ error: 'Failed to update provider profile' });
  }
});

// POST /api/auth/avatar
router.post('/avatar', authenticateToken, setUploadType('avatars'), upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const db = getDb();
    db.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?').run(avatarUrl, req.user.id);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

module.exports = router;
