import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, MessageSquare, Star, MapPin, Plus, Eye, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, isProvider } = useAuth();
  const [tab, setTab] = useState('listings');
  const [myListings, setMyListings] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myQuotes, setMyQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [listData, reqData] = await Promise.all([
          isProvider ? api.getListings({ provider_id: user.id, status: 'published', limit: 50 }) : Promise.resolve({ listings: [] }),
          api.getRequests({ customer_id: user.id, status: 'open', limit: 50 }),
        ]);
        setMyListings(listData.listings || []);
        setMyRequests(reqData.requests || []);
        if (isProvider) {
          const quotes = await api.getMyQuotes();
          setMyQuotes(quotes);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [user, isProvider]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div className="dashboard-header">
        <h1>Welcome, {user?.full_name?.split(' ')[0]}!</h1>
        <p>Manage your listings, requests, and activity</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><Briefcase size={20} /></div>
          <div className="stat-value">{myListings.length}</div>
          <div className="stat-label">My Listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><FileText size={20} /></div>
          <div className="stat-value">{myRequests.length}</div>
          <div className="stat-label">My Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><MessageSquare size={20} /></div>
          <div className="stat-value">{myQuotes.length}</div>
          <div className="stat-label">My Quotes</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
        <Link to="/create-listing" className="btn btn-primary"><Plus size={16} /> Post a Service</Link>
        <Link to="/create-request" className="btn btn-secondary"><Plus size={16} /> Post a Request</Link>
        <Link to="/browse" className="btn btn-ghost">Browse Services</Link>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}>My Listings</button>
        <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>My Requests</button>
        {isProvider && <button className={`tab ${tab === 'quotes' ? 'active' : ''}`} onClick={() => setTab('quotes')}>My Quotes</button>}
      </div>

      {/* My Listings */}
      {tab === 'listings' && (
        myListings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No listings yet</h3>
            <p>Create your first service listing to start getting customers.</p>
            <Link to="/create-listing" className="btn btn-primary">Create Listing</Link>
          </div>
        ) : (
          <div className="listing-grid">
            {myListings.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} className="listing-card card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card-image-container">
                  {l.images?.length > 0 ? <img src={l.images[0]} alt={l.title} /> : <div className="card-image-placeholder">🔧</div>}
                  <span className="price-badge">{l.price_amount ? `R${l.price_amount}` : 'Quote'}</span>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{l.title}</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span><Eye size={14} /> {l.views_count || 0}</span>
                    <span className={`status-badge status-${l.status}`}>{l.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* My Requests */}
      {tab === 'requests' && (
        myRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No requests yet</h3>
            <p>Post a job request to let providers know what you need.</p>
            <Link to="/create-request" className="btn btn-primary">Post Request</Link>
          </div>
        ) : (
          <div className="request-grid">
            {myRequests.map(r => (
              <Link key={r.id} to={`/request/${r.id}`} className="request-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="request-header">
                  <h3 className="request-title">{r.title}</h3>
                  <span className={`urgency-badge urgency-${r.urgency}`}>{r.urgency}</span>
                </div>
                <div className="request-meta">
                  {r.budget_max && <span className="request-budget">💰 R{r.budget_min}-R{r.budget_max}</span>}
                  <span><MapPin size={14} /> {r.location}</span>
                  <span className="quote-count">💬 {r.quote_count || 0} quotes</span>
                  <span className={`status-badge status-${r.status}`}>{r.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* My Quotes */}
      {tab === 'quotes' && (
        myQuotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No quotes yet</h3>
            <p>Browse job requests and submit quotes to start winning work.</p>
            <Link to="/browse?tab=requests" className="btn btn-primary">Browse Requests</Link>
          </div>
        ) : (
          <div className="request-grid">
            {myQuotes.map(q => (
              <div key={q.id} className="card" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Link to={`/request/${q.request_id}`} style={{ fontWeight: 700 }}>{q.request_title}</Link>
                  <span className={`status-badge status-${q.status}`}>{q.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>R{q.amount.toLocaleString()}</span>
                  <span><MapPin size={14} /> {q.request_location}</span>
                  <span><Clock size={14} /> {new Date(q.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
