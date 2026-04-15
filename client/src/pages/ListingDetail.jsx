import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Eye, Shield, MessageSquare, Calendar, ArrowLeft, DollarSign, Heart } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    api.getListing(id).then(data => { setListing(data); setLoading(false); }).catch(() => setLoading(false));
    if (user) api.checkFavorite(id).then(d => setIsSaved(d.saved)).catch(() => {});
  }, [id, user]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!listing) return <div className="empty-state"><h3>Listing not found</h3><Link to="/browse" className="btn btn-primary">Browse Services</Link></div>;

  const formatPrice = () => {
    if (!listing.price_amount) return 'Quote on Request';
    const p = listing.price_type === 'starting_from' ? 'From ' : '';
    const s = listing.price_type === 'hourly' ? '/hr' : '';
    return `${p}R${listing.price_amount.toLocaleString()}${s}`;
  };

  const priceLabel = listing.price_type === 'fixed' ? 'Fixed Price' : listing.price_type === 'starting_from' ? 'Starting From' : listing.price_type === 'hourly' ? 'Hourly Rate' : 'Quote on Request';

  const handleContact = async () => {
    if (!user) return navigate('/login');
    try {
      await api.sendMessage({ receiver_id: listing.provider_id, content: `Hi! I'm interested in your service: "${listing.title}"`, listing_id: listing.id });
      navigate('/messages');
    } catch (err) { alert(err.message); }
  };

  const handleBookNow = async () => {
    if (!user) return navigate('/login');
    try {
      const booking = await api.createBooking({ listing_id: listing.id });
      navigate(`/booking/${booking.id}`);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="detail-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost"><ArrowLeft size={16} /> Back</button>
        {user && (
          <button className="btn btn-ghost" onClick={async () => {
            try {
              if (isSaved) { await api.removeFavorite(id); setIsSaved(false); }
              else { await api.saveFavorite(id); setIsSaved(true); }
            } catch {}
          }} style={{ color: isSaved ? 'var(--error)' : 'var(--text-muted)' }}>
            <Heart size={18} style={isSaved ? { fill: 'var(--error)' } : {}} /> {isSaved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
      <div className="detail-grid">
        <div>
          {/* Images */}
          <div className="detail-images">
            {listing.images?.length > 0 ? (
              <img src={listing.images[activeImg]} alt={listing.title} />
            ) : (
              <div className="no-image">🔧</div>
            )}
          </div>
          {listing.images?.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {listing.images.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setActiveImg(i)}
                  style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: i === activeImg ? '2px solid var(--primary)' : '2px solid transparent', opacity: i === activeImg ? 1 : 0.6 }} />
              ))}
            </div>
          )}

          {/* Info */}
          <div className="detail-info">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {listing.category_name && <Link to={`/browse/${listing.category_slug}`} style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 500 }}>{listing.category_name}</Link>}
              {listing.subcategory_name && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>› {listing.subcategory_name}</span>}
            </div>
            <h1 className="detail-title">{listing.title}</h1>
            <div className="detail-meta">
              <span><MapPin size={16} /> {listing.location || 'Local'}</span>
              {listing.service_area && <span>Serving: {listing.service_area}</span>}
              <span><Eye size={16} /> {listing.views_count} views</span>
              <span><Clock size={16} /> {new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
            <div className="detail-description">
              <h3>Description</h3>
              <p>{listing.description}</p>
            </div>
            {listing.availability && (
              <div className="detail-description">
                <h3>Availability</h3>
                <p><Calendar size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> {listing.availability}</p>
              </div>
            )}
            {listing.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-xl)' }}>
                {listing.tags.map((tag, i) => <span key={i} className="category-pill" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>{tag}</span>)}
              </div>
            )}

            {/* Reviews */}
            {listing.reviews?.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Reviews ({listing.reviews.length})</h3>
                {listing.reviews.map(r => (
                  <div key={r.id} className="review-card">
                    <div className="review-header">
                      <div className="review-avatar">{r.reviewer_name?.[0]}</div>
                      <div>
                        <div className="review-name">{r.reviewer_name}</div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(s => <Star key={s} size={14} className={`star ${s <= r.overall_rating ? 'filled' : ''}`} />)}
                        </div>
                      </div>
                      <span className="review-date" style={{ marginLeft: 'auto' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="review-comment">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Provider Sidebar */}
        <div>
          <div className="provider-card">
            <div className="price-display">
              <div className="price-label">{priceLabel}</div>
              <div className="price-value">{formatPrice()}</div>
            </div>
            <div className="provider-card-header">
              <div className="provider-card-avatar">
                {listing.provider_avatar ? <img src={listing.provider_avatar} alt="" /> : listing.provider_name?.[0]}
              </div>
              <div>
                <div className="provider-card-name">{listing.provider_name}</div>
                {listing.business_name && <div className="provider-card-business">{listing.business_name}</div>}
                {listing.provider_verified ? <span className="verified-badge"><Shield size={12} /> Verified</span> : null}
              </div>
            </div>
            {listing.provider_rating > 0 && (
              <div className="provider-card-rating" style={{ marginBottom: 'var(--space-md)' }}>
                <Star size={16} /> {listing.provider_rating} ({listing.provider_reviews} reviews)
              </div>
            )}
            <div className="provider-card-stats">
              <div className="provider-stat"><div className="stat-value">{listing.total_jobs || 0}</div><div className="stat-label">Jobs Done</div></div>
              <div className="provider-stat"><div className="stat-value">{listing.years_experience || 0}</div><div className="stat-label">Years Exp.</div></div>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleBookNow} style={{ marginBottom: 8 }}>
              <DollarSign size={18} /> Book Now {listing.price_amount ? `— R${listing.price_amount.toLocaleString()}` : ''}
            </button>
            <button className="btn btn-secondary btn-block" onClick={handleContact} style={{ marginBottom: 8 }}>
              <MessageSquare size={18} /> Contact Provider
            </button>
            <Link to={`/provider/${listing.provider_id}`} className="btn btn-ghost btn-block">View Full Profile</Link>
          </div>

          {/* Related listings */}
          {listing.relatedListings?.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>More from this provider</h4>
              {listing.relatedListings.map(rl => (
                <Link key={rl.id} to={`/listing/${rl.id}`} className="card" style={{ display: 'block', padding: 'var(--space-sm)', marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rl.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{rl.price_amount ? `R${rl.price_amount}` : 'Get quote'}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
