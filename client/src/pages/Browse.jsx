import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Star, SlidersHorizontal, Grid3X3, List, ChevronDown } from 'lucide-react';
import { api } from '../utils/api';

export default function Browse() {
  const { category: catSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') || 'listings');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    category: catSlug || searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
    sort: searchParams.get('sort') || 'newest',
    search: searchParams.get('search') || '',
    page: 1,
  });

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);

  useEffect(() => {
    if (catSlug) setFilters(f => ({ ...f, category: catSlug, page: 1 }));
  }, [catSlug]);

  useEffect(() => {
    setLoading(true);
    const params = { ...filters };
    Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

    if (tab === 'listings') {
      api.getListings(params).then(data => {
        setListings(data.listings);
        setPagination(data.pagination);
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      api.getRequests(params).then(data => {
        setRequests(data.requests);
        setPagination(data.pagination);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [filters, tab]);

  const formatPrice = (l) => {
    if (!l.price_amount) return 'Get Quote';
    const p = l.price_type === 'starting_from' ? 'From ' : '';
    const s = l.price_type === 'hourly' ? '/hr' : '';
    return `${p}R${l.price_amount.toLocaleString()}${s}`;
  };

  const activeCat = categories.find(c => c.slug === filters.category);

  return (
    <div className="fade-in">
      <div className="page-with-sidebar">
        {/* Sidebar */}
        <button className="mobile-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <SlidersHorizontal size={18} /> {sidebarOpen ? 'Hide' : 'Show'} Filters & Categories
        </button>

        <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          {/* Categories */}
          <div className="sidebar-section">
            <div className="sidebar-title">Categories</div>
            <button className={`sidebar-item ${!filters.category ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, category: '', page: 1 }))}>
              All Categories
            </button>
            {categories.map(cat => (
              <div key={cat.id}>
                <button className={`sidebar-item ${filters.category === cat.slug ? 'active' : ''}`}
                  onClick={() => {
                    setFilters(f => ({ ...f, category: cat.slug, page: 1 }));
                    setExpandedCat(expandedCat === cat.id ? null : cat.id);
                  }}>
                  <span>{cat.icon}</span> {cat.name}
                  {cat.listing_count > 0 && <span className="count">{cat.listing_count}</span>}
                  {cat.subcategories?.length > 0 && <ChevronDown size={14} style={{ marginLeft: 'auto', transform: expandedCat === cat.id ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />}
                </button>
                {expandedCat === cat.id && cat.subcategories?.map(sub => (
                  <button key={sub.id} className={`sidebar-item ${filters.category === sub.slug ? 'active' : ''}`}
                    style={{ paddingLeft: 40, fontSize: '0.82rem' }}
                    onClick={() => setFilters(f => ({ ...f, category: sub.slug, page: 1 }))}>
                    {sub.name}
                    {sub.listing_count > 0 && <span className="count">{sub.listing_count}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="sidebar-section">
            <div className="sidebar-title">Filters</div>
            <div className="filter-group">
              <label className="filter-label">Location</label>
              <input type="text" className="form-input" placeholder="e.g. Soweto" value={filters.location}
                onChange={e => setFilters(f => ({ ...f, location: e.target.value, page: 1 }))} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Price Range</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" className="form-input" placeholder="Min" value={filters.price_min}
                  onChange={e => setFilters(f => ({ ...f, price_min: e.target.value, page: 1 }))} />
                <input type="number" className="form-input" placeholder="Max" value={filters.price_max}
                  onChange={e => setFilters(f => ({ ...f, price_max: e.target.value, page: 1 }))} />
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">Sort By</label>
              <select className="form-select" value={filters.sort}
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Best Rated</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
            <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }}
              onClick={() => setFilters({ category: '', location: '', price_min: '', price_max: '', sort: 'newest', search: '', page: 1 })}>
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>
              {activeCat ? activeCat.name : filters.search ? `Results for "${filters.search}"` : 'Browse All Services'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {pagination.total || 0} results found
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}>
              Service Listings
            </button>
            <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
              Job Requests
            </button>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : tab === 'listings' ? (
            <>
              {listings.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <h3>No listings found</h3>
                  <p>Try adjusting your filters or search in a different category.</p>
                  <Link to="/create-listing" className="btn btn-primary">Post a Service</Link>
                </div>
              ) : (
                <div className="listing-grid">
                  {listings.map(listing => (
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
                          <div className="provider-avatar">{listing.provider_name?.[0]}</div>
                          <span className="provider-name">{listing.business_name || listing.provider_name}</span>
                          {listing.provider_rating > 0 && (
                            <span className="provider-rating"><Star size={14} /> {listing.provider_rating}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {requests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>No job requests found</h3>
                  <p>Check back later or post your own request.</p>
                  <Link to="/create-request" className="btn btn-primary">Post a Request</Link>
                </div>
              ) : (
                <div className="request-grid">
                  {requests.map(req => (
                    <Link key={req.id} to={`/request/${req.id}`} className="request-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="request-header">
                        <h3 className="request-title">{req.title}</h3>
                        <span className={`urgency-badge urgency-${req.urgency}`}>{req.urgency}</span>
                      </div>
                      <p className="request-desc">{req.description}</p>
                      <div className="request-meta">
                        {(req.budget_min || req.budget_max) && (
                          <span className="request-budget">💰 R{req.budget_min?.toLocaleString()} - R{req.budget_max?.toLocaleString()}</span>
                        )}
                        <span><MapPin size={14} /> {req.location || 'Local'}</span>
                        {req.category_name && <span>{req.category_name}</span>}
                        <span className="quote-count">💬 {req.quote_count || 0} quotes</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹</button>
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={filters.page === p ? 'active' : ''} onClick={() => setFilters(f => ({ ...f, page: p }))}>{p}</button>
              ))}
              <button disabled={filters.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
