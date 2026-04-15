const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/provider — Provider analytics
router.get('/provider', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const uid = req.user.id;
    const { period = '30' } = req.query;
    const daysAgo = `datetime('now', '-${parseInt(period)} days')`;

    // Overview stats
    const overview = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM service_listings WHERE provider_id = ?) as total_listings,
        (SELECT COUNT(*) FROM service_listings WHERE provider_id = ? AND status = 'published') as active_listings,
        (SELECT SUM(views_count) FROM service_listings WHERE provider_id = ?) as total_views,
        (SELECT COUNT(*) FROM bookings WHERE provider_id = ?) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'completed') as completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'pending') as pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE provider_id = ? AND status = 'in_progress') as active_bookings,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM bookings WHERE provider_id = ? AND payment_status = 'paid') as total_earnings,
        (SELECT COUNT(*) FROM quotes WHERE provider_id = ?) as total_quotes,
        (SELECT COUNT(*) FROM quotes WHERE provider_id = ? AND status = 'accepted') as accepted_quotes,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = ?) as total_reviews,
        (SELECT COALESCE(AVG(overall_rating), 0) FROM reviews WHERE reviewee_id = ?) as avg_rating
    `).get(uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid);

    // Earnings over time (last N days, grouped by week)
    const earnings = db.prepare(`
      SELECT 
        strftime('%Y-%W', b.completed_date) as week,
        SUM(b.paid_amount) as amount,
        COUNT(*) as jobs
      FROM bookings b
      WHERE b.provider_id = ? AND b.payment_status = 'paid' AND b.completed_date >= ${daysAgo}
      GROUP BY week ORDER BY week
    `).all(uid);

    // Recent bookings activity
    const recentBookings = db.prepare(`
      SELECT b.id, b.status, b.total_amount, b.paid_amount, b.created_at,
        sl.title as listing_title, sr.title as request_title,
        cust.full_name as customer_name
      FROM bookings b
      LEFT JOIN service_listings sl ON b.listing_id = sl.id
      LEFT JOIN service_requests sr ON b.request_id = sr.id
      LEFT JOIN users cust ON b.customer_id = cust.id
      WHERE b.provider_id = ?
      ORDER BY b.created_at DESC LIMIT 10
    `).all(uid);

    // Top performing listings
    const topListings = db.prepare(`
      SELECT sl.id, sl.title, sl.views_count, sl.price_amount, sl.price_type,
        (SELECT COUNT(*) FROM bookings b WHERE b.listing_id = sl.id) as booking_count,
        (SELECT COALESCE(SUM(b.paid_amount), 0) FROM bookings b WHERE b.listing_id = sl.id AND b.payment_status = 'paid') as revenue
      FROM service_listings sl
      WHERE sl.provider_id = ? AND sl.status = 'published'
      ORDER BY booking_count DESC, sl.views_count DESC
      LIMIT 5
    `).all(uid);

    // Rating breakdown
    const ratingBreakdown = db.prepare(`
      SELECT overall_rating as rating, COUNT(*) as count
      FROM reviews WHERE reviewee_id = ?
      GROUP BY overall_rating ORDER BY overall_rating DESC
    `).all(uid);

    // Quote conversion rate
    const quoteStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM quotes WHERE provider_id = ?
    `).get(uid);

    // Views over time
    const viewsByListing = db.prepare(`
      SELECT id, title, views_count FROM service_listings
      WHERE provider_id = ? AND status = 'published'
      ORDER BY views_count DESC LIMIT 10
    `).all(uid);

    res.json({
      overview,
      earnings,
      recentBookings,
      topListings,
      ratingBreakdown,
      quoteStats,
      viewsByListing,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
