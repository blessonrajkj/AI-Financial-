import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  FileText,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';
import TransactionToast from '../components/ui/TransactionToast';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const Transactions = () => {
  const navigate = useNavigate();
  const { invalidateCache } = useThemeAndRefresh();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Toast state
  const [toastData, setToastData] = useState(null);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Form states for manual logging and editing
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Shopping');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Metadata lists
  const [categoriesList, setCategoriesList] = useState([]);
  const [merchantsList, setMerchantsList] = useState([]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions?limit=10000&t=${Date.now()}`);
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catsRes, mersRes] = await Promise.all([
        axios.get(`${API_URL}/transactions/categories/all`),
        axios.get(`${API_URL}/transactions/merchants/all`)
      ]);
      setCategoriesList(catsRes.data);
      setMerchantsList(mersRes.data);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchMetadata();
  }, []);

  // Update default selected category name when transaction type switches
  useEffect(() => {
    const filtered = categoriesList.filter(c => c.type === type);
    if (filtered.length > 0) {
      setCategory(filtered[0].name);
    } else {
      setCategory(type === 'income' ? 'Salary' : 'Shopping');
    }
  }, [type, categoriesList]);

  const resetForm = () => {
    setIsEditMode(false);
    setEditingTx(null);
    setAmount('');
    setType('expense');
    setCategory('Shopping');
    setMerchant('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPaymentMethod('Cash');
  };

  const handleEditClick = (t) => {
    setIsEditMode(true);
    setEditingTx(t);
    setAmount(t.amount != null ? t.amount : '');
    setType(t.type || 'expense');
    setCategory(getCategoryName(t.category) || 'Shopping');
    setMerchant(getMerchantName(t.merchant) || '');
    setDate(t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setDescription(t.description || '');
    setPaymentMethod(t.payment_method || 'Cash');
    setShowAddModal(true);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${day} ${months[mIdx]} ${year}`;
      }
    }
    return cleanStr;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Resolve or create merchant
      let finalMerchantId = null;
      if (merchant.trim()) {
        const existingMerchant = merchantsList.find(
          m => m.name.toLowerCase() === merchant.trim().toLowerCase()
        );
        if (existingMerchant) {
          finalMerchantId = existingMerchant.id;
        } else {
          const newMerch = await axios.post(
            `${API_URL}/transactions/merchants/all?name=${encodeURIComponent(merchant.trim())}`
          );
          finalMerchantId = newMerch.data.id;
          setMerchantsList(prev => [...prev, newMerch.data]);
        }
      }

      // 2. Resolve category
      let finalCategoryId = null;
      const existingCategory = categoriesList.find(
        c => c.name.toLowerCase() === category.toLowerCase()
      );
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        const newCat = await axios.post(
          `${API_URL}/transactions/categories/all?name=${encodeURIComponent(category)}&type=${type}`
        );
        finalCategoryId = newCat.data.id;
        setCategoriesList(prev => [...prev, newCat.data]);
      }

      const payload = {
        amount: parseFloat(amount),
        type,
        category_id: finalCategoryId,
        merchant_id: finalMerchantId,
        date: date.includes('T') ? date : date + 'T12:00:00',
        description,
        payment_method: paymentMethod
      };

      if (isEditMode && editingTx) {
        // PUT update existing transaction
        await axios.put(`${API_URL}/transactions/${editingTx.id}`, payload);
        setSuccess('Transaction updated successfully!');
      } else {
        // POST create new transaction
        const txRes = await axios.post(`${API_URL}/transactions`, payload);

        // Show success toast with transaction details
        setToastData({
          amount: parseFloat(amount),
          category,
          merchant: merchant.trim() || null,
          date: date,
          type,
          id: txRes.data?.id || null
        });
      }

      resetForm();
      setShowAddModal(false);
      fetchTransactions();
      // Trigger real-time refresh on Dashboard, Budgets, Analytics, etc.
      invalidateCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'log'} transaction.`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API_URL}/transactions/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess(res.data.message || 'Transactions imported successfully!');
      fetchTransactions();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Import failed. Please verify headers (date, amount, type, category, merchant, description, payment_method).');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      setSuccess('Transaction deleted successfully!');
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchTransactions();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to delete transaction. Please check connection or authorization.');
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (visibleItems) => {
    setSelectedIds(prev => {
      const allSelected = visibleItems.every(item => prev.has(item.id));
      const next = new Set(prev);
      if (allSelected) {
        visibleItems.forEach(item => next.delete(item.id));
      } else {
        visibleItems.forEach(item => next.add(item.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected transactions?`)) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/transactions/bulk-delete`, {
        ids: Array.from(selectedIds)
      });
      setSuccess(`Successfully deleted ${selectedIds.size} transactions.`);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to delete selected transactions.');
    } finally {
      setLoading(false);
    }
  };

  const getMerchantName = (m) => {
    if (!m) return '';
    if (typeof m === 'object') return m.name || '';
    return String(m);
  };

  const getCategoryName = (c) => {
    if (!c) return '';
    if (typeof c === 'object') return c.name || '';
    return String(c);
  };

  // Export handlers
  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'All') params.append('type', filterType);
      
      if (filterCategory !== 'All') {
        const cat = categoriesList.find(c => c.name === filterCategory);
        if (cat) {
          params.append('category_id', cat.id);
        }
      }
      
      const token = localStorage.getItem('token');
      const url = `${API_URL}/analytics/export/${format}?${params.toString()}`;
      
      const response = await axios.get(url, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ext = format === 'excel' ? 'xlsx' : format;
      link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError(`Failed to export transactions as ${format.toUpperCase()}.`);
    }
  };

  // Reset pagination to first page when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterType]);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      getMerchantName(t.merchant).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryName(t.category).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'All' || getCategoryName(t.category) === filterCategory;
    const matchesType = filterType === 'All' || t.type === filterType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  // Calculate local pagination
  const itemsPerPage = 15;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

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
                Ledger Core
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-textPrimary">Financial Transactions</h1>
            <p className="text-xs text-textMuted mt-1 font-medium">Log, search, filter, and export cashflow statement records</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center space-x-2 px-4 py-2 bg-danger text-white text-xs font-bold rounded-full shadow-md transition-all animate-fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
            <button 
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 bg-surface hover:bg-hoverBg border border-borderColor text-textSecondary text-xs font-bold rounded-full transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="px-3.5 py-2 bg-surface hover:bg-hoverBg border border-borderColor text-textSecondary text-xs font-bold rounded-full transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              className="px-3.5 py-2 bg-surface hover:bg-hoverBg border border-borderColor text-textSecondary text-xs font-bold rounded-full transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <label className="px-3.5 py-2 bg-surface hover:bg-hoverBg border border-borderColor text-textSecondary hover:text-textPrimary text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer">
              <UploadCloud className="w-3.5 h-3.5 text-primary" />
              <span>Import</span>
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={handleImportFile} 
                className="hidden" 
              />
            </label>
            <button 
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn-island group"
            >
              <span>Add Record</span>
              <span className="btn-island-icon">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </button>
          </div>
        </div>
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

      {/* Filters Toolbar */}
      <div className="doppel-shell">
        <div className="doppel-core p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-textMuted absolute left-4 top-3.5" />
            <input 
              type="text" 
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary transition-all font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider hidden sm:inline">Type:</span>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-11 px-3 bg-background border border-borderColor rounded-xl text-sm text-textPrimary focus:outline-none focus:border-primary w-full sm:w-auto font-medium"
              >
                <option value="All">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider hidden sm:inline">Category:</span>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-11 px-3 bg-background border border-borderColor rounded-xl text-sm text-textPrimary focus:outline-none focus:border-primary w-full sm:w-auto font-medium"
              >
                <option value="All">All Categories</option>
                {(categoriesList.length > 0 
                  ? Array.from(new Set(categoriesList.map(c => c.name)))
                  : ['Food', 'Fuel', 'Shopping', 'Travel', 'Healthcare', 'Entertainment', 'Utilities', 'Other', 'Salary']
                ).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="bg-cardBg border border-borderColor rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderColor bg-background/50 text-xs font-bold text-textSecondary uppercase tracking-wider">
                  <th className="py-4 px-6 w-12 text-center">
                    <input 
                      type="checkbox"
                      className="rounded border-borderColor text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={currentTransactions.length > 0 && currentTransactions.every(t => selectedIds.has(t.id))}
                      onChange={() => handleSelectAll(currentTransactions)}
                    />
                  </th>
                  <th className="py-4 px-6">Merchant / Details</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60">
                {currentTransactions.map((t) => {
                  const isIncome = t.type === 'income';
                  const isChecked = selectedIds.has(t.id);
                  return (
                    <tr key={t.id} className={`hover:bg-hoverBg/40 transition-colors text-sm ${isChecked ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                      <td className="py-4 px-6 text-center">
                        <input 
                          type="checkbox"
                          className="rounded border-borderColor text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isChecked}
                          onChange={() => handleSelectRow(t.id)}
                        />
                      </td>
                      <td className="py-4 px-6 font-semibold text-textPrimary">
                        <div>
                          <p className="font-bold text-textPrimary">{getMerchantName(t.merchant) || 'Uncategorized'}</p>
                          <p className="text-[10px] text-textSecondary font-normal mt-0.5">{t.description || 'No description'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-textSecondary">
                        <span className="px-2.5 py-1 rounded-full bg-hoverBg border border-borderColor/60 text-xs font-semibold">
                          {getCategoryName(t.category)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-textSecondary font-medium">{formatDateDisplay(t.date)}</td>
                      <td className={`py-4 px-6 text-right font-black privacy-mask ${isIncome ? 'text-success' : 'text-danger'}`}>
                        {isIncome ? '+' : '-'} ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button 
                            onClick={() => handleEditClick(t)}
                            className="p-2 text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-textMuted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 bg-background border-t border-borderColor text-xs">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-4 py-2 bg-cardBg border border-borderColor hover:bg-hoverBg rounded-xl font-bold text-textSecondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-textSecondary font-semibold">
                Page <span className="text-textPrimary font-bold">{currentPage}</span> of <span className="text-textPrimary font-bold">{totalPages}</span> ({filteredTransactions.length} items)
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-4 py-2 bg-cardBg border border-borderColor hover:bg-hoverBg rounded-xl font-bold text-textSecondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-3xl bg-cardBg">
          <SlidersHorizontal className="w-10 h-10 text-textMuted mb-2" />
          <p className="text-sm font-semibold">No transactions match your search filters</p>
          <p className="text-xs text-textMuted mt-1">Adjust filters or create a new ledger record</p>
        </div>
      )}

      {/* Manual Logger / Edit Popup Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-lg bg-cardBg border border-borderColor rounded-3xl p-6 shadow-xl relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-textPrimary">{isEditMode ? 'Edit Transaction' : 'Log New Transaction'}</h3>
                <button 
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="p-1 rounded-full text-textSecondary hover:bg-hoverBg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Flow Type</label>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="expense">Expense (Outflow)</option>
                      <option value="income">Income (Inflow)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      {(categoriesList.filter(c => c.type === type).length > 0
                        ? categoriesList.filter(c => c.type === type).map(c => c.name)
                        : (type === 'income' ? ['Salary', 'Refunds', 'Other Income', 'Other'] : ['Food', 'Fuel', 'Shopping', 'Travel', 'Healthcare', 'Entertainment', 'Utilities', 'Other'])
                      ).map(catName => (
                        <option key={catName} value={catName}>{catName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-textSecondary text-sm font-bold">₹</span>
                      <input 
                        type="number" 
                        required
                        step="any"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-11 pl-8 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Merchant Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Amazon, Starbucks"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Transaction Date</label>
                    <input 
                      type="date" 
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Mode of Transaction</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card / Card Payment</option>
                      <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                      <option value="Net Banking">Net Banking / Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Monthly cloud server costs"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-borderColor">
                  <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
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
                      <span>{isEditMode ? 'Update Transaction' : 'Log Transaction'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Success Toast */}
      <TransactionToast
        toast={toastData}
        onDismiss={() => setToastData(null)}
        onViewTransaction={() => navigate('/transactions')}
      />
    </div>
  );
};


export default Transactions;