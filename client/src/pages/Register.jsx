import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer', location: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up" style={{ maxWidth: 500 }}>
        <h2>Join Kasi Market</h2>
        <p className="auth-subtitle">Create your account and start connecting</p>

        {error && <div className="toast error" style={{ marginBottom: 'var(--space-md)', animation: 'none', minWidth: 'auto' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">I want to</label>
            <div className="role-selector">
              {[
                { value: 'customer', icon: '🔍', label: 'Find Services' },
                { value: 'provider', icon: '🔧', label: 'Offer Services' },
                { value: 'both', icon: '🤝', label: 'Both' },
              ].map(r => (
                <div key={r.value} className={`role-option ${form.role === r.value ? 'active' : ''}`} onClick={() => setForm({ ...form, role: r.value })}>
                  <span className="role-icon">{r.icon}</span>
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="full_name" className="form-input" placeholder="Your full name" value={form.full_name} onChange={handleChange} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" name="phone" className="form-input" placeholder="082 123 4567" value={form.phone} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" name="location" className="form-input" placeholder="e.g. Soweto, Johannesburg" value={form.location} onChange={handleChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" name="confirmPassword" className="form-input" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider">or</div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
