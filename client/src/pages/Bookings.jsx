import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, DollarSign, CheckCircle, XCircle, AlertTriangle, ArrowRight, Briefcase } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Bookings() {
  const { user, isProvider } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewAs, setViewAs] = useState('all');

  useEffect(() => {
    loadBookings();
    api.getBookingStats().then(setStats).catch(() => {});
  }, [filter, viewAs]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (viewAs !== 'all') params.role = viewAs;
      const data = await api.getBookings(params);
      setBookings(data.bookings);
    } catch {}
    setLoading(false);
  };

  const statusConfig = {
    pending: { icon: <Clock size={16} />, color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Pending' },
    confirmed: { icon: <CheckCircle size={16} />, color: 'var(--info)', bg: 'rgba(59,130,246,0.1)', label: 'Confirmed' },
    in_progress: { icon: <Briefcase size={16} />, color: 'var(--secondary)', bg: 'rgba(6,182,212,0.1)', label: 'In Progress' },
    completed: { icon: <CheckCircle size={16} />, color: 'var(--success)', bg: 'var(--success-bg)', label: 'Completed' },
    cancelled: { icon: <XCircle size={16} />, color: 'var(--error)', bg: 'var(--error-bg)', label: 'Cancelled' },
    disputed: { icon: <AlertTriangle size={16} />, color: 'var(--error)', bg: 'var(--error-bg)', label: 'Disputed' },
  };

  const paymentStatusConfig = {
    pending: { color: 'var(--warning)', label: 'Unpaid' },
    paid: { color: 'var(--success)', label: 'Paid' },
    failed: { color: 'var(--error)', label: 'Failed' },
    refunded: { color: 'var(--info)', label: 'Refunded' },
  };

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div className="dashboard-header">
        <h1>My Bookings</h1>
        <p>Manage and track all your service bookings</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="stat-card">
            <div className="stat-icon orange"><Calendar size={20} /></div>
            <div className="stat-value">{(stats.asCustomer?.total || 0) + (stats.asProvider?.total || 0)}</div>
            <div className="stat-label">Total Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan"><Clock size={20} /></div>
            <div className="stat-value">{(stats.asCustomer?.pending || 0) + (stats.asProvider?.pending || 0)}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={20} /></div>
            <div className="stat-value">{(stats.asCustomer?.completed || 0) + (stats.asProvider?.completed || 0)}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><DollarSign size={20} /></div>
            <div className="stat-value">R{((stats.asCustomer?.total_spent || 0) + (stats.asProvider?.total_earned || 0)).toLocaleString()}</div>
            <div className="stat-label">{isProvider ? 'Total Earned' : 'Total Spent'}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
        {isProvider && (
          <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }} value={viewAs} onChange={e => setViewAs(e.target.value)}>
            <option value="all">All Bookings</option>
            <option value="customer">As Customer</option>
            <option value="provider">As Provider</option>
          </select>
        )}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No bookings found</h3>
          <p>Your bookings will appear here when you book a service or accept a quote.</p>
          <Link to="/browse" className="btn btn-primary">Browse Services</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          {bookings.map(b => {
            const sc = statusConfig[b.status] || statusConfig.pending;
            const psc = paymentStatusConfig[b.payment_status] || paymentStatusConfig.pending;
            const isMyProvider = b.provider_id === user?.id;

            return (
              <Link key={b.id} to={`/booking/${b.id}`} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.icon} {sc.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, background: psc.color === 'var(--success)' ? 'var(--success-bg)' : 'var(--warning-bg)', color: psc.color }}>
                      <DollarSign size={12} /> {psc.label}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{b.id.substring(0, 8)}</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
                    {b.listing_title || b.request_title || 'Service Booking'}
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>{isMyProvider ? `Customer: ${b.customer_name}` : `Provider: ${b.business_name || b.provider_name}`}</span>
                    {b.scheduled_date && <span><Calendar size={14} /> {new Date(b.scheduled_date).toLocaleDateString()}</span>}
                    <span><Clock size={14} /> {new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                    R{(b.total_amount || 0).toLocaleString()}
                  </div>
                  {b.paid_amount > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--success)' }}>R{b.paid_amount.toLocaleString()} paid</div>}
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginTop: 4 }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
