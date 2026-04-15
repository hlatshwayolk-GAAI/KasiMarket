const express = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

// GET /api/categories — Get all categories with subcategories
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM service_listings sl WHERE sl.category_id = c.id AND sl.status = 'published') as listing_count
      FROM categories c 
      WHERE c.parent_id IS NULL AND c.is_active = 1
      ORDER BY c.sort_order, c.name
    `).all();

    const subcategories = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM service_listings sl WHERE sl.subcategory_id = c.id AND sl.status = 'published') as listing_count
      FROM categories c 
      WHERE c.parent_id IS NOT NULL AND c.is_active = 1
      ORDER BY c.sort_order, c.name
    `).all();

    const result = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.parent_id === cat.id),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:slug
router.get('/:slug', (req, res) => {
  try {
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').get(req.params.slug);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    let subcategories = [];
    if (!category.parent_id) {
      subcategories = db.prepare('SELECT * FROM categories WHERE parent_id = ? AND is_active = 1 ORDER BY sort_order, name').all(category.id);
    }

    res.json({ ...category, subcategories });
  } catch (err) {
    console.error('Get category error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

module.exports = router;
