import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Bell, Shield, Database, Plus, Check } from 'lucide-react';

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateProfile(fullName, email, password);
      setSuccess('Profile updated successfully!');
      setPassword('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile Settings', icon: User },
    { id: 'security', name: 'Security & Auth', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'integrations', name: 'Connected Banks', icon: Database }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Settings</h1>
        <p className="text-textSecondary mt-1">Configure your personal preferences, accounts, and connections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left tabs menu */}
        <div className="space-y-1.5 lg:col-span-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-colors ${activeTab === tab.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-textSecondary hover:bg-hoverBg hover:text-textPrimary'}`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tab Content */}
        <div className="lg:col-span-3 bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Personal Profile</h3>
                <p className="text-xs text-textSecondary mt-0.5">Update your visual profile and credentials</p>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold">
                  {success}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">New Password (Leave empty to keep current)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Security Settings</h3>
                <p className="text-xs text-textSecondary mt-0.5">Control two-factor settings, login sessions, and safety logs</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-borderColor/60">
                  <div>
                    <h5 className="text-sm font-bold text-textPrimary">Two-Factor Authentication</h5>
                    <p className="text-xs text-textSecondary mt-0.5">Add an extra layer of protection to your profile</p>
                  </div>
                  <button className="px-4 py-2 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold text-xs rounded-lg border border-borderColor transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Alert Notifications</h3>
                <p className="text-xs text-textSecondary mt-0.5">Manage which events trigger notifications</p>
              </div>

              <div className="space-y-3">
                {['Overspending limit warning', 'Weekly summaries', 'RAG Chat AI notifications', 'Monthly reports ready'].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 py-1">
                    <input 
                      type="checkbox" 
                      defaultChecked 
                      className="w-4 h-4 text-primary bg-background border-borderColor rounded focus:ring-primary" 
                    />
                    <span className="text-sm text-textPrimary font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Connected Banks</h3>
                <p className="text-xs text-textSecondary mt-0.5">Link your banks via Plaid/Salt Edge to sync real-time balances</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-2xl border border-borderColor/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">H</div>
                    <div>
                      <h6 className="text-sm font-bold text-textPrimary">HDFC Bank</h6>
                      <p className="text-[10px] text-success font-semibold mt-0.5">● Connected</p>
                    </div>
                  </div>
                  <span className="p-1 rounded-full bg-success/20 text-success"><Check className="w-4 h-4" /></span>
                </div>

                <button className="p-4 rounded-2xl border-2 border-dashed border-borderColor hover:border-primary/50 flex items-center justify-center space-x-2 text-textSecondary hover:text-primary transition-all group">
                  <Plus className="w-5 h-5 group-hover:scale-105 transition-transform" />
                  <span className="text-sm font-bold">Link New Bank Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;