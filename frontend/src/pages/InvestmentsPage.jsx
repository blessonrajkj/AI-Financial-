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
  Briefcase
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

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

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

  // Form Fields
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
        axios.get(`${API_URL}/investments?t=${Date.now()}`),
        axios.get(`${API_URL}/investments/activity?t=${Date.now()}`).catch(() => ({ data: [] }))
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

  const summary = data.summary || {};
  const items = data.items || [];
  const allocation = data.allocation || [];
  const currentAssetValue = summary.total_current_value || 0;

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

  // Performance Historical Chart Points (Calculated from real purchase dates & holdings)
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
        setSuccess('New investment logged successfully!');
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
    if (!window.confirm('Are you sure you want to delete this investment record?')) return;
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
    <div className="space-y-6 pb-12">
      
      {/* 1. Header & Engine Controls */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                Wealth Portfolio Engine
              </span>
              <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
                data.live_api_working !== false 
                  ? 'bg-success/10 border-success/20 text-success' 
                  : 'bg-warning/10 border-warning/20 text-warning'
              }`}>
                {data.live_api_working !== false ? '● Live API Connected' : '● Stale Prices (Cached)'}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-textPrimary">
              Investment Portfolio
            </h1>
            <p className="text-xs sm:text-sm text-textSecondary mt-1 font-medium max-w-2xl">
              Track equities, mutual funds, SIPs, sovereign savings and long-term wealth growth.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowIndiaPostModal(true)}
              className="px-4 py-2.5 bg-success/10 hover:bg-success/20 border border-success/30 text-success text-xs font-extrabold rounded-2xl transition-all flex items-center gap-2 shadow-xs min-h-[44px]"
            >
              <span className="text-base">📮</span>
              <span>India Post Center</span>
            </button>

            <button 
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs font-extrabold rounded-2xl shadow-md transition-all flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Holding</span>
            </button>
          </div>
        </div>

        {data.last_updated_time && (
          <div className="mt-4 pt-3 border-t border-borderColor/60 flex items-center justify-between text-[11px] text-textMuted font-medium">
            <span>Last Market Sync: <strong className="text-textSecondary">{data.last_updated_time}</strong></span>
            <span>Real-time decimal precision active</span>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-sm font-semibold flex items-center space-x-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 2. Top Portfolio Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Portfolio Value */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Portfolio Value</span>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-textPrimary font-numeric tracking-tight">
              ₹{(summary.total_current_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-textMuted font-medium mt-1">
              Invested: <strong className="text-textSecondary font-numeric">₹{(summary.total_investment || 0).toLocaleString()}</strong>
            </p>
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Unrealized P&L</span>
          <div className="mt-2">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <h3 className={`text-xl sm:text-2xl font-black font-numeric tracking-tight ${(summary.total_profit_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                ₹{(summary.total_profit_loss || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <p className={`text-xs font-bold font-numeric mt-1 ${(summary.total_profit_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {(summary.total_profit_loss || 0) >= 0 ? '+' : ''}{(summary.total_profit_loss_percentage || 0).toFixed(2)}% net gain
            </p>
          </div>
        </div>

        {/* Today's P&L */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Today's P&L</span>
          <div className="mt-2">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <h3 className={`text-xl sm:text-2xl font-black font-numeric tracking-tight ${(summary.today_gain_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {(summary.today_gain_loss || 0) >= 0 ? '+' : ''}₹{(summary.today_gain_loss || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-xs text-textMuted font-medium mt-1">
              Daily market movement
            </p>
          </div>
        </div>

        {/* Total Returns & Risk */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Total Returns</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
              (summary.portfolio_risk_score || 0) > 6 ? 'bg-danger/10 text-danger border-danger/20' : 
              (summary.portfolio_risk_score || 0) > 3 ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'
            }`}>
              Risk: {summary.portfolio_risk_score || 0}/10
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-textPrimary font-numeric tracking-tight">
              ₹{((summary.total_profit_loss || 0) + (summary.total_dividends || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-textMuted font-medium mt-1">
              Dividends: <strong className="text-textSecondary font-numeric">₹{(summary.total_dividends || 0).toLocaleString()}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Combined Wealth Totals Aggregator */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-borderColor">
          <div>
            <h3 className="text-base font-extrabold text-textPrimary">Total Invested Assets Breakdown</h3>
            <p className="text-xs text-textSecondary font-medium">Aggregated across market holdings and sovereign Post Office investments</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Grand Total Wealth</span>
            <span className="text-xl font-black text-primary font-numeric">₹{(summary.grand_total_wealth || currentAssetValue).toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-background border border-borderColor rounded-2xl">
            <span className="text-[10px] font-bold text-textMuted uppercase block mb-1">Equities & ETFs</span>
            <span className="text-sm font-extrabold text-textPrimary font-numeric">
              ₹{items.filter(i => i.asset_type === 'Stocks' || i.asset_type === 'ETFs').reduce((acc, i) => acc + i.current_value, 0).toLocaleString()}
            </span>
          </div>
          
          <div className="p-3 bg-background border border-borderColor rounded-2xl">
            <span className="text-[10px] font-bold text-textMuted uppercase block mb-1">Mutual Funds & SIPs</span>
            <span className="text-sm font-extrabold text-textPrimary font-numeric">
              ₹{items.filter(i => i.asset_type === 'Mutual Funds' || i.asset_type === 'SIPs').reduce((acc, i) => acc + i.current_value, 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-background border border-borderColor rounded-2xl">
            <span className="text-[10px] font-bold text-textMuted uppercase block mb-1">India Post Sovereign</span>
            <span className="text-sm font-extrabold text-success font-numeric">
              ₹{(summary.total_india_post_value || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-background border border-borderColor rounded-2xl">
            <span className="text-[10px] font-bold text-textMuted uppercase block mb-1">Other Assets & Cash</span>
            <span className="text-sm font-extrabold text-textPrimary font-numeric">
              ₹{items.filter(i => !['Stocks', 'ETFs', 'Mutual Funds', 'SIPs'].includes(i.asset_type)).reduce((acc, i) => acc + i.current_value, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Portfolio Performance Section */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Portfolio Performance</h3>
            <p className="text-xs text-textSecondary font-medium mt-0.5">Portfolio value and capital growth timeline</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-background border border-borderColor rounded-2xl self-start sm:self-auto">
            {['1M', '3M', '6M', '1Y', '3Y', 'ALL'].map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setPerfTimeframe(tf)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  perfTimeframe === tf 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'text-textSecondary hover:text-textPrimary hover:bg-hoverBg'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {performanceTimeline.length >= 2 ? (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(val, name) => [`₹${val.toLocaleString()}`, name === 'portfolioValue' ? 'Portfolio Value' : 'Invested Capital']}
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '16px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="portfolioValue" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="invested" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorInv)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed border-borderColor rounded-2xl bg-background/50 p-6 text-center">
            <BarChart3 className="w-8 h-8 text-textMuted mb-2" />
            <p className="text-sm font-bold text-textPrimary">Historical Performance Tracking Active</p>
            <p className="text-xs text-textMuted mt-1 max-w-md">
              Additional timeline data points will accumulate automatically as investment transactions are recorded.
            </p>
          </div>
        )}

        {/* Benchmark Comparison Bar */}
        <div className="mt-6 pt-4 border-t border-borderColor flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-textPrimary uppercase tracking-wider">Performance vs Benchmark:</span>
            <span className="text-xs text-textMuted">Market comparison index</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1 bg-background border border-borderColor rounded-xl text-xs font-semibold">
              Your Portfolio: <strong className="text-primary font-numeric">{(summary.total_profit_loss_percentage || 0).toFixed(2)}%</strong>
            </div>
            <div className="px-3 py-1 bg-background border border-borderColor rounded-xl text-xs font-medium text-textMuted">
              NIFTY 50: <span className="text-textSecondary font-numeric">Benchmark Data Unavailable</span>
            </div>
            <div className="px-3 py-1 bg-background border border-borderColor rounded-xl text-xs font-medium text-textMuted">
              SENSEX: <span className="text-textSecondary font-numeric">Benchmark Data Unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Asset Allocation & Sector Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Asset Class Allocation */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-textPrimary">Asset Class Allocation</h3>
              <p className="text-xs text-textSecondary font-medium">Distribution across asset types</p>
            </div>
            
            <div className="flex items-center gap-1 p-1 bg-background border border-borderColor rounded-xl">
              <button
                type="button"
                onClick={() => setAllocationDisplayMode('percent')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  allocationDisplayMode === 'percent' ? 'bg-primary text-white' : 'text-textSecondary'
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setAllocationDisplayMode('value')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  allocationDisplayMode === 'value' ? 'bg-primary text-white' : 'text-textSecondary'
                }`}
              >
                ₹
              </button>
            </div>
          </div>

          {allocation.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {allocation.map((item, index) => {
                  const valAmount = (currentAssetValue * (item.value / 100));
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-background border border-borderColor rounded-xl">
                      <div className="flex items-center space-x-2 truncate">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs font-bold text-textPrimary truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-textSecondary font-numeric shrink-0">
                        {allocationDisplayMode === 'percent' ? `${item.value}%` : `₹${Math.round(valAmount).toLocaleString()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-textMuted text-xs font-medium">
              Add holding records to view asset allocation chart
            </div>
          )}
        </div>

        {/* Sector Allocation */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-textPrimary">Sector Allocation</h3>
            <p className="text-xs text-textSecondary font-medium">Exposure by economic sector</p>
          </div>

          {sectorAllocation.length > 0 ? (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {sectorAllocation.map((sec, idx) => {
                const secPct = currentAssetValue > 0 ? ((sec.value / currentAssetValue) * 100).toFixed(1) : 0;
                return (
                  <div key={sec.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-textPrimary">{sec.name}</span>
                      <span className="text-textSecondary font-numeric">₹{sec.value.toLocaleString()} ({secPct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden border border-borderColor/50">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${secPct}%`, 
                          backgroundColor: COLORS[idx % COLORS.length] 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-textMuted text-xs font-medium">
              Sector metadata pending additional symbol classifications
            </div>
          )}
        </div>
      </div>

      {/* 5. Holdings Section */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-textPrimary">Investment Holdings Ledger</h3>
            <p className="text-xs text-textSecondary font-medium">{items.length} active asset positions registered</p>
          </div>

          <button 
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto min-h-[40px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Asset</span>
          </button>
        </div>

        {items.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (≥ 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-textMuted uppercase font-bold tracking-wider">
                    <th className="py-3 px-3">Asset</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Qty</th>
                    <th className="py-3 px-3">Avg Buy</th>
                    <th className="py-3 px-3">Current</th>
                    <th className="py-3 px-3">Invested</th>
                    <th className="py-3 px-3">Current Value</th>
                    <th className="py-3 px-3">Unrealized P&L</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/60">
                  {items.map((inv) => (
                    <tr key={inv.id} className="hover:bg-hoverBg/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-textPrimary text-sm">{inv.asset_name}</div>
                        <div className="text-[10px] text-textMuted font-mono">{inv.symbol || 'N/A'} • {inv.exchange || 'NSE'}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-background border border-borderColor font-bold text-textSecondary text-[10px]">
                          {inv.asset_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold font-numeric text-textPrimary">{inv.quantity}</td>
                      <td className="py-3.5 px-3 font-semibold font-numeric text-textSecondary">₹{inv.purchase_price.toLocaleString()}</td>
                      <td className="py-3.5 px-3 font-semibold font-numeric text-textPrimary">₹{inv.current_price.toLocaleString()}</td>
                      <td className="py-3.5 px-3 font-semibold font-numeric text-textSecondary">₹{inv.purchase_value.toLocaleString()}</td>
                      <td className="py-3.5 px-3 font-extrabold font-numeric text-textPrimary">₹{inv.current_value.toLocaleString()}</td>
                      <td className="py-3.5 px-3 font-bold font-numeric">
                        <div className={inv.profit_loss >= 0 ? 'text-success' : 'text-danger'}>
                          {inv.profit_loss >= 0 ? '+' : ''}₹{inv.profit_loss.toLocaleString()}
                        </div>
                        <div className={`text-[10px] ${inv.profit_loss >= 0 ? 'text-success' : 'text-danger'}`}>
                          {inv.profit_loss >= 0 ? '+' : ''}{inv.profit_loss_percentage}%
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setDetailHolding(inv)}
                            className="p-1.5 text-textSecondary hover:text-primary hover:bg-hoverBg rounded-lg transition-colors"
                            title="View Detail"
                          >
                            <Eye className="w-4 h-4" />
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

                  <div className="flex items-center gap-2 pt-2 border-t border-borderColor/50">
                    <button
                      onClick={() => setDetailHolding(inv)}
                      className="flex-1 py-2 bg-hoverBg border border-borderColor text-textPrimary font-bold text-xs rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(inv)}
                      className="flex-1 py-2 bg-hoverBg border border-borderColor text-textPrimary font-bold text-xs rounded-xl flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="py-2 px-3 bg-danger/10 border border-danger/20 text-danger font-bold text-xs rounded-xl flex items-center justify-center min-h-[44px]"
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
            <p className="text-xs text-textMuted mt-1">Tap "Add Asset" above to log your equities, mutual funds, or gold investments.</p>
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

      {/* 9. Holding Detail Modal */}
      <Modal
        isOpen={!!detailHolding}
        onClose={() => setDetailHolding(null)}
        title={detailHolding?.asset_name || 'Holding Details'}
        subtitle={`${detailHolding?.symbol || 'N/A'} • ${detailHolding?.exchange || 'NSE'} • ${detailHolding?.asset_type}`}
        icon={Briefcase}
        maxWidth="max-w-md"
      >
        {detailHolding && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-background border border-borderColor rounded-2xl text-xs">
              <div>
                <span className="text-[10px] text-textMuted uppercase font-bold block">Current Value</span>
                <span className="font-extrabold text-textPrimary text-base font-numeric">₹{detailHolding.current_value.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-textMuted uppercase font-bold block">Invested Amount</span>
                <span className="font-semibold text-textSecondary text-base font-numeric">₹{detailHolding.purchase_value.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-background border border-borderColor rounded-2xl">
                <span className="text-[10px] font-bold text-textMuted uppercase block">Unrealized P&L</span>
                <span className={`font-extrabold font-numeric ${detailHolding.profit_loss >= 0 ? 'text-success' : 'text-danger'}`}>
                  {detailHolding.profit_loss >= 0 ? '+' : ''}₹{detailHolding.profit_loss.toLocaleString()} ({detailHolding.profit_loss_percentage}%)
                </span>
              </div>

              <div className="p-3 bg-background border border-borderColor rounded-2xl">
                <span className="text-[10px] font-bold text-textMuted uppercase block">Quantity</span>
                <span className="font-bold text-textPrimary font-numeric">{detailHolding.quantity} units</span>
              </div>

              <div className="p-3 bg-background border border-borderColor rounded-2xl">
                <span className="text-[10px] font-bold text-textMuted uppercase block">Avg Buy Price</span>
                <span className="font-semibold text-textSecondary font-numeric">₹{detailHolding.purchase_price.toLocaleString()}</span>
              </div>

              <div className="p-3 bg-background border border-borderColor rounded-2xl">
                <span className="text-[10px] font-bold text-textMuted uppercase block">Current Price</span>
                <span className="font-semibold text-textPrimary font-numeric">₹{detailHolding.current_price.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-background border border-borderColor rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-textMuted">Purchase Date:</span>
                <span className="font-semibold text-textPrimary">
                  {detailHolding.purchase_date ? new Date(detailHolding.purchase_date).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Dividends Received:</span>
                <span className="font-semibold text-textPrimary font-numeric">
                  ₹{(detailHolding.dividends_received || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Portfolio Weight:</span>
                <span className="font-semibold text-primary font-numeric">
                  {currentAssetValue > 0 ? ((detailHolding.current_value / currentAssetValue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 10. Log / Edit Holding Form Modal (Using Shared Modal Architecture Component) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Asset Holding' : 'Log New Investment'}
        subtitle={editingId ? 'Update asset holding parameters' : 'Record a new asset holding in your portfolio'}
        icon={TrendingUp}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
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
              <select 
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              >
                {ASSET_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
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
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Quantity</label>
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
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-1.5">Avg Buy Price (₹)</label>
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
              Save Asset
            </button>
          </div>
        </form>
      </Modal>

      {/* 11. India Post Investment Center Modal */}
      <IndiaPostModal 
        isOpen={showIndiaPostModal} 
        onClose={() => setShowIndiaPostModal(false)}
        onRefreshParent={fetchInvestments}
      />
    </div>
  );
};

export default InvestmentsPage;
