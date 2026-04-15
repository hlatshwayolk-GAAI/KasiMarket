import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Shield, Calendar, ArrowLeft, Send } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function RequestDetail() {
  const { id } = useParams();
  const { user, isProvider } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quoteForm, setQuoteForm] = useState({ amount: '', message: '', proposed_date: '', estimated_duration: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getRequest(id).then(data => { setRequest(data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setSubmitting(true);
    try {
      await api.createQuote({ request_id: id, ...quoteForm });
      const data = await api.getRequest(id);
      setRequest(data);
      setQuoteForm({ amount: '', message: '', proposed_date: '', estimated_duration: '' });
      alert('Quote submitted successfully!');
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await api.acceptQuote(quoteId);
      const data = await api.getRequest(id);
      setRequest(data);
      alert('Quote accepted! Booking created.');
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!request) return <div className="empty-state"><h3>Request not found</h3></div>;

  const isOwner = user?.id === request.customer_id;
  const hasQuoted = request.quotes?.some(q => q.provider_id === user?.id);

  return (
    <div className="detail-page fade-in">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)' }}><ArrowLeft size={16} /> Back</button>
      <div className="detail-grid">
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {request.category_name && <span style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 500 }}>{request.category_name}</span>}
            <span className={`urgency-badge urgency-${request.urgency}`}>{request.urgency}</span>
            <span className={`status-badge status-${request.status}`}>{request.status}</span>
          </div>
          <h1 className="detail-title">{request.title}</h1>
          <div className="detail-meta">
            <span><MapPin size={16} /> {request.location || 'Local'}</span>
            {request.preferred_date && <span><Calendar size={16} /> {new Date(request.preferred_date).toLocaleDateString()}</span>}
            <span><Clock size={16} /> Posted {new Date(request.created_at).toLocaleDateString()}</span>
          </div>
          {(request.budget_min || request.budget_max) && (
            <div style={{ padding: 'var(--space-md)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', display: 'inline-flex', gap: 8, color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem' }}>
              💰 Budget: R{request.budget_min?.toLocaleString() || '0'} - R{request.budget_max?.toLocaleString() || '∞'}
            </div>
          )}
          <div className="detail-description">
            <h3>Description</h3>
            <p>{request.description}</p>
          </div>

          {/* Quotes */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Quotes ({request.quotes?.length || 0})</h3>
            {request.quotes?.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                <p>No quotes yet. {isProvider ? 'Be the first to submit a quote!' : 'Waiting for providers to respond.'}</p>
              </div>
            ) : (
              request.quotes.map(q => (
                <div key={q.id} className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div className="provider-avatar" style={{ width: 36, height: 36 }}>{q.provider_name?.[0]}</div>
                      <div>
                        <Link to={`/provider/${q.provider_id}`} style={{ fontWeight: 600 }}>{q.business_name || q.provider_name}</Link>
                        {q.is_verified ? <span className="verified-badge" style={{ marginLeft: 6 }}><Shield size={10} /> Verified</span> : null}
                        {q.avg_rating > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--warning)' }}><Star size={12} style={{ display: 'inline' }} /> {q.avg_rating} ({q.total_reviews} reviews)</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>R{q.amount.toLocaleString()}</div>
                      <span className={`status-badge status-${q.status}`}>{q.status}</span>
                    </div>
                  </div>
                  {q.message && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{q.message}</p>}
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {q.proposed_date && <span><Calendar size={14} /> {new Date(q.proposed_date).toLocaleDateString()}</span>}
                    {q.estimated_duration && <span><Clock size={14} /> {q.estimated_duration}</span>}
                  </div>
                  {isOwner && q.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-sm)' }}>
                      <button className="btn btn-success btn-sm" onClick={() => handleAcceptQuote(q.id)}>Accept Quote</button>
                      <button className="btn btn-ghost btn-sm" onClick={async () => { await api.rejectQuote(q.id); const d = await api.getRequest(id); setRequest(d); }}>Reject</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="provider-card">
            <div className="provider-card-header">
              <div className="provider-card-avatar">{request.customer_name?.[0]}</div>
              <div>
                <div className="provider-card-name">{request.customer_name}</div>
                <div className="provider-card-business">Customer</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {request.customer_location || request.location}
            </div>

            {/* Submit quote form */}
            {isProvider && !isOwner && !hasQuoted && request.status === 'open' && (
              <form onSubmit={handleSubmitQuote}>
                <h4 style={{ marginBottom: 'var(--space-sm)' }}>Submit Your Quote</h4>
                <div className="form-group">
                  <label className="form-label">Your Price (R)</label>
                  <input type="number" className="form-input" placeholder="Amount" value={quoteForm.amount} onChange={e => setQuoteForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-textarea" placeholder="Explain your quote..." value={quoteForm.message} onChange={e => setQuoteForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Proposed Date</label>
                  <input type="date" className="form-input" value={quoteForm.proposed_date} onChange={e => setQuoteForm(f => ({ ...f, proposed_date: e.target.value }))} />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Quote'}
                </button>
              </form>
            )}
            {hasQuoted && <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600, padding: 'var(--space-md)' }}>✅ You've already quoted</div>}
            {!user && <Link to="/login" className="btn btn-primary btn-block">Sign in to Submit Quote</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
