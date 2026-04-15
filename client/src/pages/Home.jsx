import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, MapPin, Star, Clock, Briefcase, Users, TrendingUp, Shield } from 'lucide-react';
import { api } from '../utils/api';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [latestRequests, setLatestRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getFeaturedListings().then(setFeatured).catch(() => {});
    api.getLatestRequests().then(setLatestRequests).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
  };

  const formatPrice = (listing) => {
    if (!listing.price_amount) return 'Get Quote';
    const prefix = listing.price_type === 'starting_from' ? 'From ' : listing.price_type === 'hourly' ? '' : '';
    const suffix = listing.price_type === 'hourly' ? '/hr' : '';
    return `${prefix}R${listing.price_amount.toLocaleString()}${suffix}`;
  };

  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="hero">
        <img
          src="/images/hero-bg.png"
          alt="South African community service workers"
          className="hero-bg-image"
        />
        <div className="hero-content slide-up">
          <div className="hero-badge">
            ✦ Your Community Marketplace ✦
          </div>
          <div className="hero-subtitle">Connecting Communities Through</div>
          <h1>
            Local Spane.<br />
            <span className="gradient-text">Local Work.</span>
          </h1>
          <p>From welding to gardening, brick laying to cleaning — trusted service providers right in your kasi.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <Search size={20} className="search-icon-hero" />
            <input
              type="text" placeholder="What service do you need?"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary search-btn">Search</button>
          </form>
          <div className="hero-ctas">
            <Link to="/browse" className="btn btn-primary btn-lg">
              <Search size={18} /> Find a Service
            </Link>
            <Link to="/create-listing" className="btn btn-secondary btn-lg">
              <Briefcase size={18} /> Post a Service
            </Link>
            <Link to="/create-request" className="btn btn-outline btn-lg">
              <Users size={18} /> Post a Request
            </Link>
          </div>
        </div>
      </section>

      {/* Category pills */}
      <div className="category-pills">
        {categories.map(cat => (
          <Link key={cat.id} to={`/browse/${cat.slug}`} className="category-pill">
            <span className="cat-icon">{cat.icon}</span>
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Featured Services */}
      {featured.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Featured <span className="accent">Services</span></h2>
            <Link to="/browse" className="btn btn-ghost">View All <ArrowRight size={16} /></Link>
          </div>
          <div className="container">
            <div className="listing-grid">
              {featured.slice(0, 4).map(listing => (
                <Link key={listing.id} to={`/listing/${listing.id}`} className="listing-card card" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card-image-container">
                    {listing.images?.length > 0 ? (
                      <img src={listing.images[0]} alt={listing.title} />
                    ) : (
                      <div className="card-image-placeholder">
                        {categories.find(c => c.id === listing.category_id)?.icon || '🔧'}
                      </div>
                    )}
                    <span className="price-badge">{formatPrice(listing)}</span>
                  </div>
                  <div className="card-body">
                    <div className="card-category">{listing.category_name}</div>
                    <h3 className="card-title">{listing.title}</h3>
                    <div className="card-location"><MapPin size={14} /> {listing.location || 'Local'}</div>
                    <div className="card-provider">
                      <div className="provider-avatar">
                        {listing.provider_avatar ? <img src={listing.provider_avatar} alt="" /> : listing.provider_name?.[0]}
                      </div>
                      <span className="provider-name">{listing.business_name || listing.provider_name}</span>
                      {listing.provider_rating > 0 && (
                        <span className="provider-rating"><Star size={14} /> {listing.provider_rating}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Requests */}
      {latestRequests.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Latest Job <span className="accent">Requests</span></h2>
            <Link to="/browse?tab=requests" className="btn btn-ghost">View All <ArrowRight size={16} /></Link>
          </div>
          <div className="container">
            <div className="request-grid">
              {latestRequests.slice(0, 4).map(req => (
                <Link key={req.id} to={`/request/${req.id}`} className="request-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="request-header">
                    <h3 className="request-title">{req.title}</h3>
                    <span className={`urgency-badge urgency-${req.urgency}`}>{req.urgency}</span>
                  </div>
                  <p className="request-desc">{req.description}</p>
                  <div className="request-meta">
                    {(req.budget_min || req.budget_max) && (
                      <span className="request-budget">
                        💰 R{req.budget_min?.toLocaleString() || '0'} - R{req.budget_max?.toLocaleString() || '∞'}
                      </span>
                    )}
                    <span><MapPin size={14} /> {req.location || 'Local'}</span>
                    {req.category_name && <span>{req.category_name}</span>}
                    <span className="quote-count">💬 {req.quote_count || 0} quotes</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">How It <span className="accent">Works</span></h2>
        </div>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-xl)' }}>
            {[
              { icon: <Search size={28} />, title: 'Search & Browse', desc: 'Find the service you need by browsing categories or searching directly.' },
              { icon: <Users size={28} />, title: 'Compare & Choose', desc: 'Compare providers by ratings, prices, and reviews. Or post a job and let providers come to you.' },
              { icon: <Shield size={28} />, title: 'Book & Pay Safely', desc: 'Book your provider and pay securely through PayFast. Track your booking status.' },
              { icon: <Star size={28} />, title: 'Rate & Review', desc: 'After the job is done, leave a review to help the community find great service.' },
            ].map((step, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)', border: '1px solid var(--border)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)', color: 'var(--primary)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-sm)' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="section-title" style={{ marginBottom: 'var(--space-xl)' }}>Trusted by the <span className="accent">Community</span></h2>
          <div className="stats-grid" style={{ maxWidth: 800, margin: '0 auto' }}>
            {[
              { value: '500+', label: 'Service Providers', icon: <Users size={24} /> },
              { value: '2,000+', label: 'Happy Customers', icon: <TrendingUp size={24} /> },
              { value: '5,000+', label: 'Jobs Completed', icon: <Briefcase size={24} /> },
              { value: '4.8', label: 'Average Rating', icon: <Star size={24} /> },
            ].map((stat, i) => (
              <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
                <div className={`stat-icon ${['orange', 'cyan', 'purple', 'green'][i]}`} style={{ margin: '0 auto var(--space-sm)' }}>
                  {stat.icon}
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>Ready to get started?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto var(--space-xl)', fontSize: '1.05rem' }}>
            Whether you're looking for work or need a service done, Kasi Market connects you with your community.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">Join Kasi Market</Link>
            <Link to="/browse" className="btn btn-secondary btn-lg">Browse Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
