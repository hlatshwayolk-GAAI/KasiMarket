import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { api } from '../utils/api';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const isCancel = window.location.pathname.includes('cancel');

  useEffect(() => {
    if (paymentId) {
      // Poll for payment status update (ITN may take a moment)
      const check = async () => {
        try {
          const data = await api.verifyPayment(paymentId);
          setPayment(data);
        } catch {}
        setLoading(false);
      };
      check();
      const interval = setInterval(check, 3000);
      setTimeout(() => clearInterval(interval), 30000); // Stop after 30s
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="container fade-in" style={{ maxWidth: 500, padding: 'var(--space-3xl) var(--space-lg)', textAlign: 'center' }}>
      {isCancel ? (
        <>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)' }}>
            <XCircle size={40} style={{ color: 'var(--error)' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>Payment Cancelled</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: '1rem' }}>
            Your payment was cancelled. No charges were made.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <Link to="/bookings" className="btn btn-primary">Back to Bookings</Link>
            <Link to="/" className="btn btn-secondary">Go Home</Link>
          </div>
        </>
      ) : (
        <>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: payment?.status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-lg)',
            animation: 'slideUp 0.5s ease',
          }}>
            <CheckCircle size={40} style={{ color: payment?.status === 'paid' ? 'var(--success)' : 'var(--warning)' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>
            {payment?.status === 'paid' ? 'Payment Successful!' : 'Payment Processing'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', fontSize: '1rem' }}>
            {payment?.status === 'paid'
              ? 'Your payment has been confirmed. The service provider has been notified.'
              : 'Your payment is being processed. You will receive a notification once confirmed.'}
          </p>

          {payment && (
            <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>R{payment.amount?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className={`status-badge status-${payment.status}`}>{payment.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment ID</span>
                <span style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{paymentId?.substring(0, 12)}...</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/bookings" className="btn btn-primary">
              View Bookings <ArrowRight size={16} />
            </Link>
            <Link to="/" className="btn btn-secondary">Go Home</Link>
          </div>
        </>
      )}
    </div>
  );
}
