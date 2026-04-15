const { getDb } = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function seed() {
  const db = getDb();
  console.log('🌱 Seeding Kasi Market database...\n');

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (existing.count > 0) {
    console.log('Database already seeded. Skipping.\n');
    return;
  }

  // Categories
  const cats = [
    { id: uuidv4(), name: 'Home Cleaning', slug: 'home-cleaning', icon: '🏠', desc: 'House cleaning, deep cleaning, move-out cleaning', sort: 1 },
    { id: uuidv4(), name: 'Outdoor & Garden', slug: 'outdoor-garden', icon: '🌿', desc: 'Gardening, landscaping, yard cleaning', sort: 2 },
    { id: uuidv4(), name: 'Pool Services', slug: 'pool-services', icon: '🏊', desc: 'Pool cleaning, maintenance, repairs', sort: 3 },
    { id: uuidv4(), name: 'Childcare & Nanny', slug: 'childcare-nanny', icon: '👶', desc: 'Babysitting, nanny services, au pair', sort: 4 },
    { id: uuidv4(), name: 'Fencing', slug: 'fencing', icon: '🏗️', desc: 'Fence installation, repairs, palisade fencing', sort: 5 },
    { id: uuidv4(), name: 'Welding', slug: 'welding', icon: '⚙️', desc: 'Welding, metalwork, gate repairs', sort: 6 },
    { id: uuidv4(), name: 'Roofing', slug: 'roofing', icon: '🏘️', desc: 'Roof repairs, installations, waterproofing', sort: 7 },
    { id: uuidv4(), name: 'Moving Services', slug: 'moving-services', icon: '📦', desc: 'Moving, packing, furniture transport', sort: 8 },
    { id: uuidv4(), name: 'Transport', slug: 'transport', icon: '🚛', desc: 'Transport for moving, delivery, bakkie hire', sort: 9 },
    { id: uuidv4(), name: 'Handyman', slug: 'handyman', icon: '🔧', desc: 'General repairs, maintenance, odd jobs', sort: 10 },
    { id: uuidv4(), name: 'Plumbing', slug: 'plumbing', icon: '🚿', desc: 'Plumbing repairs, installations, drain cleaning', sort: 11 },
    { id: uuidv4(), name: 'Electrical', slug: 'electrical', icon: '💡', desc: 'Electrical repairs, installations, wiring', sort: 12 },
    { id: uuidv4(), name: 'Painting', slug: 'painting', icon: '🎨', desc: 'House painting, spray painting, wallpaper', sort: 13 },
  ];

  const insertCat = db.prepare('INSERT INTO categories (id, name, slug, icon, description, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
  cats.forEach(c => insertCat.run(c.id, c.name, c.slug, c.icon, c.desc, null, c.sort));

  // Subcategories
  const subCats = {
    'home-cleaning': ['House Cleaning', 'Deep Cleaning', 'Move-out Cleaning', 'Office Cleaning', 'Window Cleaning'],
    'outdoor-garden': ['Gardening', 'Grass Cutting', 'Tree Trimming', 'Yard Cleaning', 'Landscaping'],
    'pool-services': ['Pool Cleaning', 'Pool Maintenance', 'Pool Repairs', 'Pool Installation'],
    'fencing': ['Palisade Fencing', 'Precast Walls', 'Wooden Fencing', 'Wire Fencing', 'Gate Installation'],
    'welding': ['Gate Welding', 'Burglar Bars', 'Custom Metalwork', 'Steel Structures'],
    'roofing': ['Roof Repairs', 'Roof Installation', 'Waterproofing', 'Gutter Installation'],
    'moving-services': ['Full House Moving', 'Furniture Transport', 'Packing Services', 'Local Removals'],
    'handyman': ['General Repairs', 'Tiling', 'Ceiling Repairs', 'Door & Window Repairs'],
  };

  Object.entries(subCats).forEach(([parentSlug, subs]) => {
    const parent = cats.find(c => c.slug === parentSlug);
    if (parent) {
      subs.forEach((name, i) => {
        const slug = `${parentSlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        insertCat.run(uuidv4(), name, slug, null, null, parent.id, i + 1);
      });
    }
  });

  // Demo admin user
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('admin123', 10);
  db.prepare('INSERT INTO users (id, email, phone, password_hash, full_name, role, location, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').run(adminId, 'admin@kasimarket.co.za', '0800000000', adminHash, 'Kasi Market Admin', 'admin', 'Johannesburg');

  // Demo provider
  const providerId = uuidv4();
  const provHash = await bcrypt.hash('provider123', 10);
  db.prepare('INSERT INTO users (id, email, phone, password_hash, full_name, role, location, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').run(providerId, 'thabo@example.com', '0821234567', provHash, 'Thabo Mokoena', 'provider', 'Soweto, Johannesburg');
  db.prepare('INSERT INTO provider_profiles (id, user_id, business_name, phone, email, bio, years_experience, service_areas, avg_rating, total_jobs, total_reviews, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)').run(uuidv4(), providerId, 'Thabo\'s Garden Works', '0821234567', 'thabo@example.com', 'Professional gardening and landscaping services. Serving Soweto and surrounding areas for 8 years.', 8, 'Soweto, Diepkloof, Meadowlands, Orlando', 4.8, 156, 42);

  // Demo provider 2
  const provider2Id = uuidv4();
  const prov2Hash = await bcrypt.hash('provider123', 10);
  db.prepare('INSERT INTO users (id, email, phone, password_hash, full_name, role, location, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').run(provider2Id, 'nomsa@example.com', '0831234567', prov2Hash, 'Nomsa Dlamini', 'provider', 'Alexandra, Johannesburg');
  db.prepare('INSERT INTO provider_profiles (id, user_id, business_name, phone, email, bio, years_experience, service_areas, avg_rating, total_jobs, total_reviews, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)').run(uuidv4(), provider2Id, 'Nomsa\'s Spotless Cleaning', '0831234567', 'nomsa@example.com', 'Reliable and thorough cleaning services for homes and offices. We make your space shine!', 5, 'Alexandra, Sandton, Fourways, Randburg', 4.9, 203, 67);

  // Demo customer
  const customerId = uuidv4();
  const custHash = await bcrypt.hash('customer123', 10);
  db.prepare('INSERT INTO users (id, email, phone, password_hash, full_name, role, location) VALUES (?, ?, ?, ?, ?, ?, ?)').run(customerId, 'sipho@example.com', '0841234567', custHash, 'Sipho Nkosi', 'customer', 'Midrand, Johannesburg');

  // Demo listings
  const cleaningCat = cats.find(c => c.slug === 'home-cleaning');
  const gardenCat = cats.find(c => c.slug === 'outdoor-garden');
  const fencingCat = cats.find(c => c.slug === 'fencing');
  const handyCat = cats.find(c => c.slug === 'handyman');
  const roofCat = cats.find(c => c.slug === 'roofing');
  const movingCat = cats.find(c => c.slug === 'moving-services');

  const insertListing = db.prepare('INSERT INTO service_listings (id, provider_id, category_id, title, description, price_type, price_amount, location, service_area, availability, tags, status, views_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  insertListing.run(uuidv4(), providerId, gardenCat.id, 'Professional Garden Maintenance', 'Complete garden care including grass cutting, hedge trimming, weeding, and planting. We bring our own tools and equipment. Weekly, bi-weekly, or once-off service available.', 'starting_from', 350, 'Soweto', 'Soweto, Diepkloof, Meadowlands', 'Mon-Sat, 7am-5pm', '["gardening","grass cutting","landscaping"]', 'published', 234);
  insertListing.run(uuidv4(), providerId, gardenCat.id, 'Tree Trimming & Removal', 'Safe and professional tree trimming, pruning, and removal. We handle all sizes of trees. Rubble removal included.', 'quote', null, 'Soweto', 'Greater Johannesburg', 'Mon-Sat', '["tree trimming","tree removal"]', 'published', 89);
  insertListing.run(uuidv4(), provider2Id, cleaningCat.id, 'Full House Deep Cleaning', 'Thorough deep cleaning of your entire home. Includes all rooms, kitchen, bathrooms, windows, and floors. We use eco-friendly cleaning products.', 'starting_from', 600, 'Alexandra', 'Sandton, Fourways, Randburg, Alexandra', 'Mon-Sun, 7am-6pm', '["deep cleaning","house cleaning","spring cleaning"]', 'published', 412);
  insertListing.run(uuidv4(), provider2Id, cleaningCat.id, 'Move-out / Move-in Cleaning', 'Get your deposit back with our thorough move-out cleaning service. We clean every corner to leave the place spotless.', 'fixed', 800, 'Alexandra', 'Greater Johannesburg', 'Mon-Sat', '["move-out cleaning","move-in cleaning"]', 'published', 178);
  insertListing.run(uuidv4(), providerId, fencingCat.id, 'Palisade Fencing Installation', 'Quality palisade fencing installation for homes and businesses. Includes measurement, materials, and professional installation. Various designs available.', 'starting_from', 450, 'Soweto', 'Greater Johannesburg', 'Mon-Fri, 7am-4pm', '["palisade","fencing","security"]', 'published', 156);
  insertListing.run(uuidv4(), provider2Id, handyCat.id, 'General Home Repairs', 'Fixing doors, windows, tiling, ceiling repairs, painting touch-ups, and more. No job too small!', 'hourly', 200, 'Alexandra', 'Sandton, Alexandria, Midrand', 'Mon-Sat', '["handyman","repairs","maintenance"]', 'published', 95);

  // Demo requests
  const insertReq = db.prepare('INSERT INTO service_requests (id, customer_id, category_id, title, description, budget_min, budget_max, location, preferred_date, urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertReq.run(uuidv4(), customerId, fencingCat.id, 'Need Palisade Fencing for my yard', 'Looking for someone to install palisade fencing around my property in Midrand. About 40 meters total. Need it done within the next 2 weeks.', 5000, 10000, 'Midrand', '2026-04-28', 'normal');
  insertReq.run(uuidv4(), customerId, roofCat.id, 'Roof Leak Repair Needed Urgently', 'My roof is leaking badly after the recent rains. Need someone to come fix it ASAP. It is a tiled roof, about 3 tiles seem broken.', 1500, 4000, 'Midrand', null, 'urgent');
  insertReq.run(uuidv4(), customerId, movingCat.id, 'Need Help Moving to New House', 'Moving from Midrand to Centurion. 2 bedroom flat. Need truck and 2-3 helpers. Moving date flexible within the month.', 2000, 5000, 'Midrand to Centurion', '2026-05-10', 'low');

  console.log('✅ Categories seeded:', cats.length, '+ subcategories');
  console.log('✅ Demo users created:');
  console.log('   Admin: admin@kasimarket.co.za / admin123');
  console.log('   Provider: thabo@example.com / provider123');
  console.log('   Provider: nomsa@example.com / provider123');
  console.log('   Customer: sipho@example.com / customer123');
  console.log('✅ Demo listings and requests created');
  console.log('\n🌱 Seeding complete!\n');
}

seed().catch(console.error);
