import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

export default function CreateRequest() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', category_id: '', budget_min: '', budget_max: '', location: '', preferred_date: '', urgency: 'normal' });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 4 - images.length);
    setImages(prev => [...prev, ...files]);
    files.forEach(f => { const r = new FileReader(); r.onload = (ev) => setPreviews(p => [...p, ev.target.result]); r.readAsDataURL(f); });
  };

  const removeImage = (i) => { setImages(imgs => imgs.filter((_, idx) => idx !== i)); setPreviews(p => p.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description) return setError('Title and description are required');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      images.forEach(img => fd.append('images', img));
      const req = await api.createRequest(fd);
      navigate(`/request/${req.id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="container fade-in" style={{ maxWidth: 700, padding: 'var(--space-xl) var(--space-lg)' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)' }}><ArrowLeft size={16} /> Back</button>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Post a Job Request</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>Tell providers what service you need and get quotes</p>

      {error && <div className="toast error" style={{ marginBottom: 'var(--space-md)', animation: 'none', minWidth: 'auto' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">What do you need? *</label>
          <input type="text" className="form-input" placeholder="e.g. Need fencing installed around my yard" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" placeholder="Describe what you need in detail..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required style={{ minHeight: 150 }} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Budget Min (R)</label>
            <input type="number" className="form-input" placeholder="Minimum" value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Budget Max (R)</label>
            <input type="number" className="form-input" placeholder="Maximum" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" className="form-input" placeholder="e.g. Midrand" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Preferred Date</label>
            <input type="date" className="form-input" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Urgency</label>
          <div className="role-selector" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { value: 'low', icon: '🟢', label: 'Low' },
              { value: 'normal', icon: '🔵', label: 'Normal' },
              { value: 'urgent', icon: '🟡', label: 'Urgent' },
              { value: 'emergency', icon: '🔴', label: 'Emergency' },
            ].map(u => (
              <div key={u.value} className={`role-option ${form.urgency === u.value ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, urgency: u.value }))}>
                <span className="role-icon">{u.icon}</span>{u.label}
              </div>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Images (optional, up to 4)</label>
          <label className="image-upload-area">
            <Upload size={32} style={{ marginBottom: 8 }} /><div>Click to upload images</div>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          {previews.length > 0 && (
            <div className="image-preview-grid">
              {previews.map((p, i) => (
                <div key={i} className="image-preview"><img src={p} alt="" /><button type="button" className="remove-img" onClick={() => removeImage(i)}><X size={12} /></button></div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? 'Posting...' : 'Post Job Request'}
        </button>
      </form>
    </div>
  );
}
