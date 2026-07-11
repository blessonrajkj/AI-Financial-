import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useThemeAndRefresh } from '../../context/ThemeAndRefreshContext';
import { 
  Sun, 
  Moon, 
  Search, 
  Bell, 
  MessageSquare, 
  Sparkles,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, refreshTrigger, invalidateCache } = useThemeAndRefresh();
  const darkMode = theme === 'dark';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showHealthBreakdown, setShowHealthBreakdown] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/summary`);
      setSummaryData(res.data);
    } catch (err) {
      console.error("Failed to fetch navbar summary:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user, refreshTrigger]);

  // Handle keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('navbar-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await axios.post(`${API_URL}/analytics/notifications/${notif.id}/read`);
      setNotificationsOpen(false);
      invalidateCache();
      
      // Navigate to related page
      if (notif.type === 'budget_alert') {
        navigate('/budgets');
      } else if (notif.type === 'bill_reminder') {
        navigate('/subscriptions');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API_URL}/analytics/notifications/mark-all-read`);
      invalidateCache();
    } catch (err) {
      console.error(err);
    }
  };

  // Health Score UI Settings
  const health = summaryData?.health_score ?? 84;
  let healthColorClass = 'text-primary bg-primary/10 border-primary/20';
  if (health >= 90) {
    healthColorClass = 'text-success bg-success/10 border-success/20';
  } else if (health >= 70) {
    healthColorClass = 'text-primary bg-primary/10 border-primary/20';
  } else if (health >= 50) {
    healthColorClass = 'text-warning bg-warning/10 border-warning/20';
  } else {
    healthColorClass = 'text-danger bg-danger/10 border-danger/20';
  }

  // Calculate simulated sub breakdown numbers for tooltips
  const scoreSavings = Math.min(25, Math.max(0, Math.floor(((summaryData?.savings_rate || 0) / 30) * 25)));
  const scoreBudget = summaryData?.monthly_spending && summaryData?.total_budget_limit
    ? Math.max(0, Math.floor(20 * (1 - (summaryData.monthly_spending / summaryData.total_budget_limit))))
    : 20;

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-navbarBg/80 backdrop-blur-md border-b border-borderColor z-30 flex items-center justify-between px-6 transition-colors duration-200">
      {/* Left branding */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-textSecondary hover:bg-hoverBg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-primary/20 transform group-hover:scale-105 transition-transform duration-200">
            W
          </div>
          <span className="text-xl font-extrabold tracking-tight text-textPrimary group-hover:opacity-90 transition-opacity">
            WealthPilot AI
          </span>
        </Link>
      </div>

      {/* Middle Search Bar */}
      <div className="hidden md:flex items-center relative max-w-md w-full mx-8">
        <Search className="w-4 h-4 text-textMuted absolute left-4" />
        <input 
          id="navbar-search"
          type="text" 
          placeholder="Search transactions, budgets... (Ctrl+K)"
          className="w-full h-11 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        {/* Health Score Indicator */}
        <div 
          className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full border cursor-pointer relative transition-all ${healthColorClass}`}
          onMouseEnter={() => setShowHealthBreakdown(true)}
          onMouseLeave={() => setShowHealthBreakdown(false)}
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-semibold">Health: {health}%</span>
          
          {/* Health Breakdown Tooltip */}
          {showHealthBreakdown && (
            <div className="absolute top-9 left-1/2 transform -translate-x-1/2 w-64 bg-cardBg border border-borderColor rounded-2xl shadow-xl p-4 z-50 text-textPrimary text-xs font-normal">
              <h5 className="font-bold border-b border-borderColor pb-1.5 mb-2 text-textPrimary">Financial Health Score</h5>
              <ul className="space-y-1 text-[11px] text-textSecondary">
                <li className="flex justify-between"><span>Savings Rate</span> <span className="font-bold text-textPrimary">{scoreSavings}/25 pts</span></li>
                <li className="flex justify-between"><span>Budget Usage</span> <span className="font-bold text-textPrimary">{scoreBudget}/20 pts</span></li>
                <li className="flex justify-between"><span>Debt Ratio</span> <span className="font-bold text-textPrimary">15/15 pts</span></li>
                <li className="flex justify-between"><span>Investment Growth</span> <span className="font-bold text-textPrimary">{summaryData?.investments_summary?.total_returns > 0 ? 15 : 10}/15 pts</span></li>
                <li className="flex justify-between"><span>Emergency Fund</span> <span className="font-bold text-textPrimary">{summaryData?.current_balance >= 100000 ? 10 : 7}/10 pts</span></li>
                <li className="flex justify-between"><span>Subscription Control</span> <span className="font-bold text-textPrimary">5/5 pts</span></li>
                <li className="flex justify-between"><span>Bill Payments</span> <span className="font-bold text-textPrimary">5/5 pts</span></li>
                <li className="flex justify-between"><span>Stability</span> <span className="font-bold text-textPrimary">5/5 pts</span></li>
              </ul>
              <div className="mt-2.5 pt-1.5 border-t border-borderColor font-bold flex justify-between">
                <span>Total Score</span>
                <span className="text-primary">{health}%</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Chat Shortcut */}
        <button 
          onClick={() => navigate('/chat')}
          className="p-2.5 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          title="Ask AI Assistant"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2.5 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary transition-all shadow-sm relative"
          >
            <Bell className="w-5 h-5" />
            {summaryData?.unread_notifications_count > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {summaryData.unread_notifications_count}
              </span>
            )}
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-cardBg border border-borderColor rounded-2xl shadow-lg p-4 z-45 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-borderColor pb-2 mb-3">
                <h4 className="font-bold text-sm text-textPrimary">Recent Notifications</h4>
                {summaryData?.unread_notifications_count > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {summaryData?.notifications && summaryData.notifications.length > 0 ? (
                  summaryData.notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-left ${
                        n.is_read 
                          ? 'bg-background/40 border-borderColor/60 text-textSecondary' 
                          : 'bg-primary/5 border-primary/20 text-textPrimary hover:bg-primary/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold">{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1"></span>}
                      </div>
                      <p className="text-[10px] text-textSecondary mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[8px] text-textMuted mt-1 block">{n.created_at}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-textSecondary text-center py-4">No recent notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2.5 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary transition-all shadow-sm"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-borderColor hidden sm:block"></div>

        {/* User profile dropdown */}
        {user && (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 text-left focus:outline-none"
            >
              <img 
                src={user.avatar_url ? `${user.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                alt="avatar" 
                className="w-10 h-10 rounded-full border border-borderColor shadow-sm object-cover"
              />
              <ChevronDown className="w-4 h-4 text-textSecondary hidden sm:block" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-cardBg border border-borderColor rounded-2xl shadow-lg py-2 z-40 animate-fade-in">
                <div className="px-4 py-2 border-b border-borderColor">
                  <p className="text-sm font-bold text-textPrimary truncate">{user.full_name || 'WealthPilot AI User'}</p>
                  <p className="text-xs text-textSecondary truncate mt-0.5">{user.email}</p>
                </div>
                
                <Link 
                  to="/settings" 
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-textSecondary hover:text-textPrimary hover:bg-hoverBg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>View Profile</span>
                </Link>
                <Link 
                  to="/settings" 
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-textSecondary hover:text-textPrimary hover:bg-hoverBg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </Link>
                
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center space-x-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors border-t border-borderColor mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
