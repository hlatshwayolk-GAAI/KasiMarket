import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

export default function CreateListing() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', category_id: '', subcategory_id: '', price_type: 'fixed', price_amount: '', location: '', service_area: '', availability: '', tags: '' });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 6 - images.length);
    setImages(prev => [...prev, ...files]);
    files.forEach(f => { const r = new FileReader(); r.onload = (ev) => setPreviews(p => [...p, ev.target.result]); r.readAsDataURL(f); });
  };

  const removeImage = (i) => { setImages(imgs => imgs.filter((_, idx) => idx !== i)); setPreviews(p => p.filter((_, idx) => idx !== i)); };

  const selectedCat = categories.find(c => c.id === form.category_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description) return setError('Title and description are required');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (form.tags) fd.set('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
      images.forEach(img => fd.append('images', img));
      const listing = await api.createListing(fd);
      navigate(`/listing/${listing.id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="container slide-up" style={{ maxWidth: 700, padding: 'var(--space-xl) var(--space-lg)' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)' }}><ArrowLeft size={16} /> Back</button>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Post a Service</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>Create a listing to showcase your service to customers</p>

      {error && (
        <div className="toast error" style={{ marginBottom: 'var(--space-md)', animation: 'none', minWidth: 'auto' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group stagger-1">
          <label className="form-label">Service Title *</label>
          <input type="text" className="form-input" placeholder="e.g. Professional Garden Maintenance" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>

        <div className="form-row stagger-2">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value, subcategory_id: '' }))}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subcategory</label>
            <select className="form-select" value={form.subcategory_id} onChange={e => setForm(f => ({ ...f, subcategory_id: e.target.value }))} disabled={!selectedCat}>
              <option value="">Select subcategory</option>
              {selectedCat?.subcategories?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group stagger-3">
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" placeholder="Describe your service in detail..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required style={{ minHeight: 150 }} />
        </div>

        <div className="form-row stagger-4">
          <div className="form-group">
            <label className="form-label">Price Type</label>
            <select className="form-select" value={form.price_type} onChange={e => setForm(f => ({ ...f, price_type: e.target.value }))}>
              <option value="fixed">Fixed Price</option>
              <option value="starting_from">Starting From</option>
              <option value="hourly">Hourly Rate</option>
              <option value="quote">Quote on Request</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Price (R)</label>
            <input type="number" className="form-input" placeholder="Amount" value={form.price_amount} onChange={e => setForm(f => ({ ...f, price_amount: e.target.value }))} disabled={form.price_type === 'quote'} />
          </div>
        </div>

        <div className="form-row stagger-5">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" className="form-input" placeholder="e.g. Soweto" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Service Area</label>
            <input type="text" className="form-input" placeholder="e.g. Soweto, Diepkloof, Orlando" value={form.service_area} onChange={e => setForm(f => ({ ...f, service_area: e.target.value }))} />
          </div>
        </div>

        <div className="form-group stagger-6">
          <label className="form-label">Availability</label>
          <input type="text" className="form-input" placeholder="e.g. Mon-Sat, 7am-5pm" value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))} />
        </div>

        <div className="form-group stagger-7">
          <label className="form-label">Tags (comma separated)</label>
          <input type="text" className="form-input" placeholder="e.g. gardening, grass cutting, landscaping" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
        </div>

        <div className="form-group stagger-8">
          <label className="form-label">Images (up to 6)</label>
          <label className="image-upload-area">
            <Upload size={32} style={{ marginBottom: 8 }} />
            <div>Click to upload images</div>
            <div style={{ fontSize: '0.8rem' }}>JPEG, PNG, WebP up to 5MB each</div>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          {previews.length > 0 && (
            <div className="image-preview-grid">
              {previews.map((p, i) => (
                <div key={i} className="image-preview">
                  <img src={p} alt="" />
                  <button type="button" className="remove-img" onClick={() => removeImage(i)}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg stagger-9" disabled={loading}>
          {loading ? 'Publishing...' : 'Publish Service Listing'}
        </button>
      </form>
    </div>
  );
}
