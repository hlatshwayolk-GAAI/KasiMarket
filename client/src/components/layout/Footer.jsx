import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-root)', padding: 'var(--space-md) var(--space-lg)', marginTop: 'auto' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'var(--primary-glow)', borderRadius: 4, border: '1px solid var(--primary-light)', marginRight: 8, color: 'var(--primary-dark)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M9 22V12h6v10"></path></svg>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--secondary)' }}>KasiMarket <span style={{ color: 'var(--primary)', fontWeight: 400, fontStyle: 'italic', fontFamily: 'var(--font-heading)' }}>Premium</span></span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          © 2024 Elite Community Services
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.85rem' }}>
          <Link to="#" style={{ color: 'var(--text-secondary)' }}>About</Link>
          <Link to="#" style={{ color: 'var(--text-secondary)' }}>Contact</Link>
          <Link to="#" style={{ color: 'var(--text-secondary)' }}>Privacy</Link>
          <Link to="#" style={{ color: 'var(--text-secondary)' }}>Terms</Link>
        </div>
      </div>
    </footer>
  );
}
