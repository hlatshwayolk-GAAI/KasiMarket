import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, MessageSquare, Plus, LayoutDashboard, LogOut, User, Settings, Shield, ChevronDown, Menu, CalendarDays, DollarSign, BarChart3, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

export default function Header() {
  const { user, isAdmin, isProvider, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      try {
        const [notifData, msgData] = await Promise.all([
          api.getUnreadNotifCount(),
          api.getUnreadCount(),
        ]);
        setUnreadCount(notifData.count);
        setMsgCount(msgData.count);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleNotifClick = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      try {
        const data = await api.getNotifications({ limit: 10 });
        setNotifications(data);
      } catch {}
    }
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <img src="/images/logo.png" alt="Kasi Market" className="logo-img" />
          <span>Kasi<span className="highlight">Market</span></span>
        </Link>

        <form className="header-search" onSubmit={handleSearch}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search services, providers, requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <nav className="header-nav">
          {user ? (
            <>
              <Link to="/browse" className="header-nav-link">
                <Search size={18} /><span>Browse</span>
              </Link>
              <Link to="/create-listing" className="header-nav-link">
                <Plus size={18} /><span>Post Service</span>
              </Link>
              <Link to="/messages" className="header-nav-link">
                <MessageSquare size={18} /><span>Messages</span>
                {msgCount > 0 && <span className="badge">{msgCount}</span>}
              </Link>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button className="header-nav-link" onClick={handleNotifClick} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div className="notif-dropdown">
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.95rem' }}>Notifications</strong>
                      {unreadCount > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={async () => {
                          await api.markAllNotifsRead();
                          setUnreadCount(0);
                          setNotifications(n => n.map(x => ({ ...x, is_read: 1 })));
                        }}>Mark all read</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications yet</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => setShowNotifs(false)}>
                        <div className="notif-icon" style={{ background: 'var(--primary-glow)' }}>🔔</div>
                        <div className="notif-content">
                          <div className="notif-title">{n.title}</div>
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div ref={menuRef} style={{ position: 'relative' }}>
                <div className="header-user" onClick={() => setShowUserMenu(!showUserMenu)}>
                  <div className="header-user-avatar">
                    {user.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
                  </div>
                  <span className="header-user-name">{user.full_name?.split(' ')[0]}</span>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link to={`/provider/${user.id}`} className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <User size={16} /> My Profile
                    </Link>
                    <Link to="/bookings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <CalendarDays size={16} /> Bookings
                    </Link>
                    <Link to="/payments" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <DollarSign size={16} /> Payments
                    </Link>
                    <Link to="/favorites" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <Heart size={16} /> Saved Services
                    </Link>
                    {isProvider && (
                      <Link to="/analytics" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                        <BarChart3 size={16} /> Analytics
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                        <Shield size={16} /> Admin Panel
                      </Link>
                    )}
                    <div className="dropdown-divider" />
                    <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <Settings size={16} /> Settings
                    </Link>
                    <button className="dropdown-item danger" onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}>
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/browse" className="header-nav-link">
                <Search size={18} /><span>Browse</span>
              </Link>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
