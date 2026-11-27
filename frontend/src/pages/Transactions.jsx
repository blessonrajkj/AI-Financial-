import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowLeftRight,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  FileText,
  UploadCloud,
  Check,
  ChevronDown,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';
import TransactionToast from '../components/ui/TransactionToast';
import CategorySelect, { SubcategorySelect } from '../components/ui/CategorySelect';
import DatePicker from '../components/ui/DatePicker';
import { EXPENSE_TAXONOMY, INCOME_CATEGORIES, TRANSFER_CATEGORIES } from '../utils/taxonomy';
import Modal from '../components/ui/Modal';
import { API_URL } from '../services/api';

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', icon: Banknote, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'Card', label: 'Card / Card Payment', icon: CreditCard, color: 'text-indigo-500 bg-indigo-500/10' },
  { id: 'UPI', label: 'UPI (Google Pay, PhonePe, Paytm)', icon: Smartphone, color: 'text-purple-500 bg-purple-500/10' },
  { id: 'Net Banking', label: 'Net Banking / Bank Transfer', icon: Landmark, color: 'text-amber-500 bg-amber-500/10' },
];

const PaymentMethodSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === value) || PAYMENT_METHODS[0];
  const IconComponent = selectedMethod.icon;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-3.5 bg-background border border-borderColor rounded-xl flex items-center justify-between text-textPrimary text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedMethod.color}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="font-semibold text-textPrimary truncate">{selectedMethod.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native select for form validation and accessibility */}
      <select 
        name="payment_method"
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="sr-only" 
        tabIndex={-1} 
        aria-hidden="true"
      >
        {PAYMENT_METHODS.map(m => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-cardBg border border-borderColor rounded-xl shadow-2xl shadow-indigo-500/10 z-50 overflow-hidden py-1.5"
            role="listbox"
          >
            {PAYMENT_METHODS.map((method) => {
              const MethodIcon = method.icon;
              const isSelected = method.id === value;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    onChange(method.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors duration-150 ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-hoverBg text-textPrimary font-medium'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${method.color}`}>
                      <MethodIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm truncate">{method.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FLOW_TYPES = [
  { 
    id: 'expense', 
    label: 'Expense (Outflow)', 
    desc: 'Money leaving your account',
    icon: ArrowDownLeft, 
    color: 'text-rose-500 bg-rose-500/10' 
  },
  { 
    id: 'income', 
    label: 'Income (Inflow)', 
    desc: 'Money entering your account',
    icon: ArrowUpRight, 
    color: 'text-emerald-500 bg-emerald-500/10' 
  },
  { 
    id: 'transfer', 
    label: 'Transfer (Internal)', 
    desc: 'Movement between your accounts',
    icon: ArrowLeftRight, 
    color: 'text-indigo-500 bg-indigo-500/10' 
  },
];

const FlowTypeSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedType = FLOW_TYPES.find(t => t.id === value) || FLOW_TYPES[0];
  const IconComponent = selectedType.icon;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-3.5 bg-background border border-borderColor rounded-xl flex items-center justify-between text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-left cursor-pointer hover:border-primary/50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedType.color}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="font-semibold text-textPrimary truncate">{selectedType.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native select for form validation and accessibility */}
      <select 
        name="type"
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="sr-only" 
        tabIndex={-1} 
        aria-hidden="true"
      >
        {FLOW_TYPES.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-cardBg border border-borderColor rounded-xl shadow-2xl shadow-indigo-500/10 z-50 overflow-hidden py-1.5"
            role="listbox"
          >
            {FLOW_TYPES.map((item) => {
              const ItemIcon = item.icon;
              const isSelected = item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors duration-150 cursor-pointer ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-hoverBg text-textPrimary font-medium'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-semibold truncate leading-tight">{item.label}</div>
                      <div className="text-[11px] text-textMuted truncate mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterSelect = ({ label, value, options, onChange, minWidth = 'min-w-[130px]' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { id: opt, label: opt === 'All' ? `All ${label || ''}`.trim() : opt };
      }
      return opt;
    });
  }, [options, label]);

  const selectedOpt = normalizedOptions.find(o => o.id === value) || normalizedOptions[0];

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-11 px-3 bg-background hover:bg-hoverBg border border-borderColor rounded-xl text-sm text-textPrimary flex items-center justify-between gap-2 font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer ${minWidth}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-textSecondary transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native select for form validation and accessibility */}
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="sr-only" 
        tabIndex={-1} 
        aria-hidden="true"
      >
        {normalizedOptions.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 top-full mt-1.5 bg-cardBg border border-borderColor rounded-xl shadow-2xl shadow-indigo-500/10 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto ${minWidth}`}
            role="listbox"
          >
            {normalizedOptions.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-hoverBg text-textPrimary font-medium'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Form states for manual logging and editing
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food & Dining');
  const [subcategory, setSubcategory] = useState('Groceries');

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'income') {
      if (category !== 'Income') {
        setCategory('Income');
        setSubcategory(INCOME_CATEGORIES[0] || 'Salary');
      }
    } else if (newType === 'transfer') {
      if (category !== 'Cash & Transfers') {
        setCategory('Cash & Transfers');
        setSubcategory(TRANSFER_CATEGORIES[0] || 'Internal Transfer');
      }
    } else {
      if (category === 'Income' || category === 'Cash & Transfers') {
        setCategory('Food & Dining');
        setSubcategory(EXPENSE_TAXONOMY['Food & Dining']?.[0] || 'Groceries');
      }
    }
  };
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Metadata lists
  const [categoriesList, setCategoriesList] = useState([]);
  const [merchantsList, setMerchantsList] = useState([]);

  // Lock body scroll when modal or filter sheet is active
  useEffect(() => {
    if (showAddModal || showFilterSheet) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal, showFilterSheet]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions?limit=1000`);
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

  // Update default selected category name & subcategory when transaction type switches
  useEffect(() => {
    if (type === 'transfer') {
      setCategory('Cash & Transfers');
      setSubcategory('Internal Transfer');
    } else if (type === 'income') {
      setCategory('Income');
      setSubcategory('Salary');
    } else {
      setCategory('Food & Dining');
      setSubcategory('Groceries');
    }
  }, [type]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (EXPENSE_TAXONOMY[newCat]) {
      setSubcategory(EXPENSE_TAXONOMY[newCat][0] || 'Uncategorized');
    } else if (newCat === 'Income') {
      setSubcategory('Salary');
    } else if (newCat === 'Cash & Transfers') {
      setSubcategory('Internal Transfer');
    } else {
      setSubcategory('Uncategorized');
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingTx(null);
    setAmount('');
    setType('expense');
    setCategory('Food & Dining');
    setSubcategory('Groceries');
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
    const catName = getCategoryName(t.category) || 'Food & Dining';
    setCategory(catName);
    setSubcategory(t.subcategory || (EXPENSE_TAXONOMY[catName] ? EXPENSE_TAXONOMY[catName][0] : 'Uncategorized'));
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
        subcategory: subcategory || 'Uncategorized',
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
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="btn-island group w-full sm:w-auto justify-center"
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
        <div className="doppel-core p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-textMuted absolute left-3.5 top-3.5" />
            <input 
              type="text" 
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-background border border-borderColor rounded-xl text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary transition-all font-medium"
            />
          </div>

          <div className="hidden sm:flex flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider hidden sm:inline">Type:</span>
              <FilterSelect
                label="Types"
                value={filterType}
                onChange={setFilterType}
                minWidth="min-w-[130px]"
                options={[
                  { id: 'All', label: 'All Types' },
                  { id: 'income', label: 'Income' },
                  { id: 'expense', label: 'Expense' }
                ]}
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider hidden sm:inline">Category:</span>
              <FilterSelect
                label="Categories"
                value={filterCategory}
                onChange={setFilterCategory}
                minWidth="min-w-[160px]"
                options={[
                  'All',
                  ...(categoriesList.length > 0 
                    ? Array.from(new Set(categoriesList.map(c => c.name)))
                    : ['Food', 'Fuel', 'Shopping', 'Travel', 'Healthcare', 'Entertainment', 'Utilities', 'Other', 'Salary']
                  )
                ]}
              />
            </div>
          </div>

          {/* Mobile Filter Sheet Button (< sm) */}
          <button
            onClick={() => setShowFilterSheet(true)}
            className="sm:hidden w-full h-11 bg-surface hover:bg-hoverBg border border-borderColor rounded-xl px-4 text-xs font-bold text-textPrimary flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Filter Transactions</span>
            </div>
            {(filterType !== 'All' || filterCategory !== 'All') && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Ledger Records — Responsive Mobile Cards + Desktop Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="bg-cardBg border border-borderColor rounded-3xl overflow-hidden shadow-sm">
          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden p-3 space-y-3">
            <div className="flex items-center justify-between pb-2 px-1 border-b border-borderColor/50">
              <label className="flex items-center gap-2 text-xs font-bold text-textSecondary cursor-pointer">
                <input 
                  type="checkbox"
                  className="rounded border-borderColor text-primary focus:ring-primary w-4 h-4"
                  checked={currentTransactions.length > 0 && currentTransactions.every(t => selectedIds.has(t.id))}
                  onChange={() => handleSelectAll(currentTransactions)}
                />
                <span>Select All ({currentTransactions.length})</span>
              </label>
            </div>

            {currentTransactions.map((t) => {
              const isIncome = t.type === 'income';
              const isChecked = selectedIds.has(t.id);
              return (
                <div 
                  key={t.id}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    isChecked 
                      ? 'bg-primary/5 border-primary/30 shadow-sm' 
                      : 'bg-surface/60 border-borderColor/70 hover:border-borderColor'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input 
                        type="checkbox"
                        className="mt-0.5 rounded border-borderColor text-primary focus:ring-primary w-4 h-4 cursor-pointer flex-shrink-0"
                        checked={isChecked}
                        onChange={() => handleSelectRow(t.id)}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-textPrimary text-sm truncate">{getMerchantName(t.merchant) || 'Uncategorized'}</p>
                        <p className="text-[11px] text-textMuted font-normal truncate mt-0.5">{t.description || 'No description'}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black font-numeric flex-shrink-0 privacy-mask whitespace-nowrap ${isIncome ? 'text-success' : 'text-danger'}`}>
                      {isIncome ? '+' : '-'} ₹{t.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-borderColor/40 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-hoverBg border border-borderColor/60 text-[11px] font-semibold text-textPrimary">
                        {getCategoryName(t.category)}
                      </span>
                      {t.subcategory && t.subcategory !== "Uncategorized" && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                          · {t.subcategory}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-textMuted font-medium">{formatDateDisplay(t.date)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-borderColor/30">
                    <button 
                      onClick={() => handleEditClick(t)}
                      className="px-3 py-1.5 bg-surface hover:bg-hoverBg border border-borderColor rounded-xl text-xs font-bold text-primary transition-all flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="px-3 py-1.5 bg-danger/10 hover:bg-danger/20 text-danger rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-hoverBg border border-borderColor/60 text-xs font-semibold text-textPrimary">
                            {getCategoryName(t.category)}
                          </span>
                          {t.subcategory && t.subcategory !== "Uncategorized" && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                              · {t.subcategory}
                            </span>
                          )}
                        </div>
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
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={isEditMode ? 'Edit Transaction' : 'Log New Transaction'}
        subtitle={isEditMode ? 'Update transaction details' : 'Record an inflow or outflow record'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* 1. Flow Type */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Flow Type</label>
            <FlowTypeSelect 
              value={type} 
              onChange={handleTypeChange} 
            />
          </div>

          {/* 2. Amount Field (Visually Prominent) */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-primary text-lg font-black">₹</span>
              <input 
                type="number" 
                required
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-12 pl-9 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary text-lg font-bold font-numeric focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* 3. Category & Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Main Category</label>
              <CategorySelect 
                value={category}
                onChange={handleCategoryChange}
                options={type === 'income' ? ['Income'] : type === 'transfer' ? ['Cash & Transfers'] : Object.keys(EXPENSE_TAXONOMY)}
                size="md"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Subcategory</label>
              <SubcategorySelect
                category={category}
                value={subcategory}
                onChange={(newSub) => setSubcategory(newSub)}
                subcategories={
                  type === 'income'
                    ? INCOME_CATEGORIES
                    : type === 'transfer'
                    ? TRANSFER_CATEGORIES
                    : (EXPENSE_TAXONOMY[category] || ['Uncategorized'])
                }
                size="md"
              />
            </div>
          </div>

          {/* 4. Date & Mode of Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Transaction Date</label>
              <DatePicker 
                value={date} 
                onChange={setDate} 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Mode of Transaction</label>
              <PaymentMethodSelect 
                value={paymentMethod} 
                onChange={setPaymentMethod} 
              />
            </div>
          </div>

          {/* 5. Merchant Name */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Merchant Name</label>
            <input 
              type="text" 
              placeholder="e.g. Amazon, Starbucks, Swiggy (Optional)"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* 6. Description */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Description</label>
            <input 
              type="text" 
              placeholder="e.g. Monthly cloud server subscription (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-3 pt-4 border-t border-borderColor shrink-0">
            <button 
              type="button"
              onClick={() => { setShowAddModal(false); resetForm(); }}
              className="w-1/3 min-h-[48px] bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="w-2/3 min-h-[48px] bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isEditMode ? 'Update Transaction' : 'Add Transaction'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mobile Filter Bottom Sheet Modal */}
      <Modal
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Transactions"
        subtitle="Narrow down ledger records"
        icon={SlidersHorizontal}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          {/* Transaction Type Filter */}
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'All', label: 'All Types' },
                { id: 'income', label: 'Income' },
                { id: 'expense', label: 'Expense' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterType(t.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    filterType === t.id
                      ? 'bg-primary/10 border-primary text-primary shadow-xs'
                      : 'bg-background border-borderColor text-textSecondary hover:bg-hoverBg'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2.5">
              Category
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {['All', ...(categoriesList.length > 0 
                ? Array.from(new Set(categoriesList.map(c => c.name)))
                : ['Food & Dining', 'Fuel', 'Shopping', 'Travel', 'Healthcare', 'Entertainment', 'Utilities', 'Salary']
              )].map(catName => (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setFilterCategory(catName)}
                  className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                    filterCategory === catName
                      ? 'bg-primary/10 border-primary text-primary font-bold'
                      : 'bg-background border-borderColor text-textPrimary hover:bg-hoverBg'
                  }`}
                >
                  <span>{catName === 'All' ? 'All Categories' : catName}</span>
                  {filterCategory === catName && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="pt-4 mt-2 border-t border-borderColor flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => { setFilterType('All'); setFilterCategory('All'); }}
            className="w-1/3 min-h-[48px] bg-hoverBg hover:bg-borderColor text-textSecondary font-bold text-xs rounded-xl border border-borderColor transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setShowFilterSheet(false)}
            className="w-2/3 min-h-[48px] bg-primary hover:bg-primaryHover text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center"
          >
            Apply Filters
          </button>
        </div>
      </Modal>

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