import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle, 
  Calendar, 
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  RefreshCw,
  Activity,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const SubscriptionsPage = () => {
  const [data, setData] = useState({ summary: {}, upcoming_renewals: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);
  const [isAutopay, setIsAutopay] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/subscriptions?t=${Date.now()}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setBillingCycle('monthly');
    setNextBillingDate(new Date().toISOString().split('T')[0]);
    setIsActive(true);
    setIsAutopay(false);
    setShowModal(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingId(sub.id);
    setName(sub.name);
    setAmount(sub.amount);
    setBillingCycle(sub.billing_cycle);
    setNextBillingDate(sub.next_billing_date.split('T')[0]);
    setIsActive(sub.is_active);
    setIsAutopay(sub.is_autopay || false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      name,
      amount: parseFloat(amount),
      billing_cycle: billingCycle,
      next_billing_date: nextBillingDate + 'T12:00:00',
      is_active: isActive,
      is_autopay: isAutopay
    };

    try {
      if (editingId) {
        await axios.put(`${API_URL}/subscriptions/${editingId}`, payload);
        setSuccess('Subscription updated successfully!');
      } else {
        await axios.post(`${API_URL}/subscriptions`, payload);
        setSuccess('New subscription added successfully!');
      }
      setShowModal(false);
      fetchSubscriptions();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutopay = async (sub) => {
    setError('');
    setSuccess('');
    try {
      await axios.put(`${API_URL}/subscriptions/${sub.id}`, {
        is_autopay: !sub.is_autopay
      });
      setSuccess(`AutoPay toggled for ${sub.name}!`);
      fetchSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to update AutoPay preference.');
    }
  };

  const handleToggleActive = async (sub) => {
    setError('');
    setSuccess('');
    try {
      await axios.put(`${API_URL}/subscriptions/${sub.id}`, {
        is_active: !sub.is_active
      });
      setSuccess(`Subscription status toggled for ${sub.name}!`);
      fetchSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to update status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this subscription?')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/subscriptions/${id}`);
      setSuccess('Subscription deleted successfully!');
      fetchSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to delete subscription.');
    }
  };

  const summary = data.summary || {};
  const items = data.items || [];
  const upcoming = data.upcoming_renewals || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Subscriptions</h1>
          <p className="text-textSecondary mt-1">Monitor active recurring contracts, billing cycles, and automated payment deadlines</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primaryHover text-white text-sm font-bold rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subscription</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold flex items-center space-x-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overview summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Active Contracts</span>
              <span className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20"><CreditCard className="w-4 h-4" /></span>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">{summary.active_subscriptions_count || 0}</h3>
              <p className="text-[11px] text-textMuted font-medium mt-1">Tracked recurring payment lines</p>
            </div>
          </div>
        </div>

        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Monthly Overhead</span>
              <span className="p-2 bg-danger/10 text-danger rounded-xl border border-danger/20"><TrendingUp className="w-4 h-4" /></span>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">₹{(summary.monthly_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</h3>
              <p className="text-[11px] text-textMuted font-medium mt-1">Total recurring cost per month</p>
            </div>
          </div>
        </div>

        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Annual Overhead</span>
              <span className="p-2 bg-warning/10 text-warning rounded-xl border border-warning/20"><Activity className="w-4 h-4" /></span>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">₹{(summary.annual_cost || 0).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</h3>
              <p className="text-[11px] text-textMuted font-medium mt-1">Projected yearly subscription cost</p>
            </div>
          </div>
        </div>

        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Next AutoPay Date</span>
              <span className="p-2 bg-success/10 text-success rounded-xl border border-success/20"><Calendar className="w-4 h-4" /></span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-textPrimary tracking-tight">
                {summary.next_autopay_date ? new Date(summary.next_autopay_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'No AutoPays Active'}
              </h3>
              <p className="text-[11px] text-textMuted font-medium mt-1">Closest upcoming autopay cycle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Renewals and Health metrics */}
        <div className="space-y-6 lg:col-span-1">
          {/* Health Score Gauge */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-textPrimary mb-4">Subscription Health</h4>
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" className="stroke-borderColor fill-none" strokeWidth="4" />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="28" 
                    className={`fill-none transition-all duration-500 ${
                      (summary.health_score || 0) > 75 ? 'stroke-success' : 
                      (summary.health_score || 0) > 50 ? 'stroke-warning' : 'stroke-danger'
                    }`} 
                    strokeWidth="4" 
                    strokeDasharray={176} 
                    strokeDashoffset={176 - (176 * (summary.health_score || 0)) / 100} 
                  />
                </svg>
                <span className="absolute text-sm font-black text-textPrimary">{summary.health_score || 0}</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-wider">Health Rating</span>
                <p className="text-xs font-semibold text-textSecondary mt-0.5 leading-relaxed">
                  {summary.health_score_desc}
                </p>
              </div>
            </div>
          </div>

          {/* Upcoming Renewals list */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-textPrimary mb-4">Upcoming Renewals</h4>
            {upcoming.length > 0 ? (
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {upcoming.map((u) => {
                  const days = u.days_until;
                  const isOverdue = days < 0;
                  
                  return (
                    <div key={u.id} className="flex justify-between items-center bg-background border border-borderColor/60 rounded-xl p-3">
                      <div>
                        <h5 className="text-xs font-bold text-textPrimary">{u.name}</h5>
                        <span className="text-[10px] text-textSecondary block mt-0.5">
                          ₹{u.amount.toLocaleString()} ({u.billing_cycle})
                        </span>
                      </div>
                      <div className="text-right">
                        {isOverdue ? (
                          <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                            Overdue
                          </span>
                        ) : days === 0 ? (
                          <span className="text-[10px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            In {days} days
                          </span>
                        )}
                        {u.is_autopay && (
                          <span className="text-[9px] text-success block font-semibold mt-0.5">● AutoPay</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-textMuted text-xs">
                No active renewals
              </div>
            )}
          </div>
        </div>

        {/* Subscriptions Grid Ledger List */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <h4 className="text-sm font-bold text-textPrimary mb-4">Recurring Memberships Log</h4>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length > 0 ? (
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-textSecondary font-bold">
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3">Billing Cycle</th>
                    <th className="py-2.5 px-3">Next Bill Date</th>
                    <th className="py-2.5 px-3 text-center">AutoPay</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sub) => (
                    <tr key={sub.id} className="border-b border-borderColor/60 hover:bg-hoverBg/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-textPrimary">{sub.name}</td>
                      <td className="py-3 px-3 text-right font-bold text-textPrimary">₹{sub.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 capitalize text-textSecondary">{sub.billing_cycle}</td>
                      <td className="py-3 px-3 text-textSecondary">
                        {new Date(sub.next_billing_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button 
                          onClick={() => handleToggleAutopay(sub)}
                          className={`p-1.5 rounded-lg transition-colors inline-flex ${sub.is_autopay ? 'text-success hover:bg-success/5' : 'text-textMuted hover:bg-hoverBg'}`}
                        >
                          {sub.is_autopay ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button 
                          onClick={() => handleToggleActive(sub)}
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition-colors inline-block ${
                            sub.is_active 
                              ? 'bg-success/10 text-success hover:bg-success/20' 
                              : 'bg-textMuted/15 text-textMuted hover:bg-textMuted/25'
                          }`}
                        >
                          {sub.is_active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center space-x-1">
                          <button 
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 text-textSecondary hover:bg-hoverBg rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 text-textMuted hover:text-danger hover:bg-danger/5 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-2xl bg-background/50">
              <CreditCard className="w-8 h-8 text-textMuted mb-2" />
              <p className="text-xs font-semibold">No recurring payments logged</p>
              <p className="text-[10px] text-textMuted mt-0.5">Click "Add Subscription" above to register your contracts</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-cardBg border border-borderColor rounded-3xl p-6 shadow-xl relative animate-scale-up">
            <h3 className="text-lg font-bold text-textPrimary mb-4">
              {editingId ? 'Edit Subscription' : 'Add Subscription'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Service Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Netflix, Spotify, AWS"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Billing Cost (₹)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="299"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Billing Cycle</label>
                  <select 
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Next Billing Date</label>
                  <input 
                    type="date" 
                    required
                    value={nextBillingDate}
                    onChange={(e) => setNextBillingDate(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4.5 h-4.5 accent-primary border border-borderColor rounded focus:outline-none"
                  />
                  <span className="text-xs font-bold text-textSecondary">Active Membership</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isAutopay}
                    onChange={(e) => setIsAutopay(e.target.checked)}
                    className="w-4.5 h-4.5 accent-primary border border-borderColor rounded focus:outline-none"
                  />
                  <span className="text-xs font-bold text-textSecondary">AutoPay Enabled</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-borderColor">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 h-11 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md transition-colors text-sm"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
