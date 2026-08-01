import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Wallet, AlertTriangle, Check, AlertCircle, Pencil, Trash2, X, TrendingUp } from 'lucide-react';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const BudgetsPage = () => {
  const { refreshTrigger, invalidateCache } = useThemeAndRefresh();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add/Edit modal states
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null); // null = adding, object = editing

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null or budget object

  // Form states
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-07"

  // Metadata categories list
  const [categoriesList, setCategoriesList] = useState([]);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/budgets?t=${Date.now()}`);
      setBudgets(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch budgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions/categories/all`);
      setCategoriesList(res.data);
    } catch (err) {
      console.error("Failed to load budgets categories", err);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [refreshTrigger]);

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const openAddModal = () => {
    setEditingBudget(null);
    setCategory(categoriesList.filter(c => c.type === 'expense')[0]?.name || 'Shopping');
    setAmount('');
    setMonth(new Date().toISOString().slice(0, 7));
    setError('');
    setShowModal(true);
  };

  const openEditModal = (b) => {
    setEditingBudget(b);
    setCategory(typeof b.category === 'object' ? b.category.name : b.category);
    setAmount(b.amount.toString());
    // reconstruct YYYY-MM from b.month, b.year
    const mm = String(b.month).padStart(2, '0');
    setMonth(`${b.year}-${mm}`);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Resolve category ID
      const existingCategory = categoriesList.find(
        c => c.name.toLowerCase() === category.toLowerCase()
      );
      if (!existingCategory) {
        throw new Error(`Category "${category}" not found. Add a transaction with this category first.`);
      }

      const [yearStr, monthStr] = month.split('-');
      const parsedYear = parseInt(yearStr);
      const parsedMonth = parseInt(monthStr);

      if (editingBudget) {
        // Edit existing budget
        await axios.put(`${API_URL}/budgets/${editingBudget.id}`, {
          category_id: existingCategory.id,
          amount: parseFloat(amount),
          month: parsedMonth,
          year: parsedYear
        });
        setSuccess('Budget updated successfully!');
      } else {
        // Create new budget
        await axios.post(`${API_URL}/budgets`, {
          category_id: existingCategory.id,
          amount: parseFloat(amount),
          month: parsedMonth,
          year: parsedYear
        });
        setSuccess('Budget limit created successfully!');
      }

      setShowModal(false);
      await fetchBudgets();
      invalidateCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to save budget.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (b) => {
    setDeleteConfirm(null);
    setError('');
    try {
      await axios.delete(`${API_URL}/budgets/${b.id}`);
      setSuccess(`Budget for "${typeof b.category === 'object' ? b.category.name : b.category}" deleted.`);
      await fetchBudgets();
      invalidateCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to delete budget.');
    }
  };

  // Determine progress bar color class
  const getBarColor = (pct, barColor) => {
    if (barColor === 'dark_red' || pct > 100) return 'bg-red-700';
    if (barColor === 'red' || pct >= 91) return 'bg-danger';
    if (barColor === 'yellow' || pct >= 71) return 'bg-warning';
    return 'bg-success';
  };

  const getStatusBadge = (pct, statusLabel) => {
    if (pct > 100) return { label: 'Exceeded', cls: 'text-red-700 bg-red-700/10 border-red-700/20' };
    if (pct >= 91) return { label: 'Critical', cls: 'text-danger bg-danger/10 border-danger/20' };
    if (pct >= 71) return { label: 'Near Limit', cls: 'text-warning bg-warning/10 border-warning/20' };
    return { label: 'On Track', cls: 'text-success bg-success/10 border-success/20' };
  };

  const expenseCategories = categoriesList.filter(c => c.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="doppel-shell relative overflow-hidden">
        <div className="glow-orb-primary -top-20 -left-20 w-80 h-80" />
        <div className="doppel-core px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Capital Control
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-textPrimary">Category Budgets</h1>
            <p className="text-xs text-textMuted mt-1 font-medium">Set monthly category spending caps and track real-time consumption velocity</p>
          </div>

          <button
            onClick={openAddModal}
            className="btn-island group self-start md:self-auto"
          >
            <span>Set Budget Limit</span>
            <span className="btn-island-icon">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold flex items-center space-x-2 animate-fade-in">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((b) => {
            const spent = b.spent ?? 0;
            const limit = b.amount ?? 1;
            const pct = b.progress_percentage ?? Math.min((spent / limit) * 100, 999);
            const remaining = b.remaining ?? (limit - spent);
            const exceeded = b.exceeded ?? 0;
            const isExceeded = spent > limit;
            const catName = typeof b.category === 'object' && b.category !== null ? b.category.name : b.category;
            const badge = getStatusBadge(pct, b.bar_color);
            const barColor = getBarColor(pct, b.bar_color);
            const displayPct = Math.min(pct, 100); // cap visual bar at 100%

            return (
              <div key={b.id} className="doppel-shell relative overflow-hidden group">
                <div className="doppel-core p-6 flex flex-col justify-between">
                  {/* Header row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-textPrimary tracking-tight">{catName}</h4>
                        <p className="text-[10px] text-textMuted font-medium mt-0.5">{b.month_label || `${b.month}/${b.year}`}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1.5">
                      <span className={`flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                        {isExceeded && <AlertTriangle className="w-3 h-3" />}
                        <span>{badge.label}</span>
                      </span>

                      {/* Edit / Delete action buttons */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(b)}
                          title="Edit Budget"
                          className="p-1.5 rounded-lg text-textSecondary hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(b)}
                          title="Delete Budget"
                          className="p-1.5 rounded-lg text-textSecondary hover:text-danger hover:bg-danger/10 transition-all border border-transparent hover:border-danger/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Spent vs Limit */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-xs text-textSecondary font-semibold">
                      <span>Spent: <span className="font-numeric font-bold text-textPrimary">₹{spent.toLocaleString()}</span></span>
                      <span>Limit: <span className="font-numeric font-bold text-textPrimary">₹{limit.toLocaleString()}</span></span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-borderColor/60 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pct >= 90 ? 'bg-danger shadow-danger-glow' : pct >= 70 ? 'bg-warning' : 'bg-success shadow-success-glow'
                        }`}
                        style={{ width: `${displayPct}%` }}
                      />
                    </div>

                    {/* Bottom info */}
                    <div className="flex justify-between items-center text-[10px] pt-0.5">
                      <span className="text-textMuted font-bold font-numeric">{pct.toFixed(1)}% consumed</span>
                      <span className={`font-bold font-numeric ${isExceeded ? 'text-danger' : 'text-textMuted'}`}>
                        {isExceeded
                          ? `⚠ Over by ₹${exceeded.toLocaleString()}`
                          : `₹${remaining.toLocaleString()} remaining`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-3xl bg-cardBg">
          <Wallet className="w-10 h-10 text-textMuted mb-2" />
          <p className="text-sm font-semibold">No active budget limits configured</p>
          <p className="text-xs text-textMuted mt-1">Set a budget limit to track your spend limits</p>
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-cardBg border border-borderColor rounded-3xl p-6 shadow-xl relative animate-scale-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-textPrimary">
                {editingBudget ? 'Edit Budget Limit' : 'Set Category Budget'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-textMuted hover:text-textPrimary hover:bg-hoverBg rounded-lg transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                >
                  {(expenseCategories.length > 0
                    ? expenseCategories
                    : [{ name: 'Shopping' }, { name: 'Food' }, { name: 'Travel' }, { name: 'Entertainment' }, { name: 'Healthcare' }, { name: 'Utilities' }]
                  ).map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Budget Limit (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Month</label>
                <input
                  type="month"
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-danger font-semibold bg-danger/10 border border-danger/20 p-3 rounded-xl">{error}</p>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 h-11 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>{editingBudget ? 'Save Changes' : 'Set Budget'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-cardBg border border-borderColor rounded-3xl p-6 shadow-xl animate-scale-up">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">Delete Budget</h3>
                <p className="text-xs text-textSecondary mt-0.5">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-textSecondary mb-6">
              Are you sure you want to delete the budget for{' '}
              <span className="font-bold text-textPrimary">
                {typeof deleteConfirm.category === 'object' ? deleteConfirm.category.name : deleteConfirm.category}
              </span>
              {' '}({deleteConfirm.month_label || `${deleteConfirm.month}/${deleteConfirm.year}`})?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-1/2 h-11 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="w-1/2 h-11 bg-danger hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;