import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useThemeAndRefresh } from '../../context/ThemeAndRefreshContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PariViewLogo from '../common/PariViewLogo';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Icon components using SVG — precise, lightweight lines (not generic lucide)
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, refreshTrigger, invalidateCache } = useThemeAndRefresh();
  const darkMode = theme === 'dark';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/summary`);
      setSummaryData(res.data);
    } catch (err) {
      console.error('Failed to fetch navbar summary:', err);
    }
  };

  useEffect(() => {
    if (user) fetchSummary();
  }, [user, refreshTrigger]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('navbar-search')?.focus();
      }
      // Close dropdowns on Escape
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await axios.post(`${API_URL}/analytics/notifications/${notif.id}/read`);
      setNotificationsOpen(false);
      invalidateCache();
      if (notif.type === 'budget_alert') navigate('/budgets');
      else if (notif.type === 'bill_reminder') navigate('/subscriptions');
      else navigate('/dashboard');
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API_URL}/analytics/notifications/mark-all-read`);
      invalidateCache();
    } catch (err) { console.error(err); }
  };

  const health = summaryData?.health_score ?? 0;
  const healthColor = health >= 85 ? '#10B981' : health >= 65 ? '#4F46E5' : health >= 45 ? '#D97706' : '#DC2626';
  const unreadCount = summaryData?.unread_notifications_count || 0;

  return (
    <>
      {/* Grain overlay — premium tactile feel */}
      <div className="grain-overlay" aria-hidden="true" />

      <nav
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 50,
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          background: 'var(--navbar-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
        }}
        className="left-0 lg:left-[260px]"
      >
        {/* ─── Left: Brand / Mobile Hamburger ─── */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl text-textSecondary hover:bg-surface transition-colors duration-200"
          >
            <MenuIcon />
          </button>

          <Link to="/" className="lg:hidden flex items-center gap-2.5 group">
            <PariViewLogo size="md" />
          </Link>
        </div>

        {/* ─── Centre: Search ─── */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-8">
          <div
            style={{
              position: 'relative',
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              padding: '0 0.875rem',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow)',
            }}
          >
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><SearchIcon /></span>
            <input
              id="navbar-search"
              type="text"
              placeholder="Search… (⌘K)"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                width: '100%',
                height: 40,
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* ─── Right: Actions ─── */}
        <div className="flex items-center gap-2">

          {/* Health score pill */}
          {health > 0 && (
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                background: `${healthColor}12`,
                border: `1px solid ${healthColor}28`,
                cursor: 'default',
              }}
              className="sm:flex"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={healthColor}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: healthColor, fontFamily: "'DM Mono', monospace" }}>
                {health}
              </span>
            </div>
          )}

          {/* Chat shortcut */}
          <button
            onClick={() => navigate('/chat')}
            title="AI Assistant"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
              boxShadow: 'var(--shadow)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--primary)';
              e.currentTarget.style.borderColor = 'rgba(79,70,229,0.3)';
              e.currentTarget.style.background = 'rgba(79,70,229,0.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface)';
            }}
          >
            <ChatIcon />
          </button>

          {/* Notifications */}
          <div className="relative" data-dropdown="notifications">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setDropdownOpen(false); }}
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow)',
              }}
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 7,
                  height: 7,
                  background: 'var(--danger)',
                  borderRadius: '50%',
                  border: '1.5px solid var(--card-bg)',
                }} />
              )}
            </button>

            {notificationsOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 320,
                  maxWidth: 'calc(100vw - 24px)',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  boxShadow: 'var(--shadow-lg)',
                  padding: '1rem',
                  zIndex: 100,
                  animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  maxHeight: 380,
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {summaryData?.notifications?.length > 0 ? summaryData.notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: n.is_read ? 'transparent' : 'rgba(79,70,229,0.04)',
                        border: `1px solid ${n.is_read ? 'transparent' : 'rgba(79,70,229,0.12)'}`,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</span>
                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: 4, flexShrink: 0 }} />}
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{n.message}</p>
                    </div>
                  )) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Switch to light' : 'Switch to dark'}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow)',
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Separator */}
          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} className="hidden sm:block" />

          {/* User avatar + dropdown */}
          {user && (
            <div className="relative" data-dropdown="profile">
              <button
                onClick={() => { setDropdownOpen(!dropdownOpen); setNotificationsOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                  alt="avatar"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    objectFit: 'cover',
                    border: '1.5px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  className="hover:scale-105"
                />
                <span className="hidden sm:block" style={{ color: 'var(--text-muted)' }}><ChevronIcon /></span>
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 220,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-lg)',
                    overflow: 'hidden',
                    zIndex: 100,
                    animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  }}
                >
                  {/* User info header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.full_name || 'PariView User'}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  {[
                    { to: '/profile', label: 'View Profile', Icon: UserIcon },
                    { to: '/settings/account', label: 'Account Settings', Icon: SettingsIcon },
                  ].map(({ to, label, Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 16px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <Icon />
                      {label}
                    </Link>
                  ))}

                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: 'var(--danger)',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid var(--border)',
                      marginTop: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogoutIcon />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
