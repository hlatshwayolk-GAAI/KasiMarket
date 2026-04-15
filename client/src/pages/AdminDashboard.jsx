import { useState, useEffect } from 'react';
import { Users, Briefcase, FileText, DollarSign, Shield, Eye, Ban, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [userPag, setUserPag] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats().then(setStats).catch(() => {});
    api.getAdminUsers().then(d => { setUsers(d.users); setUserPag(d.pagination); }).catch(() => {});
    api.getAdminListings().then(d => setListings(d.listings)).catch(() => {});
    api.getAdminRequests().then(d => setRequests(d.requests)).catch(() => {});
    setLoading(false);
  }, []);

  const toggleUser = async (id) => {
    await api.toggleUserActive(id);
    const d = await api.getAdminUsers();
    setUsers(d.users);
  };

  const updateStatus = async (id, status) => {
    await api.updateListingStatus(id, status);
    const d = await api.getAdminListings();
    setListings(d.listings);
  };

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div className="dashboard-header">
        <h1><Shield size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Admin Dashboard</h1>
        <p>Manage users, listings, requests, and payments</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {[
            { label: 'Total Users', value: stats.users, icon: <Users size={20} />, cls: 'orange' },
            { label: 'Providers', value: stats.providers, icon: <Briefcase size={20} />, cls: 'cyan' },
            { label: 'Customers', value: stats.customers, icon: <Users size={20} />, cls: 'purple' },
            { label: 'Listings', value: stats.listings, icon: <FileText size={20} />, cls: 'green' },
            { label: 'Requests', value: stats.requests, icon: <FileText size={20} />, cls: 'orange' },
            { label: 'Bookings', value: stats.bookings, icon: <Briefcase size={20} />, cls: 'cyan' },
            { label: 'Completed', value: stats.completedBookings, icon: <CheckCircle size={20} />, cls: 'green' },
            { label: 'Revenue', value: `R${stats.totalRevenue?.toLocaleString() || 0}`, icon: <DollarSign size={20} />, cls: 'purple' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}>Listings</button>
        <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>Requests</button>
      </div>

      {tab === 'overview' && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
          <h3>Welcome to the Admin Panel</h3>
          <p>Use the tabs above to manage users, listings, and requests.</p>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><span className={`status-badge status-${u.role === 'admin' ? 'published' : 'pending'}`}>{u.role}</span></td>
                  <td><span className={`status-badge ${u.is_active ? 'status-published' : 'status-rejected'}`}>{u.is_active ? 'Active' : 'Suspended'}</span></td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleUser(u.id)}>
                        {u.is_active ? <><Ban size={12} /> Suspend</> : <><CheckCircle size={12} /> Activate</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'listings' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Provider</th><th>Category</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.title}</td>
                  <td>{l.provider_name}</td>
                  <td>{l.category_name}</td>
                  <td><span className={`status-badge status-${l.status}`}>{l.status}</span></td>
                  <td>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-success" onClick={() => updateStatus(l.id, 'published')} title="Approve"><CheckCircle size={12} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => updateStatus(l.id, 'rejected')} title="Reject"><Ban size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'requests' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Customer</th><th>Category</th><th>Budget</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.category_name}</td>
                  <td>R{r.budget_min}-R{r.budget_max}</td>
                  <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
