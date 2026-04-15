import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, Shield, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFavorites().then(data => setFavorites(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (listingId) => {
    try {
      await api.removeFavorite(listingId);
      setFavorites(f => f.filter(x => x.id !== listingId));
    } catch {}
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div className="dashboard-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Heart size={28} style={{ color: 'var(--error)' }} /> Saved Services
        </h1>
        <p>Your bookmarked services for quick access</p>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💝</div>
          <h3>No saved services yet</h3>
          <p>Browse services and click the heart icon to save them here for quick access.</p>
          <Link to="/browse" className="btn btn-primary">Browse Services</Link>
        </div>
      ) : (
        <div className="listing-grid">
          {favorites.map(f => (
            <div key={f.favorite_id} className="card listing-card" style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(f.id); }}
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title="Remove from saved"
              >
                <Heart size={18} style={{ color: 'var(--error)', fill: 'var(--error)' }} />
              </button>

              <Link to={`/listing/${f.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card-image-container">
                  {f.images?.length > 0 ? (
                    <img src={f.images[0]} alt={f.title} />
                  ) : (
                    <div className="card-image-placeholder">
                      {f.category_icon || '🔧'}
                    </div>
                  )}
                  <div className="price-badge">
                    {f.price_amount ? (f.price_type === 'starting_from' ? `From R${f.price_amount}` : `R${f.price_amount}`) : 'Get Quote'}
                  </div>
                </div>
                <div className="card-body">
                  {f.category_name && <div className="card-category">{f.category_name}</div>}
                  <h3 className="card-title">{f.title}</h3>
                  <div className="card-location"><MapPin size={14} /> {f.location || 'Local'}</div>
                  <div className="card-provider">
                    <div className="provider-avatar">
                      {f.provider_avatar ? <img src={f.provider_avatar} alt="" /> : f.provider_name?.[0]}
                    </div>
                    <span className="provider-name">
                      {f.business_name || f.provider_name}
                      {f.provider_verified ? <Shield size={10} style={{ color: 'var(--success)', marginLeft: 4 }} /> : null}
                    </span>
                    {f.provider_rating > 0 && (
                      <span className="provider-rating"><Star size={12} /> {f.provider_rating}</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
