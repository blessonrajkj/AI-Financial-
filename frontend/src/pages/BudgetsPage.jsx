import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Wallet, AlertTriangle, Check, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for creating budget
  const [category, setCategory] = useState('Shopping');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-07"
  const [showModal, setShowModal] = useState(false);

  // Metadata categories list
  const [categoriesList, setCategoriesList] = useState([]);

  const fetchBudgets = async () => {
    try {
      const res = await axios.get(`${API_URL}/budgets?t=${Date.now()}`);
      setBudgets(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch budgets.');
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Resolve category ID
      const existingCategory = categoriesList.find(
        c => c.name.toLowerCase() === category.toLowerCase()
      );
      if (!existingCategory) {
        throw new Error(`Category "${category}" not found in database.`);
      }

      // 2. Parse year and month integers from month string "YYYY-MM"
      const [yearStr, monthStr] = month.split('-');
      const parsedYear = parseInt(yearStr);
      const parsedMonth = parseInt(monthStr);

      await axios.post(`${API_URL}/budgets`, {
        category_id: existingCategory.id,
        amount: parseFloat(amount),
        month: parsedMonth,
        year: parsedYear
      });

      setSuccess('Budget limit created successfully!');
      setAmount('');
      setShowModal(false);
      fetchBudgets();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to create budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Budgets</h1>
          <p className="text-textSecondary mt-1">Configure and monitor your custom category spending caps</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primaryHover text-white text-sm font-bold rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Set Budget Limit</span>
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

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const limit = b.amount || 1;
            const pct = Math.min((spent / limit) * 100, 100);
            const remaining = limit - spent;
            const overspent = spent > limit;

            return (
              <div key={b.id} className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-textPrimary">{typeof b.category === 'object' && b.category !== null ? b.category.name : b.category}</h4>
                      <p className="text-[10px] text-textSecondary mt-0.5">{b.month}</p>
                    </div>
                  </div>
                  {overspent ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-full border border-danger/20">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Overspent</span>
                    </span>
                  ) : pct >= 80 ? (
                    <span className="text-[10px] font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                      Near Limit
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                      On Track
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-textSecondary">
                    <span>Spent: ₹{spent.toLocaleString()}</span>
                    <span>Limit: ₹{limit.toLocaleString()}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-background rounded-full overflow-hidden border border-borderColor/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${overspent ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className="text-textSecondary">Spent {pct.toFixed(0)}%</span>
                    <span className={`font-bold ${overspent ? 'text-danger' : 'text-textSecondary'}`}>
                      {overspent ? `Over by ₹${Math.abs(remaining).toLocaleString()}` : `₹${remaining.toLocaleString()} left`}
                    </span>
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

      {/* Set Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-cardBg border border-borderColor rounded-3xl p-6 shadow-xl relative animate-scale-up">
            <h3 className="text-lg font-bold text-textPrimary mb-4">Set Category Budget</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                >
                  {(categoriesList.filter(c => c.type === 'expense').length > 0
                    ? categoriesList.filter(c => c.type === 'expense').map(c => c.name)
                    : ['Food', 'Fuel', 'Shopping', 'Travel', 'Healthcare', 'Entertainment', 'Utilities', 'Other']
                  ).map(catName => (
                    <option key={catName} value={catName}>{catName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Budget Limit (₹)</label>
                <input 
                  type="number" 
                  required
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
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Set Budget</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;