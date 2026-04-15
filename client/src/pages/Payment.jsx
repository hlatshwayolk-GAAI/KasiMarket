import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, CreditCard, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';

export default function Payment() {
  const { id: paymentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentData, setPaymentData] = useState(location.state?.paymentData || null);
  const [loading, setLoading] = useState(!paymentData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!paymentData && paymentId) {
      api.verifyPayment(paymentId).then(data => {
        setPaymentData(data);
        setLoading(false);
      }).catch(() => {
        navigate('/bookings');
      });
    }
  }, [paymentId, paymentData, navigate]);

  const handlePayFastSubmit = () => {
    if (!paymentData?.payfast_data) return;
    setSubmitting(true);

    // Create and submit PayFast form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.payfast_url;

    Object.entries(paymentData.payfast_data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const data = paymentData?.payfast_data || paymentData;

  return (
    <div className="container fade-in" style={{ maxWidth: 560, padding: 'var(--space-xl) var(--space-lg)' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
            <CreditCard size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Complete Payment</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            You'll be redirected to PayFast to complete your payment securely
          </p>
        </div>

        {/* Payment Summary */}
        <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 'var(--space-md)' }}>Order Summary</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Service</span>
            <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{data?.item_name || 'Service'}</span>
          </div>

          {data?.item_description && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Description</span>
              <span style={{ color: 'var(--text-secondary)' }}>{data.item_description}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
              <span>Service Amount</span>
              <span>R{parseFloat(data?.amount || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span>Platform Fee (5%)</span>
              <span>R{(parseFloat(data?.amount || 0) * 0.05).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid var(--border)', fontSize: '1.3rem', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>R{parseFloat(data?.amount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Sandbox Notice */}
        {paymentData?.sandbox && (
          <div style={{ background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--warning)' }}>
              <strong>Sandbox Mode</strong> — This is a test payment. No real money will be charged. Use PayFast sandbox test cards.
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button className="btn btn-primary btn-block btn-lg" onClick={handlePayFastSubmit} disabled={submitting}
          style={{ fontSize: '1.05rem', padding: '16px' }}>
          <Lock size={18} />
          {submitting ? 'Redirecting to PayFast...' : `Pay R${parseFloat(data?.amount || 0).toLocaleString()} with PayFast`}
        </button>

        {/* Security badges */}
        <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', marginTop: 'var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={14} /> Secure Payment</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={14} /> SSL Encrypted</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> PayFast Protected</span>
        </div>

        <div style={{ marginTop: 'var(--space-md)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          By clicking "Pay", you agree to Kasi Market's Terms of Service and Privacy Policy.
          Payments are processed securely by PayFast.
        </div>
      </div>
    </div>
  );
}
