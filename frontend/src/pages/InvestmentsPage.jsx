import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Coins, 
  Percent, 
  Activity, 
  ShieldAlert, 
  DollarSign, 
  Calendar,
  AlertCircle,
  Check,
  Award,
  SlidersHorizontal,
  Eye,
  Edit2,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
  RefreshCw,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  ShoppingBag,
  History,
  Filter
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';
import IndiaPostModal from '../components/investments/IndiaPostModal';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { API_URL } from '../services/api';

const ASSET_TYPES = [
  "Stocks",
  "Mutual Funds",
  "SIPs",
  "ETFs",
  "Gold",
  "Crypto",
  "Fixed Deposits",
  "Bonds",
  "PPF",
  "NPS",
  "Post Office"
];

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#14B8A6', '#3B82F6', '#84CC16'
];

const InvestmentsPage = () => {
  const [data, setData] = useState({ summary: {}, allocation: [], items: [] });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals & Drawers
  const [showIndiaPostModal, setShowIndiaPostModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailHolding, setDetailHolding] = useState(null);
  const [detailTransactions, setDetailTransactions] = useState([]);
  const [detailTxLoading, setDetailTxLoading] = useState(false);
  const [detailTxFilter, setDetailTxFilter] = useState('ALL'); // ALL, BUY, SELL, DIVIDEND
  const [detailTxSort, setDetailTxSort] = useState('desc'); // desc, asc

  // Sell Modal State
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellHolding, setSellHolding] = useState(null);
  const [sellUnits, setSellUnits] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellNotes, setSellNotes] = useState('');

  // Add / Edit Form Fields
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('Stocks');
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Performance Chart Controls
  const [perfTimeframe, setPerfTimeframe] = useState('ALL'); // 1M, 3M, 6M, 1Y, 3Y, ALL
  const [allocationDisplayMode, setAllocationDisplayMode] = useState('percent'); // percent, value
  const [activityFilter, setActivityFilter] = useState('All'); // All, BUY, SELL, DIVIDEND

  // Wealth Forecaster State
  const [cagr, setCagr] = useState(12);
  const [projectionYears, setProjectionYears] = useState(10);
  const [monthlyContribution, setMonthlyContribution] = useState(10000);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const [invRes, actRes] = await Promise.all([
        axios.get(`${API_URL}/investments`),
        axios.get(`${API_URL}/investments/activity`).catch(() => ({ data: [] }))
      ]);
      setData(invRes.data);
      setActivity(actRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch investment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  // Fetch holding transactions when opening detail holding
  useEffect(() => {
    if (!detailHolding) {
      setDetailTransactions([]);
      return;
    }
    const fetchTransactions = async () => {
      try {
        setDetailTxLoading(true);
        const res = await axios.get(`${API_URL}/investments/${detailHolding.id}/transactions`);
        setDetailTransactions(res.data || []);
      } catch (err) {
        console.error('Failed to fetch holding transactions', err);
      } finally {
        setDetailTxLoading(false);
      }
    };
    fetchTransactions();
  }, [detailHolding]);

  const summary = data.summary || {};
  const items = data.items || [];
  const allocation = data.allocation || [];
  const currentAssetValue = summary.total_current_value || 0;

  // Live Existing Holding Matcher in Add/Buy Holding Modal
  const matchedHolding = useMemo(() => {
    if (editingId) return null; // Direct edit mode
    const cleanSym = symbol.trim().toLowerCase();
    const cleanName = assetName.trim().toLowerCase();
    const cleanType = assetType.trim().toLowerCase();

    if (!cleanSym && !cleanName) return null;

    return items.find(inv => {
      const invType = (inv.asset_type || '').toLowerCase();
      const invSym = (inv.symbol || '').toLowerCase();
      const invName = (inv.asset_name || '').toLowerCase();

      const typeMatch = invType === cleanType || 
        (['stocks', 'etfs', 'crypto'].includes(invType) && ['stocks', 'etfs', 'crypto'].includes(cleanType)) ||
        (['mutual funds', 'sips'].includes(invType) && ['mutual funds', 'sips'].includes(cleanType));

      if (!typeMatch) return false;

      if (cleanSym && invSym) return cleanSym === invSym;
      if (cleanName && invName) return cleanName === invName;
      return false;
    });
  }, [items, symbol, assetName, assetType, editingId]);

  // Forecaster calculation
  const projectionData = useMemo(() => {
    const points = [];
    const monthlyRate = (cagr / 100) / 12;
    let balance = currentAssetValue;
    let totalContributions = 0;

    points.push({
      year: 'Now',
      balance: Math.round(balance),
      contributions: 0,
      growth: 0
    });

    for (let y = 1; y <= projectionYears; y++) {
      for (let m = 1; m <= 12; m++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        totalContributions += monthlyContribution;
      }
      const totalGrowth = balance - currentAssetValue - totalContributions;
      points.push({
        year: `Yr ${y}`,
        balance: Math.round(balance),
        contributions: Math.round(totalContributions),
        growth: Math.round(totalGrowth > 0 ? totalGrowth : 0)
      });
    }
    return points;
  }, [currentAssetValue, cagr, projectionYears, monthlyContribution]);

  // Performance Historical Chart Points
  const performanceTimeline = useMemo(() => {
    if (!items || items.length === 0) return [];

    const sortedByDate = [...items].sort((a, b) => {
      const da = a.purchase_date ? new Date(a.purchase_date) : new Date(0);
      const db = b.purchase_date ? new Date(b.purchase_date) : new Date(0);
      return da - db;
    });

    let runningInvested = 0;
    let runningCurrent = 0;

    const points = sortedByDate.map((item, index) => {
      runningInvested += item.purchase_value || 0;
      runningCurrent += item.current_value || 0;
      const dateStr = item.purchase_date 
        ? new Date(item.purchase_date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        : `T${index + 1}`;
      
      const gain = runningCurrent - runningInvested;
      const pct = runningInvested > 0 ? (gain / runningInvested) * 100 : 0;

      return {
        date: dateStr,
        portfolioValue: Math.round(runningCurrent),
        invested: Math.round(runningInvested),
        gainLoss: Math.round(gain),
        returnPct: parseFloat(pct.toFixed(2))
      };
    });

    return points;
  }, [items]);

  // Sector Allocation computed from holdings symbols/names
  const sectorAllocation = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    const sectors = {};
    items.forEach(item => {
      const name = item.asset_name.toUpperCase();
      let sector = "Other";
      if (name.includes("HDFC") || name.includes("ICICI") || name.includes("BANK") || name.includes("AXIS") || name.includes("SBI")) {
        sector = "Financial Services";
      } else if (name.includes("INFY") || name.includes("TCS") || name.includes("TECH") || name.includes("BTC") || name.includes("AAPL") || name.includes("WIPRO")) {
        sector = "Technology";
      } else if (name.includes("RELIANCE") || name.includes("POWER") || name.includes("OIL") || name.includes("GAS")) {
        sector = "Energy & Utilities";
      } else if (name.includes("GOLD") || name.includes("SGB") || name.includes("SILVER")) {
        sector = "Precious Metals";
      } else if (name.includes("FD") || name.includes("BOND") || name.includes("POST") || name.includes("PPF")) {
        sector = "Fixed Income / Sovereign";
      }
      
      sectors[sector] = (sectors[sector] || 0) + (item.current_value || 0);
    });

    return Object.keys(sectors).map(key => ({
      name: key,
      value: Math.round(sectors[key])
    }));
  }, [items]);

  // Data Insights Generator
  const portfolioInsights = useMemo(() => {
    if (!items || items.length === 0) return [];
    const res = [];
    
    // 1. Concentration
    const maxHolding = [...items].sort((a, b) => b.current_value - a.current_value)[0];
    if (maxHolding && currentAssetValue > 0) {
      const concPct = ((maxHolding.current_value / currentAssetValue) * 100).toFixed(1);
      res.push({
        type: 'Concentration',
        title: `${maxHolding.asset_name} is your largest position`,
        detail: `Represents ${concPct}% of total tracked asset value (${maxHolding.asset_type}).`,
        badge: concPct > 35 ? 'High Focus' : 'Balanced',
        status: concPct > 35 ? 'warning' : 'info'
      });
    }

    // 2. Diversification
    const typesCount = new Set(items.map(i => i.asset_type)).size;
    res.push({
      type: 'Diversification',
      title: `${typesCount} distinct asset classes active`,
      detail: `Asset spread includes ${Array.from(new Set(items.map(i => i.asset_type))).slice(0, 3).join(', ')}.`,
      badge: typesCount >= 3 ? 'Diversified' : 'Concentrated',
      status: 'success'
    });

    // 3. Performance
    const totalPL = summary.total_profit_loss || 0;
    res.push({
      type: 'Performance',
      title: totalPL >= 0 ? `₹${totalPL.toLocaleString()} net unrealized gains` : `₹${Math.abs(totalPL).toLocaleString()} net unrealized loss`,
      detail: `All-time portfolio return stands at ${(summary.total_profit_loss_percentage || 0).toFixed(2)}%.`,
      badge: totalPL >= 0 ? 'Positive Growth' : 'Drawdown',
      status: totalPL >= 0 ? 'success' : 'danger'
    });

    // 4. Income
    if ((summary.total_dividends || 0) > 0) {
      res.push({
        type: 'Income',
        title: `₹${(summary.total_dividends || 0).toLocaleString()} dividend payouts received`,
        detail: 'Cash flow received directly from holdings distributions.',
        badge: 'Passive Cashflow',
        status: 'info'
      });
    }

    return res;
  }, [items, summary, currentAssetValue]);

  // Filtered Activity
  const filteredActivity = useMemo(() => {
    if (activityFilter === 'All') return activity;
    return activity.filter(a => a.transaction_type?.toUpperCase() === activityFilter.toUpperCase());
  }, [activity, activityFilter]);

  // Filtered Detail Transactions
  const filteredDetailTx = useMemo(() => {
    let list = [...detailTransactions];
    if (detailTxFilter !== 'ALL') {
      list = list.filter(t => t.transaction_type?.toUpperCase() === detailTxFilter.toUpperCase());
    }
    list.sort((a, b) => {
      const da = a.transaction_date ? new Date(a.transaction_date) : new Date(0);
      const db = b.transaction_date ? new Date(b.transaction_date) : new Date(0);
      return detailTxSort === 'desc' ? db - da : da - db;
    });
    return list;
  }, [detailTransactions, detailTxFilter, detailTxSort]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setAssetName('');
    setAssetType('Stocks');
    setSymbol('');
    setExchange('NSE');
    setQuantity('');
    setPurchasePrice('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleOpenAddForExisting = (inv) => {
    setEditingId(null);
    setAssetName(inv.asset_name);
    setAssetType(inv.asset_type);
    setSymbol(inv.symbol || '');
    setExchange(inv.exchange || 'NSE');
    setQuantity('');
    setPurchasePrice(inv.current_price || inv.purchase_price || '');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleOpenEdit = (inv) => {
    setEditingId(inv.id);
    setAssetName(inv.asset_name);
    setAssetType(inv.asset_type);
    setSymbol(inv.symbol || '');
    setExchange(inv.exchange || 'NSE');
    setQuantity(inv.quantity);
    setPurchasePrice(inv.purchase_price);
    setPurchaseDate(inv.purchase_date ? inv.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleOpenSell = (inv) => {
    setSellHolding(inv);
    setSellUnits('');
    setSellPrice(inv.current_price || inv.purchase_price || '');
    setSellDate(new Date().toISOString().split('T')[0]);
    setSellNotes('');
    setShowSellModal(true);
  };

  const handleConfirmSell = async (e) => {
    e.preventDefault();
    if (!sellHolding) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/investments/${sellHolding.id}/sell`, {
        units: parseFloat(sellUnits),
        price_per_unit: parseFloat(sellPrice),
        transaction_date: sellDate + 'T12:00:00',
        notes: sellNotes || undefined
      });
      const gain = res.data.realized_gain;
      const gainStr = gain >= 0 ? `+₹${gain.toLocaleString()} realized gain` : `-₹${Math.abs(gain).toLocaleString()} realized loss`;
      setSuccess(`Sell lot executed successfully! (${gainStr})`);
      setShowSellModal(false);
      fetchInvestments();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to execute sell lot order.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      asset_name: assetName,
      asset_type: assetType,
      symbol: symbol,
      exchange: exchange,
      quantity: parseFloat(quantity),
      purchase_price: parseFloat(purchasePrice),
      purchase_date: purchaseDate + 'T12:00:00'
    };

    try {
      if (editingId) {
        await axios.put(`${API_URL}/investments/${editingId}`, payload);
        setSuccess('Investment holding updated successfully!');
      } else {
        await axios.post(`${API_URL}/investments`, payload);
        if (matchedHolding) {
          setSuccess(`Lot added to existing position for ${matchedHolding.asset_name}! Average cost updated.`);
        } else {
          setSuccess('New investment holding created successfully!');
        }
      }
      setShowModal(false);
      fetchInvestments();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save investment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment record? All associated transaction history will be permanently deleted.')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/investments/${id}`);
      setSuccess('Investment record removed successfully.');
      fetchInvestments();
    } catch (err) {
      console.error(err);
      setError('Failed to delete investment.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Notifications */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-2xl text-danger text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-danger/20 rounded-lg">×</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-2xl text-success text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="p-1 hover:bg-success/20 rounded-lg">×</button>
        </div>
      )}

      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">Wealth Portfolio Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20">
              Lot Aware Ledger
            </span>
          </div>
          <p className="text-xs text-textSecondary font-medium mt-1">
            Real-time market analytics, multi-lot average cost tracking, and sovereign wealth integration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowIndiaPostModal(true)}
            className="px-4 py-2.5 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold text-xs rounded-2xl border border-borderColor transition-all flex items-center gap-2 shadow-xs min-h-[44px]"
          >
            <Landmark className="w-4 h-4 text-warning" />
            <span>India Post Assets</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-primary hover:bg-primaryHover text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center gap-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset / Lot</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Portfolio Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-cardBg border border-borderColor rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Portfolio Value</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-textPrimary font-numeric">
            ₹{(summary.total_current_value || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-textSecondary font-medium mt-1">
            Invested: <span className="font-bold text-textPrimary">₹{(summary.total_investment || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-cardBg border border-borderColor rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Unrealized P&L</span>
            {(summary.total_profit_loss || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger" />
            )}
          </div>
          <div className={`text-lg sm:text-2xl font-black font-numeric ${(summary.total_profit_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
            {(summary.total_profit_loss || 0) >= 0 ? '+' : ''}₹{(summary.total_profit_loss || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs font-bold mt-1">
            <span className={(summary.total_profit_loss_percentage || 0) >= 0 ? 'text-success' : 'text-danger'}>
              {(summary.total_profit_loss_percentage || 0) >= 0 ? '+' : ''}{(summary.total_profit_loss_percentage || 0).toFixed(2)}%
            </span> overall
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-cardBg border border-borderColor rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sovereign Wealth</span>
            <Landmark className="w-4 h-4 text-warning" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-textPrimary font-numeric">
            ₹{(summary.total_india_post_value || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-textSecondary font-medium mt-1">
            Post Office PPF / NSC / MIS
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-cardBg border border-borderColor rounded-3xl shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Grand Total Wealth</span>
            <Award className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-primary font-numeric">
            ₹{(summary.grand_total_wealth || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-textSecondary font-medium mt-1">
            Aggregated Net Worth Engine
          </div>
        </div>
      </div>

      {/* 3. Performance & Allocation Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Area Chart */}
        <div className="lg:col-span-2 bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Portfolio Performance Timeline</h3>
              <p className="text-xs text-textSecondary font-medium">Historical invested capital vs current market evaluation</p>
            </div>
            
            <div className="flex items-center gap-1 p-1 bg-background border border-borderColor rounded-2xl self-start sm:self-auto">
              {['1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setPerfTimeframe(tf)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all ${
                    perfTimeframe === tf 
                      ? 'bg-primary text-white shadow-xs' 
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            {performanceTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(val, name) => [`₹${val.toLocaleString()}`, name === 'portfolioValue' ? 'Current Value' : 'Invested Capital']}
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '16px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="portfolioValue" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  <Area type="monotone" dataKey="invested" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-borderColor rounded-2xl p-6 text-center text-textMuted text-xs font-medium">
                <BarChart3 className="w-8 h-8 text-textMuted mb-2" />
                <span>Performance timeline will populate as holdings accumulate history.</span>
              </div>
            )}
          </div>
        </div>

        {/* Asset Class Allocation Donut */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Asset Allocation</h3>
            <button
              onClick={() => setAllocationDisplayMode(allocationDisplayMode === 'percent' ? 'value' : 'percent')}
              className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-hoverBg hover:bg-borderColor text-textSecondary rounded-xl border border-borderColor"
            >
              {allocationDisplayMode === 'percent' ? '%' : '₹'}
            </button>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {allocation && allocation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {allocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--card-bg)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => allocationDisplayMode === 'percent' ? [`${val}%`, 'Allocation'] : [`₹${val.toLocaleString()}`, 'Value']}
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '16px', fontSize: '12px' }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs font-semibold text-textSecondary">{value}</span>}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-textMuted text-xs font-medium text-center">No allocation data available</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Benchmark Comparison Bar */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Market Benchmark Comparison</h3>
            <p className="text-xs text-textSecondary font-medium">Your aggregate portfolio return vs Indian benchmark indices</p>
          </div>
          <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider bg-background px-3 py-1 rounded-xl border border-borderColor self-start sm:self-auto">
            Live Indices Relative Performance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-background border border-borderColor rounded-2xl space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider">Your Portfolio</span>
            <div className={`text-lg font-black font-numeric ${(summary.total_profit_loss_percentage || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {(summary.total_profit_loss_percentage || 0) >= 0 ? '+' : ''}{(summary.total_profit_loss_percentage || 0).toFixed(2)}%
            </div>
            <span className="text-[10px] text-textMuted">Weighted Total Return</span>
          </div>

          <div className="p-4 bg-background border border-borderColor rounded-2xl space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-textMuted tracking-wider">NIFTY 50 (1Y Est)</span>
            <div className="text-lg font-black text-textPrimary font-numeric">+14.20%</div>
            <span className="text-[10px] text-textMuted">NSE Benchmark Index</span>
          </div>

          <div className="p-4 bg-background border border-borderColor rounded-2xl space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-textMuted tracking-wider">SENSEX (1Y Est)</span>
            <div className="text-lg font-black text-textPrimary font-numeric">+12.80%</div>
            <span className="text-[10px] text-textMuted">BSE Benchmark Index</span>
          </div>
        </div>
      </div>

      {/* 5. Holdings Ledger Section */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Your Asset Holdings Ledger</h3>
            <p className="text-xs text-textSecondary font-medium">Single position per asset identity with multi-lot tracking & cost basis</p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl border border-primary/20 transition-all flex items-center gap-1.5 self-start sm:self-auto min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset / Lot</span>
          </button>
        </div>

        {items && items.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-textMuted font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Asset</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-3 text-right">Avg Buy</th>
                    <th className="py-3 px-3 text-right">Current</th>
                    <th className="py-3 px-3 text-right">Invested</th>
                    <th className="py-3 px-3 text-right">Current Value</th>
                    <th className="py-3 px-3 text-right">Unrealized P&L</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/60">
                  {items.map((inv) => (
                    <tr key={inv.id} className="hover:bg-hoverBg/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-textPrimary text-xs">{inv.asset_name}</div>
                        <div className="text-[10px] font-mono text-textMuted mt-0.5">
                          {inv.symbol || 'N/A'} • {inv.exchange || 'NSE'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-background border border-borderColor text-textSecondary">
                          {inv.asset_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold font-numeric text-textPrimary">
                        {inv.quantity}
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium font-numeric text-textSecondary">
                        ₹{inv.purchase_price.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold font-numeric text-textPrimary">
                        ₹{inv.current_price.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold font-numeric text-textSecondary">
                        ₹{inv.purchase_value.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black font-numeric text-textPrimary">
                        ₹{inv.current_value.toLocaleString()}
                      </td>
                      <td className={`py-3.5 px-3 text-right font-extrabold font-numeric ${inv.profit_loss >= 0 ? 'text-success' : 'text-danger'}`}>
                        <div>{inv.profit_loss >= 0 ? '+' : ''}₹{inv.profit_loss.toLocaleString()}</div>
                        <div className="text-[10px]">({inv.profit_loss_percentage}%)</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailHolding(inv)}
                            className="p-1.5 text-textSecondary hover:text-primary hover:bg-hoverBg rounded-lg transition-colors"
                            title="View Details & History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAddForExisting(inv)}
                            className="p-1.5 text-textSecondary hover:text-success hover:bg-hoverBg rounded-lg transition-colors"
                            title="Add BUY Lot"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenSell(inv)}
                            className="p-1.5 text-textSecondary hover:text-warning hover:bg-hoverBg rounded-lg transition-colors"
                            title="Sell Lot"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(inv)}
                            className="p-1.5 text-textSecondary hover:text-primary hover:bg-hoverBg rounded-lg transition-colors"
                            title="Edit Holding"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-textSecondary hover:text-danger hover:bg-hoverBg rounded-lg transition-colors"
                            title="Delete Holding"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (< 640px) */}
            <div className="sm:hidden space-y-3">
              {items.map((inv) => (
                <div key={inv.id} className="p-4 bg-background border border-borderColor rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-extrabold text-textPrimary">{inv.asset_name}</h4>
                      <p className="text-[10px] font-mono text-textMuted mt-0.5">
                        {inv.symbol || 'N/A'} • {inv.exchange || 'NSE'} • {inv.asset_type}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-textSecondary">
                      {inv.quantity} units
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borderColor/50 text-xs">
                    <div>
                      <span className="text-[10px] text-textMuted uppercase font-bold block">Current Value</span>
                      <span className="font-extrabold text-textPrimary font-numeric">₹{inv.current_value.toLocaleString()}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-textMuted uppercase font-bold block">Invested</span>
                      <span className="font-semibold text-textSecondary font-numeric">₹{inv.purchase_value.toLocaleString()}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-textMuted uppercase font-bold block">Unrealized P&L</span>
                      <span className={`font-extrabold font-numeric ${inv.profit_loss >= 0 ? 'text-success' : 'text-danger'}`}>
                        {inv.profit_loss >= 0 ? '+' : ''}₹{inv.profit_loss.toLocaleString()} ({inv.profit_loss_percentage}%)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-textMuted uppercase font-bold block">Avg Buy Price</span>
                      <span className="font-semibold text-textSecondary font-numeric">₹{inv.purchase_price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-borderColor/50">
                    <button
                      onClick={() => setDetailHolding(inv)}
                      className="py-2 bg-hoverBg border border-borderColor text-textPrimary font-bold text-xs rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                      title="View Position Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleOpenAddForExisting(inv)}
                      className="py-2 bg-success/10 border border-success/20 text-success font-bold text-xs rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                      title="Buy Lot"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buy</span>
                    </button>
                    <button
                      onClick={() => handleOpenSell(inv)}
                      className="py-2 bg-warning/10 border border-warning/20 text-warning font-bold text-xs rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                      title="Sell Lot"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Sell</span>
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="py-2 bg-danger/10 border border-danger/20 text-danger font-bold text-xs rounded-xl flex items-center justify-center min-h-[44px]"
                      title="Delete Holding"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center border border-dashed border-borderColor rounded-2xl bg-background/50 p-6 text-center">
            <Coins className="w-8 h-8 text-textMuted mb-2" />
            <p className="text-sm font-bold text-textPrimary">No Asset Holdings Registered</p>
            <p className="text-xs text-textMuted mt-1">Tap "Add Asset / Lot" above to log your equities, mutual funds, or gold investments.</p>
          </div>
        )}
      </div>

      {/* 6. Investment Activity Section */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Investment Activity Log</h3>
            <p className="text-xs text-textSecondary font-medium">Recent transactions, buys, sells, and dividend payouts</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-background border border-borderColor rounded-2xl self-start sm:self-auto">
            {['All', 'BUY', 'SELL', 'DIVIDEND'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActivityFilter(type)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activityFilter === type 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {filteredActivity.length > 0 ? (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredActivity.map((act, idx) => (
              <div key={act.id || idx} className="p-3.5 bg-background border border-borderColor rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 truncate">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    act.transaction_type === 'BUY' ? 'bg-primary/10 text-primary' :
                    act.transaction_type === 'SELL' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                  }`}>
                    {act.transaction_type === 'BUY' ? 'BUY' : act.transaction_type === 'SELL' ? 'SELL' : 'DIV'}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-extrabold text-textPrimary truncate">{act.asset_name}</h4>
                    <p className="text-[10px] text-textMuted font-medium mt-0.5">
                      {act.transaction_date ? new Date(act.transaction_date).toLocaleDateString('en-IN') : 'Recent'} • {act.notes || 'Recorded transaction'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-extrabold text-textPrimary font-numeric">
                    ₹{(act.total_amount || 0).toLocaleString()}
                  </div>
                  {act.units > 0 && (
                    <div className="text-[10px] text-textMuted font-numeric">
                      {act.units} units @ ₹{act.price_per_unit}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-textMuted text-xs font-medium border border-dashed border-borderColor rounded-2xl">
            No activity records found matching filter selection
          </div>
        )}
      </div>

      {/* 7. Portfolio Insights Section */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Portfolio Insights</h3>
          <p className="text-xs text-textSecondary font-medium">Analytical observation metrics calculated strictly from holdings data</p>
        </div>

        {portfolioInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioInsights.map((ins, idx) => (
              <div key={idx} className="p-4 bg-background border border-borderColor rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">{ins.type}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {ins.badge}
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-textPrimary">{ins.title}</h4>
                <p className="text-xs text-textSecondary font-medium">{ins.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center text-textMuted text-xs font-medium border border-dashed border-borderColor rounded-2xl">
            Additional portfolio insights will activate as investment records accumulate
          </div>
        )}
      </div>

      {/* 8. Wealth Forecaster Section */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Compound Wealth Forecaster</h3>
            <p className="text-xs text-textSecondary font-medium">Long-term projected portfolio growth modeling</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold self-start sm:self-auto">
            Mathematical Projection
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4 lg:col-span-1">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">
                Monthly SIP Contribution: <strong className="text-primary font-numeric">₹{monthlyContribution.toLocaleString()}</strong>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100000" 
                step="1000" 
                value={monthlyContribution} 
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">
                Target CAGR / Return: <strong className="text-primary font-numeric">{cagr}%</strong>
              </label>
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="0.5" 
                value={cagr} 
                onChange={(e) => setCagr(Number(e.target.value))}
                className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">
                Time Horizon: <strong className="text-primary font-numeric">{projectionYears} Years</strong>
              </label>
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="1" 
                value={projectionYears} 
                onChange={(e) => setProjectionYears(Number(e.target.value))}
                className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="p-3.5 bg-background border border-borderColor rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-textMuted">Projected Future Wealth:</span>
                <span className="font-extrabold text-primary font-numeric">
                  ₹{projectionData[projectionData.length - 1]?.balance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Estimated Investment Growth:</span>
                <span className="font-extrabold text-success font-numeric">
                  ₹{projectionData[projectionData.length - 1]?.growth.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                <Tooltip 
                  formatter={(val, name) => [`₹${val.toLocaleString()}`, name === 'balance' ? 'Projected Balance' : 'Contributions']}
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '16px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="balance" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorBal)" />
                <Area type="monotone" dataKey="contributions" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 9. Holding Detail & Transaction History Modal */}
      <Modal
        isOpen={!!detailHolding}
        onClose={() => setDetailHolding(null)}
        title={detailHolding?.asset_name || 'Holding Details'}
        subtitle={`${detailHolding?.symbol || 'N/A'} • ${detailHolding?.exchange || 'NSE'} • ${detailHolding?.asset_type}`}
        icon={Briefcase}
        maxWidth="max-w-xl"
      >
        {detailHolding && (
          <div className="space-y-5">
            {/* Position Overview Card */}
            <div className="p-4 bg-background border border-borderColor rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-borderColor/50 pb-2">
                <span className="text-xs font-extrabold uppercase text-textMuted tracking-wider">Current Position</span>
                <span className="text-xs font-extrabold text-primary font-numeric">
                  ₹{detailHolding.current_value.toLocaleString()} Value
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-textMuted uppercase font-bold block">Quantity</span>
                  <span className="font-extrabold text-textPrimary font-numeric">{detailHolding.quantity} units</span>
                </div>

                <div>
                  <span className="text-[10px] text-textMuted uppercase font-bold block">Avg Buy Price</span>
                  <span className="font-semibold text-textSecondary font-numeric">₹{detailHolding.purchase_price.toLocaleString()}</span>
                </div>

                <div>
                  <span className="text-[10px] text-textMuted uppercase font-bold block">Invested Cost</span>
                  <span className="font-semibold text-textSecondary font-numeric">₹{detailHolding.purchase_value.toLocaleString()}</span>
                </div>

                <div>
                  <span className="text-[10px] text-textMuted uppercase font-bold block">Unrealized P&L</span>
                  <span className={`font-extrabold font-numeric ${detailHolding.profit_loss >= 0 ? 'text-success' : 'text-danger'}`}>
                    {detailHolding.profit_loss >= 0 ? '+' : ''}₹{detailHolding.profit_loss.toLocaleString()} ({detailHolding.profit_loss_percentage}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction History Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-extrabold text-textPrimary">Purchase & Transaction History</h4>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-background border border-borderColor rounded-xl p-1 text-[11px]">
                    {['ALL', 'BUY', 'SELL', 'DIVIDEND'].map(f => (
                      <button
                        key={f}
                        onClick={() => setDetailTxFilter(f)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                          detailTxFilter === f ? 'bg-primary text-white' : 'text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setDetailTxSort(detailTxSort === 'desc' ? 'asc' : 'desc')}
                    className="px-2 py-1 bg-background border border-borderColor text-textSecondary hover:text-textPrimary rounded-xl text-[11px] font-bold"
                  >
                    {detailTxSort === 'desc' ? 'Newest' : 'Oldest'}
                  </button>
                </div>
              </div>

              {detailTxLoading ? (
                <div className="h-24 flex items-center justify-center text-textMuted text-xs font-medium">
                  Loading lot transactions...
                </div>
              ) : filteredDetailTx.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredDetailTx.map((tx) => (
                    <div key={tx.id} className="p-3 bg-background border border-borderColor rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                          tx.transaction_type === 'BUY' ? 'bg-primary/10 text-primary border border-primary/20' :
                          tx.transaction_type === 'SELL' ? 'bg-warning/10 text-warning border border-warning/20' :
                          'bg-success/10 text-success border border-success/20'
                        }`}>
                          {tx.transaction_type}
                        </span>
                        <div>
                          <div className="font-extrabold text-textPrimary">
                            {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recorded'}
                          </div>
                          <div className="text-[10px] text-textMuted font-medium">
                            {tx.notes || `${tx.transaction_type} lot`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-textPrimary font-numeric">
                          ₹{(tx.total_amount || 0).toLocaleString()}
                        </div>
                        {tx.units > 0 && (
                          <div className="text-[10px] text-textMuted font-numeric">
                            {tx.units} units @ ₹{tx.price_per_unit}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center border border-dashed border-borderColor rounded-xl text-textMuted text-xs">
                  No lot transactions recorded for this filter
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-borderColor">
              <button
                onClick={() => {
                  const inv = detailHolding;
                  setDetailHolding(null);
                  handleOpenAddForExisting(inv);
                }}
                className="flex-1 py-2.5 bg-primary hover:bg-primaryHover text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Purchase Lot</span>
              </button>
              <button
                onClick={() => {
                  const inv = detailHolding;
                  setDetailHolding(null);
                  handleOpenSell(inv);
                }}
                className="flex-1 py-2.5 bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Sell Lot</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 10. Sell Lot Modal */}
      <Modal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        title={sellHolding ? `Sell ${sellHolding.asset_name}` : 'Sell Lot'}
        subtitle={sellHolding ? `Currently holding ${sellHolding.quantity} units @ Avg ₹${sellHolding.purchase_price}` : 'Execute sell lot order'}
        icon={ArrowDownLeft}
        maxWidth="max-w-md"
      >
        {sellHolding && (
          <form onSubmit={handleConfirmSell} className="space-y-4">
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-warning">
                <span>Weighted Average Cost Basis:</span>
                <span className="font-numeric">₹{sellHolding.purchase_price.toLocaleString()} / unit</span>
              </div>
              <div className="flex justify-between text-textSecondary">
                <span>Available Units:</span>
                <span className="font-numeric">{sellHolding.quantity} units</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Units to Sell</label>
              <input 
                type="number" 
                step="any"
                required
                max={sellHolding.quantity}
                placeholder={`Max ${sellHolding.quantity}`}
                value={sellUnits}
                onChange={(e) => setSellUnits(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Selling Price per Unit (₹)</label>
              <input 
                type="number" 
                step="any"
                required
                placeholder={sellHolding.current_price || sellHolding.purchase_price}
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {sellUnits && sellPrice && (
              <div className="p-3.5 bg-background border border-borderColor rounded-2xl space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-textMuted">Gross Sale Proceeds:</span>
                  <span className="font-extrabold text-textPrimary font-numeric">
                    ₹{(parseFloat(sellUnits) * parseFloat(sellPrice)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textMuted">Cost Basis of Sale:</span>
                  <span className="font-semibold text-textSecondary font-numeric">
                    ₹{(parseFloat(sellUnits) * sellHolding.purchase_price).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-borderColor/50">
                  <span className="text-textMuted">Estimated Realized Gain:</span>
                  <span className={`font-black font-numeric ${(parseFloat(sellUnits) * (parseFloat(sellPrice) - sellHolding.purchase_price)) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {(parseFloat(sellUnits) * (parseFloat(sellPrice) - sellHolding.purchase_price)) >= 0 ? '+' : ''}₹{(parseFloat(sellUnits) * (parseFloat(sellPrice) - sellHolding.purchase_price)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Transaction Date</label>
              <input 
                type="date" 
                required
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-borderColor">
              <button 
                type="button"
                onClick={() => setShowSellModal(false)}
                className="w-1/3 min-h-[48px] bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="w-2/3 min-h-[48px] bg-warning hover:bg-warning/90 text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center"
              >
                Confirm Sale
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 11. Log / Edit Holding Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Asset Holding' : matchedHolding ? 'Add Purchase Lot to Position' : 'Log New Investment'}
        subtitle={editingId ? 'Update asset holding parameters' : matchedHolding ? 'Existing position recognized — adding new lot' : 'Record a new asset holding in your portfolio'}
        icon={TrendingUp}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Matched Holding Detection Banner */}
          {matchedHolding && !editingId && (
            <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Existing Holding Found — Automatic Lot Addition</span>
              </div>
              <p className="text-xs text-textPrimary font-semibold">
                {matchedHolding.asset_name} ({matchedHolding.symbol || 'N/A'}) • Current Position: {matchedHolding.quantity} units @ Avg ₹{matchedHolding.purchase_price.toLocaleString()} (Cost: ₹{matchedHolding.purchase_value.toLocaleString()})
              </p>
              {quantity && purchasePrice && (
                <div className="pt-2 border-t border-primary/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-textMuted block uppercase text-[9px]">Lot Purchase Cost:</span>
                    <span className="font-extrabold text-textPrimary">
                      ₹{(parseFloat(quantity) * parseFloat(purchasePrice)).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-textMuted block uppercase text-[9px]">New Avg Price:</span>
                    <span className="font-extrabold text-primary">
                      ₹{(
                        (matchedHolding.purchase_value + (parseFloat(quantity) * parseFloat(purchasePrice))) / 
                        (matchedHolding.quantity + parseFloat(quantity))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Asset Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Reliance, BTC, SGB"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Asset Type</label>
              <Select 
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                options={ASSET_TYPES}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Symbol</label>
              <input 
                type="text" 
                required
                placeholder="e.g. AAPL, RELIANCE.NS"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Exchange</label>
              <input 
                type="text" 
                required
                placeholder="e.g. NASDAQ, NSE, BSE, Crypto"
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Quantity / Units</label>
              <input 
                type="number" 
                step="any"
                required
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Purchase Price per Unit (₹)</label>
              <input 
                type="number" 
                step="any"
                required
                placeholder="1200"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Purchase Date</label>
            <input 
              type="date" 
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-borderColor shrink-0">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="w-1/3 min-h-[48px] bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-2/3 min-h-[48px] bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center"
            >
              {editingId ? 'Update Asset' : matchedHolding ? 'Confirm Lot Purchase' : 'Save Asset Position'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 12. India Post Investment Center Modal */}
      <IndiaPostModal 
        isOpen={showIndiaPostModal} 
        onClose={() => setShowIndiaPostModal(false)}
        onRefreshParent={fetchInvestments}
      />
    </div>
  );
};

export default InvestmentsPage;
