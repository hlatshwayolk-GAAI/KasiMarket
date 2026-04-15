import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Clock, Shield, Briefcase, Calendar, MessageSquare } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ProviderProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [listData, revData] = await Promise.all([
          api.getListings({ provider_id: id, status: 'published', limit: 20 }),
          api.getProviderReviews(id),
        ]);
        setListings(listData.listings || []);
        setReviews(revData);
        // Get provider info from first listing or separate call
        if (listData.listings?.[0]) {
          setProfile({
            name: listData.listings[0].provider_name,
            business: listData.listings[0].business_name,
            avatar: listData.listings[0].provider_avatar,
            rating: listData.listings[0].provider_rating,
            reviews_count: listData.listings[0].provider_reviews,
            verified: listData.listings[0].provider_verified,
          });
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: 900 }}>
      {/* Profile header */}
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="provider-card-avatar" style={{ width: 80, height: 80, fontSize: '1.8rem' }}>
            {profile?.avatar ? <img src={profile.avatar} alt="" /> : profile?.name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{profile?.name || 'Service Provider'}</h1>
            {profile?.business && <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{profile.business}</div>}
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
              {profile?.rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warning)', fontWeight: 600 }}>
                  <Star size={16} /> {profile.rating} ({profile.reviews_count} reviews)
                </span>
              )}
              {profile?.verified ? <span className="verified-badge"><Shield size={12} /> Verified</span> : null}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}><Briefcase size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {listings.length} services</span>
            </div>
          </div>
          {user && user.id !== id && (
            <Link to="/messages" className="btn btn-primary"><MessageSquare size={16} /> Message</Link>
          )}
        </div>
      </div>

      {/* Listings */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-md)' }}>Services ({listings.length})</h2>
      {listings.length === 0 ? (
        <div className="empty-state"><h3>No services listed yet</h3></div>
      ) : (
        <div className="listing-grid" style={{ marginBottom: 'var(--space-xl)' }}>
          {listings.map(l => (
            <Link key={l.id} to={`/listing/${l.id}`} className="listing-card card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-image-container">
                {l.images?.length > 0 ? <img src={l.images[0]} alt={l.title} /> : <div className="card-image-placeholder">🔧</div>}
                <span className="price-badge">{l.price_amount ? `R${l.price_amount}` : 'Quote'}</span>
              </div>
              <div className="card-body">
                <div className="card-category">{l.category_name}</div>
                <h3 className="card-title">{l.title}</h3>
                <div className="card-location"><MapPin size={14} /> {l.location || 'Local'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Reviews */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-md)' }}>Reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <div className="empty-state"><h3>No reviews yet</h3></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {reviews.map(r => (
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
  );
}
