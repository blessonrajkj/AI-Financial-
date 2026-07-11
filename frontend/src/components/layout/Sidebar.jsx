import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  ScanLine, 
  LineChart, 
  Wallet, 
  MessageSquare, 
  Settings, 
  LogOut,
  Sparkles,
  Target,
  Coins,
  FileText,
  CreditCard,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, user } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Import Transactions', path: '/import', icon: UploadCloud },
    { name: 'AI Receipt Scanner', path: '/scanner', icon: ScanLine },
    { name: 'UPI Screenshot Scanner', path: '/upi-scanner', icon: ScanLine },
    { name: 'Budgets', path: '/budgets', icon: Wallet },
    { name: 'Savings Goals', path: '/savings', icon: Target },
    { name: 'Investments', path: '/investments', icon: Coins },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'AI Assistant', path: '/chat', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden"
        ></div>
      )}

      {/* Main Sidebar Shell */}
      <aside className={`fixed top-0 bottom-0 left-0 w-64 bg-sidebarBg border-r border-borderColor pt-24 px-4 z-20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Navigation list */}
        <ul className="space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pb-4">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink 
                to={item.path}
                onClick={toggleSidebar}
                className={({ isActive }) => `flex items-center px-4 py-3 rounded-xl transition-all duration-200 group text-textSecondary hover:text-textPrimary hover:bg-hoverBg ${isActive ? 'bg-primary/10 border-l-4 border-primary text-primary font-bold shadow-sm' : ''}`}
              >
                <item.icon className="w-5 h-5 transition duration-75" />
                <span className="ml-3 text-sm">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User Card & Logout */}
        <div className="absolute bottom-4 left-4 right-4 pt-4 border-t border-borderColor space-y-4">
          {user && (
            <div className="flex items-center space-x-3 p-2 bg-background/50 rounded-2xl border border-borderColor/60">
              <img 
                src={user.avatar_url ? `${user.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                alt="avatar" 
                className="w-10 h-10 rounded-full border border-borderColor shadow-sm object-cover"
              />
              <div className="overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate text-textPrimary">{user.full_name || 'WealthPilot AI User'}</p>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[10px] truncate text-textSecondary">{user.email}</p>
                </div>
                {/* Subscription Badge */}
                <span className="inline-block mt-1 text-[8px] uppercase tracking-wider font-extrabold bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                  PRO MEMBER
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={logout}
            className="flex items-center w-full p-3 text-danger rounded-xl hover:bg-danger/5 hover:text-danger/90 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;