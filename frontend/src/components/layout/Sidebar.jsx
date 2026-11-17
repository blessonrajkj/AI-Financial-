import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PariViewLogo from '../common/PariViewLogo';

// Close Icon SVG for mobile drawer
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Precise SVG icons — not generic Lucide strokes
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  transactions: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  ),
  import: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  scanner: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  ),
  upi: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  budgets: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  savings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  investments: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  subscriptions: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  analytics: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  aiInsights: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  chat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.4 13.42M5 3.27A10 10 0 0 1 21 12"/>
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const MENU_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    ]
  },
  {
    label: 'Money',
    items: [
      { name: 'Transactions', path: '/transactions', icon: 'transactions' },
      { name: 'Import', path: '/import', icon: 'import' },
      { name: 'Receipt Scanner', path: '/scanner', icon: 'scanner' },
      { name: 'UPI Scanner', path: '/upi-scanner', icon: 'upi' },
    ]
  },
  {
    label: 'Planning',
    items: [
      { name: 'Budgets', path: '/budgets', icon: 'budgets' },
      { name: 'Savings Goals', path: '/savings', icon: 'savings' },
      { name: 'Investments', path: '/investments', icon: 'investments' },
      { name: 'Subscriptions', path: '/subscriptions', icon: 'subscriptions' },
    ]
  },
  {
    label: 'Insights',
    items: [
      { name: 'Reports', path: '/reports', icon: 'reports' },
      { name: 'Analytics', path: '/analytics', icon: 'analytics' },
      { name: 'AI Insights', path: '/ai-insights', icon: 'aiInsights' },
      { name: 'AI Assistant', path: '/chat', icon: 'chat' },
    ]
  },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleNavClick = () => {
    if (isOpen && toggleSidebar) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            animation: 'fadeIn 0.2s ease forwards',
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar shell — obsidian dark structural design */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : undefined,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className={`lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar Brand Header with PariView Logo */}
        <div style={{ height: 72, padding: '0 16px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <NavLink to="/dashboard" onClick={handleNavClick} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <PariViewLogo size="md" />
          </NavLink>
          <button
            onClick={toggleSidebar}
            className="lg:hidden"
            style={{
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </button>
        </div>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          top: 80,
          left: -60,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 0' }}>
          {MENU_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '0 12px',
                marginBottom: 6,
              }}>
                {section.label}
              </p>

              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleNavClick}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        minHeight: 44,
                        borderRadius: 10,
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--hover-bg)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
                        boxShadow: 'none',
                      })}
                      onMouseEnter={e => {
                        if (!e.currentTarget.classList.contains('active')) {
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.background = 'var(--surface)';
                        }
                      }}
                      onMouseLeave={e => {
                        // NavLink active state restores styles automatically
                        const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ opacity: 0.8, flexShrink: 0 }}>
                        {icons[item.icon]}
                      </span>
                      {item.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom user strip + logout */}
        <div style={{
          padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {/* Settings link */}
          <NavLink
            to="/settings/account"
            onClick={handleNavClick}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              minHeight: 44,
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--hover-bg)' : 'transparent',
              transition: 'all 0.2s ease',
            })}
          >
            <span style={{ opacity: 0.8 }}>{icons.settings}</span>
            Settings
          </NavLink>

          {/* User card */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              minHeight: 44,
            }}
            onClick={() => { navigate('/profile'); handleNavClick(); }}
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                alt="avatar"
                style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
              />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.full_name || 'User'}
                </p>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); logout(); }}
                title="Log out"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(220,38,38,0.12)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F87171',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {icons.logout}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;