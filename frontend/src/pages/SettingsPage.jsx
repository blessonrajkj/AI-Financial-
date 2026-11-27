import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';
import { useNavigate } from 'react-router-dom';
import Select from '../components/ui/Select';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Database, 
  Plus, 
  Check, 
  Trash2, 
  Globe, 
  Laptop, 
  Smartphone, 
  Eye, 
  EyeOff, 
  Download, 
  AlertTriangle,
  Settings,
  X,
  CreditCard,
  Building,
  Key,
  ShieldAlert
} from 'lucide-react';
import { API_URL } from '../services/api';

const SUPPORTED_BANKS = [
  "SBI", "HDFC", "ICICI", "Axis", "Kotak", "Canara", 
  "Indian Bank", "Bank of Baroda", "Punjab National Bank", 
  "Union Bank", "IDFC", "Yes Bank", "Federal Bank", 
  "South Indian Bank", "Indian Overseas Bank", "UCO", 
  "Central Bank", "Post Office Savings"
];

const SettingsPage = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useThemeAndRefresh();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState('personal');

  // UI feedback states
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // Settings & Profile DB States
  const [dbSettings, setDbSettings] = useState(null);
  const [banks, setBanks] = useState([]);
  const [profileData, setProfileData] = useState(null);

  // Modal control
  const [showBankModal, setShowBankModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // Edit / Link State variables
  const [editingBank, setEditingBank] = useState(null);
  const [editNickname, setEditNickname] = useState('');

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Weak', color: 'bg-danger' });

  // Two Factor authentication mock state
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('App');

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    bank_name: 'SBI',
    account_holder: user?.full_name || '',
    account_number: '',
    confirm_account_number: '',
    ifsc_code: '',
    branch: '',
    account_type: 'Savings',
    nickname: '',
    is_primary: false
  });
  const [bankFormErrors, setBankFormErrors] = useState({});

  // Sessions Mock state (which can be revoked interactively)
  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome on Windows (Current)', ip: '192.168.1.1', location: 'Mumbai, India', date: 'Active now', current: true },
    { id: '2', device: 'PariView App on iPhone 15', ip: '103.45.67.89', location: 'Mumbai, India', date: 'Yesterday, 19:40' },
    { id: '3', device: 'Safari on Macbook Pro', ip: '103.45.67.92', location: 'Pune, India', date: 'July 10, 11:22' }
  ]);

  // Delete confirm email input
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  // Toast helper
  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch Settings, Banks, and Profile
  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, banksRes, profileRes] = await Promise.all([
        axios.get(`${API_URL}/settings`),
        axios.get(`${API_URL}/banks`),
        axios.get(`${API_URL}/profile`)
      ]);
      setDbSettings(settingsRes.data);
      setBanks(banksRes.data);
      setProfileData(profileRes.data);
    } catch (err) {
      console.error("Failed to load settings data", err);
      triggerToast("Error loading user settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync Preferences (Theme toggle in DB)
  const handleThemeChangeInDB = async (newTheme) => {
    if (theme !== newTheme) {
      toggleTheme(); // context
    }
    if (dbSettings) {
      try {
        const updated = await axios.put(`${API_URL}/settings`, { ...dbSettings, theme: newTheme });
        setDbSettings(updated.data);
        triggerToast(`Theme set to ${newTheme}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Sync Language in DB
  const handleLanguageChange = async (newLang) => {
    if (profileData) {
      try {
        const res = await axios.put(`${API_URL}/profile`, { preferred_language: newLang });
        setProfileData(res.data);
        triggerToast(`Language updated to ${newLang}`);
      } catch (err) {
        console.error(err);
        triggerToast("Failed to update language", "error");
      }
    }
  };

  // Sync Notification Checkboxes in DB
  const handleNotificationToggle = async (key, val) => {
    if (!dbSettings) return;
    try {
      const updatedPayload = { ...dbSettings, [key]: val };
      const res = await axios.put(`${API_URL}/settings`, updatedPayload);
      setDbSettings(res.data);
      triggerToast("Notifications preference saved");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update preferences", "error");
    }
  };

  // Password strength checker logic
  const checkPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    let text = 'Weak';
    let color = 'bg-danger';
    if (score === 2) {
      text = 'Fair';
      color = 'bg-warning';
    } else if (score === 3) {
      text = 'Good';
      color = 'bg-primary';
    } else if (score === 4) {
      text = 'Strong';
      color = 'bg-success';
    }

    setPasswordStrength({ score, text, color });
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      triggerToast("Passwords do not match", "error");
      return;
    }
    if (passwordStrength.score < 2) {
      triggerToast("New password is too weak", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/change-password`, {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });
      triggerToast("Password updated successfully!");
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.detail || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2FA Setup
  const handleToggle2FA = async (enable) => {
    if (enable) {
      setTwoFactorMethod('App');
      setShow2FAModal(true);
    } else {
      if (window.confirm("Are you sure you want to disable Two-Factor Authentication?")) {
        try {
          const res = await axios.put(`${API_URL}/settings`, { ...dbSettings, two_factor_enabled: false });
          setDbSettings(res.data);
          triggerToast("2FA disabled successfully.");
        } catch (err) {
          console.error(err);
          triggerToast("Failed to update 2FA status.", "error");
        }
      }
    }
  };

  const handleVerify2FAOTP = async (e) => {
    e.preventDefault();
    if (twoFactorOtp.length !== 6 || isNaN(twoFactorOtp)) {
      triggerToast("Please enter a valid 6-digit OTP code", "error");
      return;
    }
    // Mock verify OTP & set enabled in DB
    try {
      const res = await axios.put(`${API_URL}/settings`, { 
        ...dbSettings, 
        two_factor_enabled: true,
        two_factor_method: twoFactorMethod
      });
      setDbSettings(res.data);
      setShow2FAModal(false);
      setTwoFactorOtp('');
      triggerToast("Two-Factor Authentication is now active!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to verify OTP code", "error");
    }
  };

  // Bank Account linking logic
  const handleBankInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setBankForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateBankForm = () => {
    const errors = {};
    if (!bankForm.account_holder.trim()) errors.account_holder = "Account holder name is required";
    
    if (!bankForm.account_number) {
      errors.account_number = "Account number is required";
    } else if (bankForm.account_number.length < 9 || bankForm.account_number.length > 18) {
      errors.account_number = "Account number must be between 9 and 18 digits";
    }

    if (bankForm.account_number !== bankForm.confirm_account_number) {
      errors.confirm_account_number = "Account numbers do not match";
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!bankForm.ifsc_code) {
      errors.ifsc_code = "IFSC code is required";
    } else if (!ifscRegex.test(bankForm.ifsc_code.toUpperCase())) {
      errors.ifsc_code = "Invalid format. E.g. SBIN0001234 (4 letters, 0, 6 alpha-numeric)";
    }

    setBankFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLinkBankSubmit = async (e) => {
    e.preventDefault();
    if (!validateBankForm()) return;

    setLoading(true);
    try {
      const payload = {
        bank_name: bankForm.bank_name,
        account_holder: bankForm.account_holder,
        account_number: bankForm.account_number,
        ifsc_code: bankForm.ifsc_code.toUpperCase(),
        branch: bankForm.branch || "Main Branch",
        account_type: bankForm.account_type,
        nickname: bankForm.nickname || bankForm.bank_name,
        is_primary: bankForm.is_primary
      };

      await axios.post(`${API_URL}/banks/link`, payload);
      triggerToast("Bank account linked successfully!");
      setShowBankModal(false);
      
      // Reset form
      setBankForm({
        bank_name: 'SBI',
        account_holder: user?.full_name || '',
        account_number: '',
        confirm_account_number: '',
        ifsc_code: '',
        branch: '',
        account_type: 'Savings',
        nickname: '',
        is_primary: false
      });
      
      // Refresh banks list
      const banksRes = await axios.get(`${API_URL}/banks`);
      setBanks(banksRes.data);
    } catch (err) {
      console.error(err);
      triggerToast(err.response?.data?.detail || "Failed to link bank account.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBankPrimary = async (bankId, isCurrentPrimary) => {
    if (isCurrentPrimary) return; // already primary
    try {
      await axios.put(`${API_URL}/banks/${bankId}`, { is_primary: true });
      triggerToast("Primary bank account updated");
      const banksRes = await axios.get(`${API_URL}/banks`);
      setBanks(banksRes.data);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update primary bank account.", "error");
    }
  };

  const handleUnlinkBank = async (bankId) => {
    if (!window.confirm("Are you sure you want to unlink this bank account?")) return;
    try {
      await axios.delete(`${API_URL}/banks/${bankId}`);
      triggerToast("Bank account unlinked.");
      const banksRes = await axios.get(`${API_URL}/banks`);
      setBanks(banksRes.data);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to unlink bank account.", "error");
    }
  };

  const handleStartEditBank = (bank) => {
    setEditingBank(bank);
    setEditNickname(bank.nickname || bank.bank_name);
  };

  const handleSaveBankNickname = async () => {
    if (!editNickname.trim()) return;
    try {
      await axios.put(`${API_URL}/banks/${editingBank.id}`, { nickname: editNickname });
      triggerToast("Bank nickname updated");
      setEditingBank(null);
      const banksRes = await axios.get(`${API_URL}/banks`);
      setBanks(banksRes.data);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update bank nickname.", "error");
    }
  };

  // Revoke Mock Session
  const handleRevokeSession = (id) => {
    if (window.confirm("Are you sure you want to revoke this session?")) {
      setSessions(prev => prev.filter(s => s.id !== id));
      triggerToast("Login session revoked successfully.");
    }
  };

  // Privacy Actions
  const handleExportProfileJSON = async () => {
    try {
      const res = await axios.get(`${API_URL}/profile/export`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `pariview_profile_export.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast("Profile data downloaded successfully.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to export profile data", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      triggerToast("Entered email address does not match", "error");
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/profile`);
      triggerToast("Account deleted. Logging out...", "success");
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete account.", "error");
    } finally {
      setLoading(false);
    }
  };

  const maskAccountNumber = (num) => {
    if (!num) return '';
    const visibleLength = 4;
    if (num.length <= visibleLength) return num;
    return `XXXXXXXX${num.slice(-visibleLength)}`;
  };

  // Nav menu tabs list
  const navTabs = [
    { id: 'personal', name: 'Personal Info', icon: User },
    { id: 'security', name: 'Security & Password', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'banks', name: 'Connected Banks', icon: Database },
    { id: 'sessions', name: 'Devices & Sessions', icon: Laptop },
    { id: 'preferences', name: 'Preferences', icon: Globe },
    { id: 'privacy', name: 'Privacy & Data', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed top-24 right-6 z-50 flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
          toast.type === 'error' 
            ? 'bg-danger/10 border-danger/20 text-danger' 
            : 'bg-success/10 border-success/20 text-success'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Account Settings</h1>
        <p className="text-textSecondary mt-1">Configure your personal preferences, connections, security, and data settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar / Mobile Scrollable Tabs */}
        <div className="flex lg:flex-col overflow-x-auto pb-2 lg:pb-0 space-x-2 lg:space-x-0 lg:space-y-1.5 lg:col-span-1 border-b lg:border-b-0 border-borderColor">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-textSecondary hover:bg-hoverBg hover:text-textPrimary bg-surface border border-borderColor lg:border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="lg:col-span-3 glass-panel p-4 sm:p-6 shadow-soft relative overflow-hidden rounded-2xl sm:rounded-3xl">
          
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Personal Information Summary</h3>
                <p className="text-xs text-textSecondary mt-0.5">Quick view of core credentials. Other details can be configured on your profile.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background/50 border border-borderColor rounded-2xl p-5">
                <div>
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Full Name</span>
                  <span className="text-sm font-semibold text-textPrimary">{user?.full_name || 'PariView User'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-textPrimary">{user?.email}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Username</span>
                  <span className="text-sm font-semibold text-textPrimary">@{profileData?.username || 'user'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Preferred Currency</span>
                  <span className="text-sm font-semibold text-textPrimary">{profileData?.preferred_currency || 'INR'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => navigate('/profile')}
                  className="px-5 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/20 transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>Configure Full Profile Details</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORDS */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {/* Password update form */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-textPrimary">Change Password</h3>
                  <p className="text-xs text-textSecondary mt-0.5">Keep your account safe by updating your password periodically</p>
                </div>

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full h-11 pl-4 pr-11 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary p-1 rounded-lg transition-colors focus:outline-none cursor-pointer z-10"
                      >
                        {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.new ? "text" : "password"}
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPasswordForm(prev => ({ ...prev, newPassword: val }));
                          checkPasswordStrength(val);
                        }}
                        className="w-full h-11 pl-4 pr-11 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary p-1 rounded-lg transition-colors focus:outline-none cursor-pointer z-10"
                      >
                        {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {passwordForm.newPassword && (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-textSecondary">
                          <span>Password Strength: <b className="text-textPrimary">{passwordStrength.text}</b></span>
                          <span>{passwordStrength.score}/4 criteria</span>
                        </div>
                        <div className="h-1.5 w-full bg-borderColor rounded-full overflow-hidden">
                          <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${(passwordStrength.score / 4) * 100}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full h-11 pl-4 pr-11 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary p-1 rounded-lg transition-colors focus:outline-none cursor-pointer z-10"
                      >
                        {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    <span>Update Password</span>
                  </button>
                </form>
              </div>

              {/* 2FA Section */}
              <div className="space-y-4 border-t border-borderColor pt-6">
                <div>
                  <h4 className="text-sm font-bold text-textPrimary">Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs text-textSecondary mt-0.5">Provide an additional level of visual safety to your transactions</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-borderColor/60">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-textPrimary">Two-Factor Shield</h5>
                    <p className="text-[10px] text-textSecondary">
                      Status: <span className={dbSettings?.two_factor_enabled ? "text-success font-bold" : "text-textMuted font-bold"}>
                        {dbSettings?.two_factor_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleToggle2FA(!dbSettings?.two_factor_enabled)}
                    className={`px-4 py-2 font-bold text-xs rounded-xl border transition-all ${
                      dbSettings?.two_factor_enabled 
                        ? 'bg-danger/10 hover:bg-danger/20 border-danger/20 text-danger' 
                        : 'bg-primary hover:bg-primaryHover text-white border-transparent shadow-sm'
                    }`}
                  >
                    {dbSettings?.two_factor_enabled ? "Disable 2FA" : "Enable 2FA"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Alert Notifications</h3>
                <p className="text-xs text-textSecondary mt-0.5">Configure which channels and alerts you want to activate</p>
              </div>

              {dbSettings && (
                <div className="space-y-6">
                  {/* Channels */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-textMuted uppercase tracking-wider">Notification Channels</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <label className="flex items-center space-x-3 p-4 bg-background rounded-xl border border-borderColor/60 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={dbSettings.push_notifications}
                          onChange={(e) => handleNotificationToggle('push_notifications', e.target.checked)}
                          className="w-4 h-4 text-primary bg-background border-borderColor rounded focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-textPrimary">Push Notifications</span>
                      </label>

                      <label className="flex items-center space-x-3 p-4 bg-background rounded-xl border border-borderColor/60 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={dbSettings.email_notifications}
                          onChange={(e) => handleNotificationToggle('email_notifications', e.target.checked)}
                          className="w-4 h-4 text-primary bg-background border-borderColor rounded focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-textPrimary">Email Alerts</span>
                      </label>

                      <label className="flex items-center space-x-3 p-4 bg-background rounded-xl border border-borderColor/60 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={dbSettings.sms_notifications}
                          onChange={(e) => handleNotificationToggle('sms_notifications', e.target.checked)}
                          className="w-4 h-4 text-primary bg-background border-borderColor rounded focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-textPrimary">SMS Reminders</span>
                      </label>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-bold text-textMuted uppercase tracking-wider">Alert Subscriptions</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'bill_reminders', label: 'Bill Reminders', desc: 'Alerts for upcoming subscription renewals & utilities bills' },
                        { key: 'investment_alerts', label: 'Investment Alerts', desc: 'Updates on your assets prices & portfolio performance' },
                        { key: 'budget_alerts', label: 'Budget Alerts', desc: 'Overspending warnings and category limit alerts' },
                        { key: 'subscription_alerts', label: 'Subscription Renewals', desc: 'Notifies before active trials/memberships renew' },
                        { key: 'salary_credit_alerts', label: 'Salary Credits', desc: 'Real-time alert when your monthly salary clears' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-start space-x-3 p-4 bg-background rounded-xl border border-borderColor/60 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={dbSettings[item.key]}
                            onChange={(e) => handleNotificationToggle(item.key, e.target.checked)}
                            className="w-4 h-4 text-primary bg-background border-borderColor rounded focus:ring-primary mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-bold text-textPrimary block">{item.label}</span>
                            <span className="text-[10px] text-textSecondary leading-snug block mt-0.5">{item.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONNECTED BANKS */}
          {activeTab === 'banks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-textPrimary">Connected Bank Accounts</h3>
                  <p className="text-xs text-textSecondary mt-0.5">Manage and sync bank credentials for automated transaction retrieval</p>
                </div>
                <button 
                  onClick={() => setShowBankModal(true)}
                  className="px-4 py-2.5 bg-primary hover:bg-primaryHover text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Link Bank Account</span>
                </button>
              </div>

              {/* Banks List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banks.length > 0 ? (
                  banks.map((bank) => (
                    <div 
                      key={bank.id} 
                      className={`p-4 bg-background rounded-2xl border ${
                        bank.is_primary ? 'border-primary' : 'border-borderColor/60'
                      } flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden`}
                    >
                      {/* Accent primary badge line */}
                      {bank.is_primary && <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>}

                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Circular initial logo */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm ${
                            bank.bank_name === 'SBI' ? 'bg-blue-600' :
                            bank.bank_name === 'HDFC' ? 'bg-blue-900' :
                            bank.bank_name === 'ICICI' ? 'bg-orange-500' :
                            bank.bank_name === 'Axis' ? 'bg-red-800' :
                            bank.bank_name === 'Kotak' ? 'bg-red-600' : 'bg-secondary'
                          }`}>
                            {bank.bank_name.slice(0, 2)}
                          </div>
                          <div>
                            {editingBank?.id === bank.id ? (
                              <div className="flex items-center space-x-2">
                                <input 
                                  type="text" 
                                  value={editNickname}
                                  onChange={(e) => setEditNickname(e.target.value)}
                                  className="h-7 px-2 border border-borderColor bg-background text-textPrimary text-xs rounded"
                                />
                                <button onClick={handleSaveBankNickname} className="p-1 bg-success/20 text-success rounded"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingBank(null)} className="p-1 bg-hoverBg text-textSecondary rounded"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5">
                                <h6 className="text-sm font-bold text-textPrimary">{bank.nickname || bank.bank_name}</h6>
                                <button 
                                  onClick={() => handleStartEditBank(bank)}
                                  className="text-[10px] text-primary font-semibold hover:underline"
                                >
                                  (Edit)
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] text-textSecondary mt-0.5">{bank.bank_name} • {bank.account_type}</p>
                            <p className="text-xs font-mono font-bold text-textPrimary mt-1">{maskAccountNumber(bank.account_number)}</p>
                          </div>
                        </div>

                        {bank.is_primary ? (
                          <span className="text-[9px] font-extrabold uppercase bg-primary/15 text-primary px-2 py-0.5 rounded border border-primary/20">
                            Primary
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleToggleBankPrimary(bank.id, bank.is_primary)}
                            className="text-[10px] font-bold text-textSecondary hover:text-primary transition-colors hover:underline"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-borderColor/40 pt-3">
                        <span className="text-[9px] text-textMuted font-mono uppercase">IFSC: {bank.ifsc_code}</span>
                        <button 
                          onClick={() => handleUnlinkBank(bank.id)}
                          className="text-danger hover:text-danger/80 p-1.5 hover:bg-danger/5 rounded-lg transition-colors"
                          title="Unlink Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 p-8 text-center border-2 border-dashed border-borderColor rounded-2xl text-textSecondary">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-textMuted" />
                    <p className="text-sm font-bold">No connected bank accounts yet</p>
                    <p className="text-xs text-textMuted mt-1">Link your accounts to synchronize ledger transactions instantly</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DEVICES & SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">Security Logs & Active Devices</h3>
                <p className="text-xs text-textSecondary mt-0.5">Control active browser and device sessions connected to your profile</p>
              </div>

              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-4 bg-background rounded-xl border border-borderColor/60 flex items-center justify-between">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 bg-hoverBg border border-borderColor rounded-xl text-textPrimary">
                        {sess.device.includes('iPhone') ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <h6 className="text-xs font-bold text-textPrimary">{sess.device}</h6>
                        <p className="text-[10px] text-textSecondary mt-0.5">IP Address: {sess.ip} • {sess.location}</p>
                        <p className="text-[9px] text-textMuted font-mono mt-0.5">{sess.date}</p>
                      </div>
                    </div>
                    
                    {!sess.current && (
                      <button 
                        onClick={() => handleRevokeSession(sess.id)}
                        className="px-3 py-1.5 bg-danger/10 hover:bg-danger/20 text-danger text-[11px] font-bold rounded-lg transition-colors border border-danger/10"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">System & Localization Preferences</h3>
                <p className="text-xs text-textSecondary mt-0.5">Customize theme, language and visual layouts of the console</p>
              </div>

              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider">Visual Interface Theme</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleThemeChangeInDB('light')}
                      className={`p-4 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                        theme === 'light' 
                          ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                          : 'border-borderColor/60 text-textSecondary bg-background'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Light Interface</span>
                    </button>
                    <button 
                      onClick={() => handleThemeChangeInDB('dark')}
                      className={`p-4 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                        theme === 'dark' 
                          ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                          : 'border-borderColor/60 text-textSecondary bg-background'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>Dark Interface</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider">Localization Language</label>
                  <Select 
                    value={profileData?.preferred_language || 'English'}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    options={[
                      { value: 'English', label: 'English (United States)' },
                      { value: 'Hindi', label: 'Hindi (India)' },
                      { value: 'Spanish', label: 'Spanish (Spain)' },
                      { value: 'French', label: 'French (France)' },
                      { value: 'German', label: 'German (Germany)' }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY & DANGER ZONE */}
          {activeTab === 'privacy' && (
            <div className="space-y-8">
              {/* Data Export downloads */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-textPrimary">Export Profile Data</h3>
                  <p className="text-xs text-textSecondary mt-0.5">Export and download full backup of your account files and financial data</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleExportProfileJSON}
                    className="p-4 bg-background border border-borderColor rounded-2xl flex items-center justify-between text-left hover:border-primary/50 hover:bg-hoverBg/50 transition-all group"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-textPrimary block">Download Profile Info</span>
                      <span className="text-[10px] text-textSecondary block">All credentials, locations & preferences (JSON format)</span>
                    </div>
                    <Download className="w-5 h-5 text-textSecondary group-hover:text-primary transition-colors" />
                  </button>

                  <a 
                    href={`${API_URL}/analytics/export/csv`}
                    download
                    className="p-4 bg-background border border-borderColor rounded-2xl flex items-center justify-between text-left hover:border-primary/50 hover:bg-hoverBg/50 transition-all group"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-textPrimary block">Download Transactions CSV</span>
                      <span className="text-[10px] text-textSecondary block">Full records of ledger ledgers in CSV format</span>
                    </div>
                    <Download className="w-5 h-5 text-textSecondary group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-borderColor pt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-danger flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Danger Zone</span>
                  </h4>
                  <p className="text-xs text-textSecondary mt-0.5">Destructive actions cannot be undone. Exercise extreme caution.</p>
                </div>

                <div className="p-4 bg-danger/5 rounded-2xl border border-danger/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-textPrimary">Permanently Delete Account</h5>
                    <p className="text-[10px] text-textSecondary mt-0.5">Delete all transactions, wallets, receipts, budgets & security backups forever.</p>
                  </div>
                  <button 
                    onClick={() => { setDeleteConfirmEmail(''); setShowDeleteModal(true); }}
                    className="px-4 py-2 bg-danger hover:bg-danger/90 text-white font-bold text-xs rounded-xl shadow-md shadow-danger/25 transition-all"
                  >
                    Delete Account
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* 2FA SETUP MODAL */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setShow2FAModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-hoverBg text-textSecondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center space-y-2">
              <Key className="w-8 h-8 mx-auto text-primary" />
              <h4 className="text-lg font-bold text-textPrimary">Verify Authentication App</h4>
              <p className="text-xs text-textSecondary">Scan the QR code with Google Authenticator or enter verification OTP code below</p>
            </div>

            {/* Mock QR Code */}
            <div className="w-40 h-40 mx-auto bg-white p-2 rounded-2xl border border-borderColor flex items-center justify-center">
              {/* Structured grid simulator */}
              <div className="grid grid-cols-4 gap-1 w-full h-full opacity-80">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className={`rounded ${i % 3 === 0 || i % 5 === 2 ? 'bg-black' : 'bg-transparent'}`}></div>
                ))}
              </div>
            </div>

            <form onSubmit={handleVerify2FAOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 text-center">6-Digit Verification Code</label>
                <input 
                  type="text" 
                  maxLength="6"
                  required
                  placeholder="000000"
                  value={twoFactorOtp}
                  onChange={(e) => setTwoFactorOtp(e.target.value)}
                  className="w-full h-11 text-center bg-background border border-borderColor rounded-xl text-textPrimary text-lg font-bold tracking-widest focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center shadow-md shadow-primary/20 transition-all"
              >
                Verify & Activate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONNECTED BANK ACC LINK MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowBankModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-hoverBg text-textSecondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <Building className="w-6 h-6 text-primary" />
              <h4 className="text-lg font-bold text-textPrimary">Link New Bank Account</h4>
            </div>

            <form onSubmit={handleLinkBankSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Bank Name *</label>
                  <Select 
                    name="bank_name"
                    value={bankForm.bank_name}
                    onChange={handleBankInputChange}
                    options={SUPPORTED_BANKS}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Account Holder *</label>
                  <input 
                    type="text" 
                    name="account_holder"
                    required
                    value={bankForm.account_holder}
                    onChange={handleBankInputChange}
                    className={`w-full h-11 px-3 bg-background border ${bankFormErrors.account_holder ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all`}
                  />
                  {bankFormErrors.account_holder && <span className="text-[10px] text-danger font-semibold mt-1 block">{bankFormErrors.account_holder}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Account Number *</label>
                  <input 
                    type="password" 
                    name="account_number"
                    required
                    value={bankForm.account_number}
                    onChange={handleBankInputChange}
                    className={`w-full h-11 px-3 bg-background border ${bankFormErrors.account_number ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all`}
                  />
                  {bankFormErrors.account_number && <span className="text-[10px] text-danger font-semibold mt-1 block">{bankFormErrors.account_number}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Confirm Account *</label>
                  <input 
                    type="text" 
                    name="confirm_account_number"
                    required
                    value={bankForm.confirm_account_number}
                    onChange={handleBankInputChange}
                    className={`w-full h-11 px-3 bg-background border ${bankFormErrors.confirm_account_number ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all`}
                  />
                  {bankFormErrors.confirm_account_number && <span className="text-[10px] text-danger font-semibold mt-1 block">{bankFormErrors.confirm_account_number}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">IFSC Code *</label>
                  <input 
                    type="text" 
                    name="ifsc_code"
                    required
                    placeholder="e.g. SBIN0001234"
                    value={bankForm.ifsc_code}
                    onChange={handleBankInputChange}
                    className={`w-full h-11 px-3 bg-background border ${bankFormErrors.ifsc_code ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all`}
                  />
                  {bankFormErrors.ifsc_code && <span className="text-[10px] text-danger font-semibold mt-1 block">{bankFormErrors.ifsc_code}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Branch Name</label>
                  <input 
                    type="text" 
                    name="branch"
                    placeholder="e.g. Main Branch"
                    value={bankForm.branch}
                    onChange={handleBankInputChange}
                    className="w-full h-11 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Account Type</label>
                  <Select 
                    name="account_type"
                    value={bankForm.account_type}
                    onChange={handleBankInputChange}
                    options={['Savings', 'Current', 'Salary', 'Joint']}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Nickname</label>
                  <input 
                    type="text" 
                    name="nickname"
                    placeholder="e.g. My Savings"
                    value={bankForm.nickname}
                    onChange={handleBankInputChange}
                    className="w-full h-11 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox" 
                  name="is_primary"
                  id="is_primary"
                  checked={bankForm.is_primary}
                  onChange={handleBankInputChange}
                  className="w-4 h-4 text-primary bg-background border-borderColor rounded focus:ring-primary" 
                />
                <label htmlFor="is_primary" className="text-xs font-bold text-textPrimary cursor-pointer">Set as primary bank account</label>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-borderColor/40">
                <button 
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="w-1/2 h-11 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  <span>Link Bank</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRM MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-hoverBg text-textSecondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-lg font-bold text-textPrimary">Delete Your Account?</h4>
              <p className="text-xs text-textSecondary leading-relaxed">
                This is a permanent, destructive action. You will lose all your dashboards, linked bank records, transactions files, and budget planning records instantly.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-extrabold text-textSecondary uppercase tracking-wider mb-2 text-center">
                  To confirm, type <b className="text-danger font-mono font-black">{user?.email}</b> below
                </label>
                <input 
                  type="text" 
                  placeholder={user?.email}
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  className="w-full h-11 text-center bg-background border border-danger/30 rounded-xl text-textPrimary text-sm focus:outline-none focus:border-danger transition-all font-semibold"
                />
              </div>
              <button 
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmEmail !== user?.email}
                className="w-full h-11 bg-danger hover:bg-danger/95 text-white font-bold rounded-xl flex items-center justify-center shadow-md shadow-danger/25 transition-all disabled:opacity-40"
              >
                <span>Permanently Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;