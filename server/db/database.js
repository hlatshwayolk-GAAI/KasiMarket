const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'kasi_market.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'provider', 'both', 'admin')),
      avatar_url TEXT,
      bio TEXT,
      location TEXT,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Provider profiles
    CREATE TABLE IF NOT EXISTS provider_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      business_name TEXT,
      phone TEXT,
      email TEXT,
      bio TEXT,
      years_experience INTEGER DEFAULT 0,
      service_areas TEXT,
      pricing_model TEXT,
      availability TEXT,
      avg_rating REAL DEFAULT 0,
      total_jobs INTEGER DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      portfolio_images TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT,
      description TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Service listings
    CREATE TABLE IF NOT EXISTS service_listings (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      category_id TEXT,
      subcategory_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_type TEXT DEFAULT 'fixed' CHECK(price_type IN ('fixed', 'starting_from', 'hourly', 'quote')),
      price_amount REAL,
      images TEXT DEFAULT '[]',
      location TEXT,
      service_area TEXT,
      availability TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'pending', 'published', 'paused', 'rejected', 'removed')),
      views_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Customer service requests
    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      category_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget_min REAL,
      budget_max REAL,
      location TEXT,
      preferred_date TEXT,
      urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('low', 'normal', 'urgent', 'emergency')),
      images TEXT DEFAULT '[]',
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_review', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled', 'closed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Quotes
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      amount REAL NOT NULL,
      message TEXT,
      proposed_date TEXT,
      estimated_duration TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Bookings
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT,
      request_id TEXT,
      customer_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      quote_id TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')),
      total_amount REAL,
      paid_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
      notes TEXT,
      scheduled_date TEXT,
      completed_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (listing_id) REFERENCES service_listings(id) ON DELETE SET NULL,
      FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
    );

    -- Conversations
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      participant_1 TEXT NOT NULL,
      participant_2 TEXT NOT NULL,
      listing_id TEXT,
      request_id TEXT,
      last_message TEXT,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (participant_1) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_2) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES service_listings(id) ON DELETE SET NULL,
      FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE SET NULL
    );

    -- Messages
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Reviews
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      overall_rating INTEGER NOT NULL CHECK(overall_rating >= 1 AND overall_rating <= 5),
      quality INTEGER CHECK(quality >= 1 AND quality <= 5),
      communication INTEGER CHECK(communication >= 1 AND communication <= 5),
      punctuality INTEGER CHECK(punctuality >= 1 AND punctuality <= 5),
      value INTEGER CHECK(value >= 1 AND value <= 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      payer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'payfast',
      payfast_ref TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      reference_id TEXT,
      reference_type TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Saved/Favorites
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      listing_id TEXT,
      provider_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES service_listings(id) ON DELETE CASCADE
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_listings_category ON service_listings(category_id);
    CREATE INDEX IF NOT EXISTS idx_listings_provider ON service_listings(provider_id);
    CREATE INDEX IF NOT EXISTS idx_listings_status ON service_listings(status);
    CREATE INDEX IF NOT EXISTS idx_requests_customer ON service_requests(customer_id);
    CREATE INDEX IF NOT EXISTS idx_requests_category ON service_requests(category_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(request_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  `);
}

module.exports = { getDb };
