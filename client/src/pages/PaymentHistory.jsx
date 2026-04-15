import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, FileText, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../utils/api';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    api.getPaymentHistory().then(data => {
      setPayments(data.payments);
      setPagination(data.pagination);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="container fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: 800 }}>
      <div className="dashboard-header">
        <h1>Payment History</h1>
        <p>View all your transactions and receipts</p>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-icon orange"><DollarSign size={20} /></div>
          <div className="stat-value">R{totalPaid.toLocaleString()}</div>
          <div className="stat-label">Total Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FileText size={20} /></div>
          <div className="stat-value">{payments.filter(p => p.status === 'paid').length}</div>
          <div className="stat-label">Successful</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><Calendar size={20} /></div>
          <div className="stat-value">{payments.length}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
      </div>

      {/* Transactions */}
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <h3>No payments yet</h3>
          <p>Your payment history will appear here after your first transaction.</p>
          <Link to="/browse" className="btn btn-primary">Browse Services</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {payments.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--space-md) var(--space-lg)',
              borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: p.status === 'paid' ? 'var(--success-bg)' : p.status === 'failed' ? 'var(--error-bg)' : 'var(--warning-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <DollarSign size={18} style={{ color: p.status === 'paid' ? 'var(--success)' : p.status === 'failed' ? 'var(--error)' : 'var(--warning)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.listing_title || p.request_title || 'Service Payment'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {p.provider_name} • {new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>R{p.amount.toLocaleString()}</div>
                  <span className={`status-badge status-${p.status}`}>{p.status}</span>
                </div>
                <Link to={`/booking/${p.booking_id}`} className="btn btn-ghost btn-icon btn-sm"><ArrowRight size={16} /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
