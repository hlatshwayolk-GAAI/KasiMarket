import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, MapPin, Phone, Mail, Briefcase, Save, Shield, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, isProvider, setUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', bio: '', location: '',
  });
  const [providerProfile, setProviderProfile] = useState({
    business_name: '', phone: '', email: '', bio: '', years_experience: 0,
    service_areas: '', availability: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
      });
    }
    if (isProvider) {
      api.getMe().then(data => {
        const pp = data.providerProfile || data.provider_profile;
        if (pp) {
          setProviderProfile({
            business_name: pp.business_name || '',
            phone: pp.phone || '',
            email: pp.email || '',
            bio: pp.bio || '',
            years_experience: pp.years_experience || 0,
            service_areas: pp.service_areas || '',
            availability: pp.availability || '',
          });
        }
      }).catch(() => {});
    }
  }, [user, isProvider]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile(profile);
      setUser(prev => ({ ...prev, ...(updated.user || updated) }));
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const handleSaveProvider = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProviderProfile(providerProfile);
      setSuccess('Business profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await api.uploadAvatar(formData);
      setUser(prev => ({ ...prev, avatar_url: data.avatar_url }));
      setSuccess('Avatar updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="container fade-in" style={{ maxWidth: 800, padding: 'var(--space-xl) var(--space-lg)' }}>
      <div className="dashboard-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {success && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600 }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'profile', label: 'Personal Info', icon: <User size={16} /> },
          ...(isProvider ? [{ key: 'business', label: 'Business Profile', icon: <Briefcase size={16} /> }] : []),
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '2rem', fontWeight: 800, overflow: 'hidden',
              }}>
                {user?.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.full_name?.[0]}
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg-surface-2)', border: '2px solid var(--bg-surface)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Camera size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--secondary)', textTransform: 'capitalize', marginTop: 2 }}>{user?.role} Account</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><User size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Full Name</label>
              <input className="form-input" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label"><Mail size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Email</label>
              <input className="form-input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Phone</label>
              <input className="form-input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 011 123 4567" />
            </div>
            <div className="form-group">
              <label className="form-label"><MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Location</label>
              <input className="form-input" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Soweto, Johannesburg" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-textarea" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {tab === 'business' && (
        <form onSubmit={handleSaveProvider}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><Briefcase size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Business Name</label>
              <input className="form-input" value={providerProfile.business_name} onChange={e => setProviderProfile(p => ({ ...p, business_name: e.target.value }))} placeholder="Your business name" />
            </div>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input className="form-input" type="number" min="0" value={providerProfile.years_experience} onChange={e => setProviderProfile(p => ({ ...p, years_experience: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Business Phone</label>
              <input className="form-input" value={providerProfile.phone} onChange={e => setProviderProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label"><Mail size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Business Email</label>
              <input className="form-input" type="email" value={providerProfile.email} onChange={e => setProviderProfile(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Service Areas</label>
            <input className="form-input" value={providerProfile.service_areas} onChange={e => setProviderProfile(p => ({ ...p, service_areas: e.target.value }))} placeholder="e.g. Soweto, Johannesburg CBD, Randburg" />
          </div>
          <div className="form-group">
            <label className="form-label">Availability</label>
            <input className="form-input" value={providerProfile.availability} onChange={e => setProviderProfile(p => ({ ...p, availability: e.target.value }))} placeholder="e.g. Mon-Fri 8am-5pm, Sat 9am-2pm" />
          </div>
          <div className="form-group">
            <label className="form-label">Business Description</label>
            <textarea className="form-textarea" value={providerProfile.bio} onChange={e => setProviderProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Describe your services and experience..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Business Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
