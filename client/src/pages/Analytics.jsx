import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Eye, Star, Briefcase, Users, MessageSquare, CheckCircle, Clock, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getProviderAnalytics({ period }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Analytics unavailable</h3></div>;

  const o = data.overview;
  const conversionRate = data.quoteStats?.total > 0 ? ((data.quoteStats.accepted / data.quoteStats.total) * 100).toFixed(1) : 0;

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <BarChart3 size={28} style={{ color: 'var(--primary)' }} /> Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Track your performance and earnings</p>
        </div>
        <select className="form-select" style={{ width: 'auto', padding: '8px 16px' }} value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {[
          { icon: <DollarSign size={20} />, value: `R${(o.total_earnings || 0).toLocaleString()}`, label: 'Total Earnings', cls: 'orange' },
          { icon: <Briefcase size={20} />, value: o.completed_bookings || 0, label: 'Jobs Completed', cls: 'green' },
          { icon: <Eye size={20} />, value: (o.total_views || 0).toLocaleString(), label: 'Total Views', cls: 'cyan' },
          { icon: <Star size={20} />, value: (o.avg_rating || 0).toFixed(1), label: `Avg Rating (${o.total_reviews || 0})`, cls: 'orange' },
          { icon: <MessageSquare size={20} />, value: o.total_quotes || 0, label: 'Quotes Sent', cls: 'purple' },
          { icon: <CheckCircle size={20} />, value: `${conversionRate}%`, label: 'Quote Win Rate', cls: 'green' },
          { icon: <Clock size={20} />, value: o.pending_bookings || 0, label: 'Pending', cls: 'orange' },
          { icon: <TrendingUp size={20} />, value: o.active_listings || 0, label: 'Active Listings', cls: 'cyan' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Earnings Chart - Simple bar visualization */}
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>Earnings Over Time</h3>
          {data.earnings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No earnings data yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
              {data.earnings.map((e, i) => {
                const maxAmt = Math.max(...data.earnings.map(x => x.amount));
                const height = maxAmt > 0 ? (e.amount / maxAmt) * 160 : 0;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>R{e.amount.toLocaleString()}</span>
                    <div style={{
                      width: '100%', height: Math.max(height, 4),
                      background: 'var(--gradient-primary)', borderRadius: 'var(--radius-sm)',
                      transition: 'height 0.5s ease',
                    }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>W{e.week?.split('-')[1]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rating Breakdown */}
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>Rating Breakdown</h3>
          {data.ratingBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No reviews yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[5, 4, 3, 2, 1].map(stars => {
                const entry = data.ratingBreakdown.find(r => r.rating === stars);
                const count = entry?.count || 0;
                const total = data.ratingBreakdown.reduce((s, r) => s + r.count, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ width: 24, fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)' }}>{stars}★</span>
                    <div style={{ flex: 1, height: 10, background: 'var(--bg-surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--warning)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ width: 40, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quote Stats */}
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>Quote Performance</h3>
          {data.quoteStats?.total === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No quotes yet</div>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              {[
                { label: 'Accepted', value: data.quoteStats?.accepted || 0, color: 'var(--success)' },
                { label: 'Pending', value: data.quoteStats?.pending || 0, color: 'var(--warning)' },
                { label: 'Rejected', value: data.quoteStats?.rejected || 0, color: 'var(--error)' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto var(--space-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${s.color}15`, border: `2px solid ${s.color}`,
                    fontSize: '1.3rem', fontWeight: 800, color: s.color,
                  }}>{s.value}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Listings */}
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>Top Performing Listings</h3>
          {data.topListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
              <p>No listings yet</p>
              <Link to="/create-listing" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Create Listing</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.topListings.map((l, i) => (
                <Link key={l.id} to={`/listing/${l.id}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '8px', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {l.booking_count} bookings • {l.views_count} views • R{(l.revenue || 0).toLocaleString()}
                    </div>
                  </div>
                  <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)' }}>Recent Booking Activity</h3>
        {data.recentBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No recent activity</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ border: 'none' }}>
              <thead>
                <tr><th>Service</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {data.recentBookings.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/booking/${b.id}`} style={{ fontWeight: 600 }}>{b.listing_title || b.request_title || 'Service'}</Link></td>
                    <td>{b.customer_name}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>R{(b.total_amount || 0).toLocaleString()}</td>
                    <td><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
