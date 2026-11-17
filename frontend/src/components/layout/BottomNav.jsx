import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PariViewLogo from '../common/PariViewLogo';

// Icon components for BottomNav
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const TransactionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
  </svg>
);

const InvestIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// Menu item icons for More sheet
const moreIcons = {
  import: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  scanner: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  ),
  upi: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  budgets: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  savings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  subscriptions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  aiInsights: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.4 13.42M5 3.27A10 10 0 0 1 21 12"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const MORE_SECTIONS = [
  {
    title: 'Transactions & Import',
    items: [
      { name: 'Import Statements', path: '/import', icon: 'import' },
      { name: 'Receipt Scanner', path: '/scanner', icon: 'scanner' },
      { name: 'UPI Screenshot Scanner', path: '/upi-scanner', icon: 'upi' },
    ],
  },
  {
    title: 'Financial Planning',
    items: [
      { name: 'Budgets', path: '/budgets', icon: 'budgets' },
      { name: 'Savings Goals', path: '/savings', icon: 'savings' },
      { name: 'Subscriptions', path: '/subscriptions', icon: 'subscriptions' },
    ],
  },
  {
    title: 'Insights & AI',
    items: [
      { name: 'Reports & Export', path: '/reports', icon: 'reports' },
      { name: 'AI Wealth Insights', path: '/ai-insights', icon: 'aiInsights' },
      { name: 'AI Financial Assistant', path: '/chat', icon: 'chat' },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'User Profile', path: '/profile', icon: 'profile' },
      { name: 'Account Settings', path: '/settings/account', icon: 'settings' },
    ],
  },
];

const BottomNav = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const isMoreActive = MORE_SECTIONS.some((sec) =>
    sec.items.some((item) => item.path === location.pathname)
  );

  // Lock body scroll when more sheet is open
  useEffect(() => {
    if (moreOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [moreOpen]);

  const primaryTabs = [
    { name: 'Home', path: '/dashboard', Icon: HomeIcon },
    { name: 'Transactions', path: '/transactions', Icon: TransactionsIcon },
    { name: 'Invest', path: '/investments', Icon: InvestIcon },
    { name: 'Analytics', path: '/analytics', Icon: AnalyticsIcon },
  ];

  return (
    <>
      {/* ─── Bottom Navigation Bar (Mobile & Tablet < 1024px) ─── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 80,
          background: 'var(--navbar-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        className="lg:hidden"
        aria-label="Bottom Navigation"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {primaryTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-all duration-200 select-none ${
                  isActive ? 'text-primary font-semibold' : 'text-textSecondary hover:text-textPrimary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive ? 'bg-primary/10 text-primary scale-110' : ''
                    }`}
                  >
                    <tab.Icon />
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full px-1">
                    {tab.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* More Tab */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-all duration-200 select-none ${
              moreOpen || isMoreActive
                ? 'text-primary font-semibold'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
            aria-label="More navigation options"
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                moreOpen || isMoreActive ? 'bg-primary/10 text-primary scale-110' : ''
              }`}
            >
              <MoreIcon />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">More</span>
          </button>
        </div>
      </nav>

      {/* ─── More Navigation Bottom Sheet ─── */}
      {moreOpen && (
        <div className="fixed inset-0 z-90 lg:hidden flex flex-col justify-end">
          {/* Overlay */}
          <div
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
          />

          {/* Sheet Panel */}
          <div
            style={{
              background: 'var(--card-bg)',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: '1px solid var(--border)',
              maxHeight: '85vh',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            }}
            className="relative w-full overflow-y-auto shadow-2xl z-10 animate-slideUp"
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <PariViewLogo size="sm" />
                <span className="font-bold text-sm text-textPrimary">Navigation Menu</span>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-textSecondary hover:bg-surface"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 space-y-5">
              {MORE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[11px] font-bold text-textMuted uppercase tracking-wider px-2 mb-2">
                    {section.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            setMoreOpen(false);
                            navigate(item.path);
                          }}
                          className={`flex items-center justify-between w-full p-3 min-h-[48px] rounded-xl text-left transition-all ${
                            isActive
                              ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                              : 'hover:bg-surface text-textPrimary border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={isActive ? 'text-primary' : 'text-textSecondary'}>
                              {moreIcons[item.icon]}
                            </span>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="text-textMuted text-xs">›</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Logout inside sheet */}
              {user && (
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 w-full p-3 min-h-[48px] rounded-xl text-danger hover:bg-danger/10 text-sm font-semibold transition-all"
                  >
                    {moreIcons.logout}
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNav;
