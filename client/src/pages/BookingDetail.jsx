import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Star, Shield, DollarSign, CheckCircle, XCircle, Play, MessageSquare, FileText, Printer } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ overall_rating: 5, quality: 5, communication: 5, punctuality: 5, value: 5, comment: '' });
  const [receipt, setReceipt] = useState(null);

  useEffect(() => { loadBooking(); }, [id]);

  const loadBooking = async () => {
    try {
      const data = await api.getBooking(id);
      setBooking(data);
    } catch { navigate('/bookings'); }
    setLoading(false);
  };

  const updateStatus = async (status) => {
    if (!confirm(`Are you sure you want to ${status === 'cancelled' ? 'cancel' : status} this booking?`)) return;
    try {
      await api.updateBookingStatus(id, status);
      await loadBooking();
    } catch (err) { alert(err.message); }
  };

  const handlePayment = async () => {
    try {
      const data = await api.createPayment({ booking_id: id, amount: booking.total_amount });
      navigate(`/payment/${data.payment_id}`, { state: { paymentData: data } });
    } catch (err) { alert(err.message); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await api.createReview({ booking_id: id, reviewee_id: booking.provider_id, ...reviewForm });
      setShowReview(false);
      await loadBooking();
      alert('Review submitted!');
    } catch (err) { alert(err.message); }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const data = await api.getReceipt(paymentId);
      setReceipt(data);
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!booking) return <div className="empty-state"><h3>Booking not found</h3></div>;

  const isCustomer = booking.customer_id === user?.id;
  const isProvider = booking.provider_id === user?.id;
  const hasReviewed = booking.reviews?.some(r => r.reviewer_id === user?.id);

  const statusSteps = ['pending', 'confirmed', 'in_progress', 'completed'];
  const currentStepIdx = statusSteps.indexOf(booking.status);
  const isCancelled = booking.status === 'cancelled' || booking.status === 'disputed';

  return (
    <div className="container fade-in" style={{ maxWidth: 900, padding: 'var(--space-xl) var(--space-lg)' }}>
      <button onClick={() => navigate('/bookings')} className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)' }}><ArrowLeft size={16} /> Back to Bookings</button>

      {/* Header */}
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span className={`status-badge status-${booking.status}`}>{booking.status.replace('_', ' ')}</span>
              <span className={`status-badge status-${booking.payment_status}`}>{booking.payment_status}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{booking.id.substring(0, 8)}</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{booking.listing_title || booking.request_title || 'Service Booking'}</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Booked on {new Date(booking.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>R{(booking.total_amount || 0).toLocaleString()}</div>
            {booking.paid_amount > 0 && <div style={{ fontSize: '0.88rem', color: 'var(--success)' }}>R{booking.paid_amount.toLocaleString()} paid</div>}
          </div>
        </div>

        {/* Progress bar */}
        {!isCancelled && (
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 14, left: '5%', right: '5%', height: 3, background: 'var(--bg-surface-3)', borderRadius: 2 }}>
                <div style={{ width: `${Math.max((currentStepIdx / (statusSteps.length - 1)) * 100, 0)}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
              {statusSteps.map((step, i) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1, flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i <= currentStepIdx ? 'var(--gradient-primary)' : 'var(--bg-surface-3)',
                    color: i <= currentStepIdx ? 'white' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700,
                    boxShadow: i === currentStepIdx ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {i < currentStepIdx ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: i <= currentStepIdx ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {step.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-lg)' }}>
        {/* Left - Details */}
        <div>
          {/* Service details */}
          {(booking.listing_description || booking.request_description) && (
            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Service Details</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {booking.listing_description || booking.request_description}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {booking.scheduled_date && <span><Calendar size={14} /> Scheduled: {new Date(booking.scheduled_date).toLocaleDateString()}</span>}
                {booking.completed_date && <span><CheckCircle size={14} /> Completed: {new Date(booking.completed_date).toLocaleDateString()}</span>}
                {booking.estimated_duration && <span><Clock size={14} /> Est. duration: {booking.estimated_duration}</span>}
              </div>
            </div>
          )}

          {/* Quote info */}
          {booking.quote_amount && (
            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Quote Details</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>R{booking.quote_amount.toLocaleString()}</div>
              </div>
              {booking.quote_message && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>{booking.quote_message}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)' }}>Actions</h3>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              {/* Provider actions */}
              {isProvider && booking.status === 'pending' && (
                <button className="btn btn-primary" onClick={() => updateStatus('confirmed')}><CheckCircle size={16} /> Confirm Booking</button>
              )}
              {isProvider && booking.status === 'confirmed' && (
                <button className="btn btn-primary" onClick={() => updateStatus('in_progress')}><Play size={16} /> Start Work</button>
              )}
              {isProvider && booking.status === 'in_progress' && (
                <button className="btn btn-success" onClick={() => updateStatus('completed')}><CheckCircle size={16} /> Mark Complete</button>
              )}

              {/* Customer actions */}
              {isCustomer && booking.payment_status !== 'paid' && booking.total_amount > 0 && booking.status !== 'cancelled' && (
                <button className="btn btn-primary" onClick={handlePayment}><DollarSign size={16} /> Pay Now — R{booking.total_amount.toLocaleString()}</button>
              )}
              {isCustomer && booking.status === 'completed' && !hasReviewed && (
                <button className="btn btn-secondary" onClick={() => setShowReview(true)}><Star size={16} /> Leave Review</button>
              )}

              {/* Shared actions */}
              {['pending', 'confirmed'].includes(booking.status) && (
                <button className="btn btn-danger" onClick={() => updateStatus('cancelled')}><XCircle size={16} /> Cancel</button>
              )}
              <button className="btn btn-ghost" onClick={() => navigate('/messages')}><MessageSquare size={16} /> Message</button>
            </div>
          </div>

          {/* Payment History */}
          {booking.payments?.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)' }}>Payment History</h3>
              {booking.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>R{p.amount.toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`status-badge status-${p.status}`}>{p.status}</span>
                    {p.status === 'paid' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleViewReceipt(p.id)}><FileText size={14} /> Receipt</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews */}
          {booking.reviews?.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)' }}>Reviews</h3>
              {booking.reviews.map(r => (
                <div key={r.id} className="review-card" style={{ border: 'none', padding: '8px 0' }}>
                  <div className="review-header">
                    <div className="review-avatar">{r.reviewer_name?.[0]}</div>
                    <div>
                      <div className="review-name">{r.reviewer_name}</div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4,5].map(s => <Star key={s} size={14} className={`star ${s <= r.overall_rating ? 'filled' : ''}`} />)}
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="review-comment">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right - Provider/Customer card */}
        <div>
          <div className="provider-card">
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 'var(--space-md)' }}>
              {isCustomer ? 'Service Provider' : 'Customer'}
            </h4>
            <div className="provider-card-header">
              <div className="provider-card-avatar">
                {isCustomer ? (booking.provider_avatar ? <img src={booking.provider_avatar} alt="" /> : booking.provider_name?.[0]) : (booking.customer_avatar ? <img src={booking.customer_avatar} alt="" /> : booking.customer_name?.[0])}
              </div>
              <div>
                <div className="provider-card-name">{isCustomer ? booking.provider_name : booking.customer_name}</div>
                {isCustomer && booking.business_name && <div className="provider-card-business">{booking.business_name}</div>}
                {isCustomer && booking.provider_verified ? <span className="verified-badge"><Shield size={12} /> Verified</span> : null}
              </div>
            </div>
            {isCustomer && booking.provider_rating > 0 && (
              <div className="provider-card-rating" style={{ marginBottom: 'var(--space-md)' }}>
                <Star size={16} /> {booking.provider_rating}
              </div>
            )}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isCustomer ? (
                <>
                  {booking.provider_email && <div style={{ marginBottom: 4 }}>📧 {booking.provider_email}</div>}
                  {booking.provider_phone && <div style={{ marginBottom: 4 }}>📱 {booking.provider_phone}</div>}
                  {booking.provider_location && <div><MapPin size={14} style={{ display: 'inline' }} /> {booking.provider_location}</div>}
                </>
              ) : (
                <>
                  {booking.customer_email && <div style={{ marginBottom: 4 }}>📧 {booking.customer_email}</div>}
                  {booking.customer_phone && <div style={{ marginBottom: 4 }}>📱 {booking.customer_phone}</div>}
                  {booking.customer_location && <div><MapPin size={14} style={{ display: 'inline' }} /> {booking.customer_location}</div>}
                </>
              )}
            </div>
            {isCustomer && (
              <Link to={`/provider/${booking.provider_id}`} className="btn btn-secondary btn-block" style={{ marginTop: 'var(--space-md)' }}>View Profile</Link>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave a Review</h3>
              <button className="modal-close" onClick={() => setShowReview(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitReview}>
              {['overall_rating', 'quality', 'communication', 'punctuality', 'value'].map(field => (
                <div key={field} className="form-group">
                  <label className="form-label" style={{ textTransform: 'capitalize' }}>{field.replace('_', ' ')}</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={24} className={`star ${s <= reviewForm[field] ? 'filled' : ''}`}
                        onClick={() => setReviewForm(f => ({ ...f, [field]: s }))}
                        style={{ cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Comment</label>
                <textarea className="form-textarea" placeholder="Share your experience..." value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Submit Review</button>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3><FileText size={20} /> Payment Receipt</h3>
              <button className="modal-close" onClick={() => setReceipt(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Kasi<span style={{ color: 'var(--primary)' }}>Market</span></div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Payment Receipt</div>
            </div>
            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Receipt #</span>
                <span style={{ fontWeight: 600 }}>{receipt.receipt_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date</span>
                <span>{new Date(receipt.date).toLocaleDateString('en-ZA')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</span>
                <span className={`status-badge status-${receipt.status}`}>{receipt.status}</span>
              </div>
              {receipt.payfast_ref && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PayFast Ref</span>
                  <span style={{ fontSize: '0.85rem' }}>{receipt.payfast_ref}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Service</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{receipt.service}</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem' }}>
                <span>Service Amount</span><span>R{receipt.amount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Platform Fee (5%)</span><span>R{receipt.platform_fee}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span>Total</span><span style={{ color: 'var(--primary)' }}>R{receipt.amount.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div><strong>Customer</strong><br />{receipt.customer.name}<br />{receipt.customer.email}</div>
              <div><strong>Provider</strong><br />{receipt.provider.business || receipt.provider.name}<br />{receipt.provider.email}</div>
            </div>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 'var(--space-lg)' }} onClick={() => window.print()}>
              <Printer size={16} /> Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
