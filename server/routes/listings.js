const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

const router = express.Router();

// GET /api/listings — Browse with filters
router.get('/', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const {
      category, subcategory, location, price_min, price_max,
      price_type, sort, page = 1, limit = 20, status = 'published',
      provider_id, search
    } = req.query;

    let where = ['sl.status = ?'];
    let params = [status];

    if (category) {
      where.push('(sl.category_id = ? OR c.slug = ?)');
      params.push(category, category);
    }
    if (subcategory) {
      where.push('(sl.subcategory_id = ? OR sc.slug = ?)');
      params.push(subcategory, subcategory);
    }
    if (location) {
      where.push('(sl.location LIKE ? OR sl.service_area LIKE ?)');
      params.push(`%${location}%`, `%${location}%`);
    }
    if (price_min) {
      where.push('sl.price_amount >= ?');
      params.push(parseFloat(price_min));
    }
    if (price_max) {
      where.push('sl.price_amount <= ?');
      params.push(parseFloat(price_max));
    }
    if (price_type) {
      where.push('sl.price_type = ?');
      params.push(price_type);
    }
    if (provider_id) {
      where.push('sl.provider_id = ?');
      params.push(provider_id);
    }
    if (search) {
      where.push('(sl.title LIKE ? OR sl.description LIKE ? OR sl.tags LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    let orderBy = 'sl.created_at DESC';
    if (sort === 'price_low') orderBy = 'sl.price_amount ASC';
    if (sort === 'price_high') orderBy = 'sl.price_amount DESC';
    if (sort === 'rating') orderBy = 'pp.avg_rating DESC';
    if (sort === 'newest') orderBy = 'sl.created_at DESC';
    if (sort === 'popular') orderBy = 'sl.views_count DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countQuery = `
      SELECT COUNT(*) as total FROM service_listings sl
      LEFT JOIN categories c ON sl.category_id = c.id
      LEFT JOIN categories sc ON sl.subcategory_id = sc.id
      WHERE ${where.join(' AND ')}
    `;
    const { total } = db.prepare(countQuery).get(...params);

    const query = `
      SELECT sl.*, 
        u.full_name as provider_name, u.avatar_url as provider_avatar,
        pp.avg_rating as provider_rating, pp.total_reviews as provider_reviews,
        pp.is_verified as provider_verified, pp.business_name,
        c.name as category_name, c.slug as category_slug,
        sc.name as subcategory_name, sc.slug as subcategory_slug
      FROM service_listings sl
      LEFT JOIN users u ON sl.provider_id = u.id
      LEFT JOIN provider_profiles pp ON sl.provider_id = pp.user_id
      LEFT JOIN categories c ON sl.category_id = c.id
      LEFT JOIN categories sc ON sl.subcategory_id = sc.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const listings = db.prepare(query).all(...params, parseInt(limit), offset);

    res.json({
      listings: listings.map(l => ({
        ...l,
        images: JSON.parse(l.images || '[]'),
        tags: JSON.parse(l.tags || '[]'),
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/featured
router.get('/featured', (req, res) => {
  try {
    const db = getDb();
    const listings = db.prepare(`
      SELECT sl.*, 
        u.full_name as provider_name, u.avatar_url as provider_avatar,
        pp.avg_rating as provider_rating, pp.total_reviews as provider_reviews,
        pp.is_verified as provider_verified, pp.business_name,
        c.name as category_name, c.slug as category_slug
      FROM service_listings sl
      LEFT JOIN users u ON sl.provider_id = u.id
      LEFT JOIN provider_profiles pp ON sl.provider_id = pp.user_id
      LEFT JOIN categories c ON sl.category_id = c.id
      WHERE sl.status = 'published'
      ORDER BY pp.avg_rating DESC, sl.views_count DESC
      LIMIT 8
    `).all();

    res.json(listings.map(l => ({
      ...l,
      images: JSON.parse(l.images || '[]'),
      tags: JSON.parse(l.tags || '[]'),
    })));
  } catch (err) {
    console.error('Get featured error:', err);
    res.status(500).json({ error: 'Failed to fetch featured listings' });
  }
});

// GET /api/listings/:id
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const db = getDb();
    const listing = db.prepare(`
      SELECT sl.*, 
        u.full_name as provider_name, u.avatar_url as provider_avatar, u.bio as provider_bio,
        u.location as provider_location, u.created_at as provider_joined,
        pp.avg_rating as provider_rating, pp.total_reviews as provider_reviews,
        pp.is_verified as provider_verified, pp.business_name,
        pp.years_experience, pp.total_jobs, pp.service_areas as provider_service_areas,
        c.name as category_name, c.slug as category_slug,
        sc.name as subcategory_name, sc.slug as subcategory_slug
      FROM service_listings sl
      LEFT JOIN users u ON sl.provider_id = u.id
      LEFT JOIN provider_profiles pp ON sl.provider_id = pp.user_id
      LEFT JOIN categories c ON sl.category_id = c.id
      LEFT JOIN categories sc ON sl.subcategory_id = sc.id
      WHERE sl.id = ?
    `).get(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment view count
    db.prepare('UPDATE service_listings SET views_count = views_count + 1 WHERE id = ?').run(req.params.id);

    // Get reviews for this provider
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all(listing.provider_id);

    // Get other listings from same provider
    const relatedListings = db.prepare(`
      SELECT id, title, price_type, price_amount, images, category_id
      FROM service_listings
      WHERE provider_id = ? AND id != ? AND status = 'published'
      LIMIT 4
    `).all(listing.provider_id, listing.id);

    res.json({
      ...listing,
      images: JSON.parse(listing.images || '[]'),
      tags: JSON.parse(listing.tags || '[]'),
      reviews,
      relatedListings: relatedListings.map(l => ({ ...l, images: JSON.parse(l.images || '[]') })),
    });
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings
router.post('/', authenticateToken, setUploadType('listings'), upload.array('images', 6), (req, res) => {
  try {
    const db = getDb();
    const { title, description, category_id, subcategory_id, price_type, price_amount, location, service_area, availability, tags } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const id = uuidv4();
    const images = req.files ? req.files.map(f => `/uploads/listings/${f.filename}`) : [];
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    db.prepare(`
      INSERT INTO service_listings (id, provider_id, category_id, subcategory_id, title, description, price_type, price_amount, images, location, service_area, availability, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, category_id || null, subcategory_id || null, title, description, price_type || 'fixed', price_amount ? parseFloat(price_amount) : null, JSON.stringify(images), location || null, service_area || null, availability || null, JSON.stringify(parsedTags));

    const listing = db.prepare('SELECT * FROM service_listings WHERE id = ?').get(id);

    res.status(201).json({
      ...listing,
      images: JSON.parse(listing.images || '[]'),
      tags: JSON.parse(listing.tags || '[]'),
    });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/listings/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const listing = db.prepare('SELECT * FROM service_listings WHERE id = ?').get(req.params.id);

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.provider_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, category_id, subcategory_id, price_type, price_amount, location, service_area, availability, tags, status } = req.body;

    db.prepare(`
      UPDATE service_listings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        subcategory_id = COALESCE(?, subcategory_id),
        price_type = COALESCE(?, price_type),
        price_amount = COALESCE(?, price_amount),
        location = COALESCE(?, location),
        service_area = COALESCE(?, service_area),
        availability = COALESCE(?, availability),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(title, description, category_id, subcategory_id, price_type, price_amount ? parseFloat(price_amount) : null, location, service_area, availability, tags ? JSON.stringify(tags) : null, status, req.params.id);

    const updated = db.prepare('SELECT * FROM service_listings WHERE id = ?').get(req.params.id);
    res.json({ ...updated, images: JSON.parse(updated.images || '[]'), tags: JSON.parse(updated.tags || '[]') });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const listing = db.prepare('SELECT * FROM service_listings WHERE id = ?').get(req.params.id);

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.provider_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM service_listings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;
