import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, MapPin, Star, Clock, Briefcase, Users, TrendingUp, Shield } from 'lucide-react';
import { api } from '../utils/api';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [latestRequests, setLatestRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getFeaturedListings().then(setFeatured).catch(() => {});
    api.getLatestRequests().then(setLatestRequests).catch(() => {});
  }, []);

  // Intersection Observer for scroll-reveal animations
  const observerRef = useRef(null);
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [categories, featured, latestRequests]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
  };

  const formatPrice = (listing) => {
    if (!listing.price_amount) return 'Get Quote';
    const prefix = listing.price_type === 'starting_from' ? 'From ' : listing.price_type === 'hourly' ? '' : '';
    const suffix = listing.price_type === 'hourly' ? '/hr' : '';
    return `${prefix}R${listing.price_amount.toLocaleString()}${suffix}`;
  };

  return (
    <div>
      {/* Premium Hero */}
      <section className="hero" style={{ minHeight: '60vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src="/images/hero-bg.png"
          alt="Luxury lifestyle"
          className="hero-bg-image"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 0, opacity: 0.8, filter: 'brightness(0.6)' }}
        />
        <div className="hero-content" style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#fff', padding: 'var(--space-2xl)' }}>
          <div className="hero-subtitle slide-up stagger-1" style={{ fontSize: '0.8rem', letterSpacing: '3px', fontWeight: 600, color: 'var(--primary-light)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>
            Elevate Your Lifestyle. Exclusive Community Services.
          </div>
          <h1 className="slide-up stagger-2" style={{ fontFamily: 'var(--font-heading)', fontSize: '3.5rem', fontWeight: 400, color: 'var(--primary)', letterSpacing: '2px', textShadow: '0 2px 10px rgba(0,0,0,0.5)', marginBottom: 'var(--space-xl)' }}>
            LOCAL LUXURY. LOCAL TRUST.
          </h1>
          <div className="slide-up stagger-3">
            <Link to="/browse" className="btn btn-primary" style={{ borderRadius: '30px', padding: '12px 32px', fontSize: '0.9rem', letterSpacing: '1px', fontWeight: 600, background: 'var(--primary)', color: 'var(--secondary)' }}>
              VIEW EXCLUSIVE SERVICES
            </Link>
          </div>
        </div>
      </section>

      {/* Premium Service Categories */}
      <section className="section" style={{ background: 'var(--bg-root)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--secondary)', marginBottom: 'var(--space-2xl)' }}>Premium Service Categories</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { id: '1', name: 'Home Cleaning', icon: '🧹', desc: 'Elegant interior with a maid cleaning\nbespoke cleaning, deep clean', title: 'High-end, pristine luxury interior\nwith marble surfaces and fresh\nflowers.' },
              { id: '2', name: 'Outdoor & Garden', icon: '🌳', desc: 'Pristine manicured luxury garden\nand landscaping\nlandscaping, garden care', title: 'Lush, manicured estate garden\nwith a gazebo.' },
              { id: '3', name: 'Pool Services', icon: '🏊‍♂️', desc: 'Sparkling infinity pool at a villa\nmaintenance, cleaning', title: 'Sparkling infinity pool\noverlooking a scenic vista.' },
              { id: '4', name: 'Childcare & Nanny', icon: '👶', desc: 'Professional nanny with a child in a\nsophisticated nursery\nprivate care, nannies', title: 'Elegant nursery with designer\nfurniture.' },
              { id: '5', name: 'Fencing', icon: '🚧', desc: 'High-quality architectural\nfencing installation\ncustom fencing, gates', title: 'Wrought iron and wood luxury\nfence around a property.' },
              { id: '6', name: 'Welding', icon: '🔥', desc: 'Craftsman doing precision\nwelding on luxury metalwork\ncustom fabrication, repair', title: 'Close-up of precision welding\non a luxury metal structure with\nsparks.' },
              { id: '7', name: 'Roofing', icon: '🏠', desc: 'Beautiful slate roof on a\nmodern mansion\nrepairs, installation', title: 'Aerial view of a high-end slate\nand copper roof on a grand\nmanor.' },
              { id: '8', name: 'Moving Services', icon: '🚚', desc: 'Professional movers handling\nhigh-end furniture\nwhite-glove relocation', title: 'Premium branded moving truck\nwith professional movers.' },
            ].map((cat, i) => (
              <div key={i} style={{ 
                background: 'linear-gradient(180deg, rgba(40,40,40,1) 0%, rgba(20,20,20,1) 100%)',
                border: '1px solid var(--primary)', 
                borderRadius: '8px', 
                padding: 'var(--space-xl) var(--space-md)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                minHeight: '220px'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{cat.icon}</div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 500, marginBottom: 'var(--space-sm)' }}>{cat.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'pre-line', lineHeight: '1.4' }}>{cat.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
