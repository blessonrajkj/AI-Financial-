import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import IndiaPostModal from '../components/investments/IndiaPostModal';

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
  "NPS"
];

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#84CC16'
];

const InvestmentsPage = () => {
  const [data, setData] = useState({ summary: {}, allocation: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showIndiaPostModal, setShowIndiaPostModal] = useState(false);

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('Stocks');
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchInvestments = async () => {
    try {
      const res = await axios.get(`${API_URL}/investments?t=${Date.now()}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch investments.');
    } finally {
      setLoading(false);
    }
  };

  const [cagr, setCagr] = useState(12);
  const [projectionYears, setProjectionYears] = useState(10);
  const [monthlyContribution, setMonthlyContribution] = useState(10000);

  const currentAssetValue = data.summary?.total_value || 0;

  const projectionData = React.useMemo(() => {
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

  useEffect(() => {
    fetchInvestments();
  }, []);

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
      setSuccess('Investment record removed.');
      fetchInvestments();
    } catch (err) {
      console.error(err);
      setError('Failed to delete investment.');
    }
  };

  const summary = data.summary || {};
  const items = data.items || [];
  const allocation = data.allocation || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="doppel-shell relative overflow-hidden">
        <div className="glow-orb-accent -top-20 -right-20 w-80 h-80" />
        <div className="doppel-core px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Wealth Portfolio Engine
              </span>
              {data.is_demo_mode && (
                <span className="px-2 py-0.5 rounded-full bg-warning/15 border border-warning/30 text-warning text-[10px] font-extrabold uppercase tracking-wider">
                  Demo Market Tickers
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-textPrimary">Investment Portfolio</h1>
            <p className="text-xs text-textMuted mt-1 flex items-center space-x-1.5 font-medium">
              <span>Track equities, mutual funds, gold, SIPs, and sovereign holdings with real-time market sync</span>
              {data.last_updated_time && (
                <>
                  <span>•</span>
                  <span className="text-textMuted font-numeric">Synced: {data.last_updated_time}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <button 
              onClick={() => setShowIndiaPostModal(true)}
              className="px-4 py-2.5 bg-success/15 hover:bg-success/25 border border-success/30 text-success text-xs font-bold rounded-full transition-all flex items-center gap-2"
            >
              <span>📮</span>
              <span>India Post Center</span>
            </button>
            <button 
              onClick={handleOpenAdd}
              className="btn-island group"
            >
              <span>Add Holding</span>
              <span className="btn-island-icon">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Premium Category Banner for India Post Investments */}
      <div 
        onClick={() => setShowIndiaPostModal(true)}
        className="doppel-shell cursor-pointer group"
      >
        <div className="doppel-core p-5 flex items-center justify-between bg-gradient-to-r from-success/10 via-primary/5 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-success/15 border border-success/30 text-success rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform text-xl flex-shrink-0">
              📮
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-textPrimary">India Post Investment Center</h3>
                <span className="eyebrow-badge !text-success !bg-success/10 !border-success/20">Sovereign Safety</span>
              </div>
              <p className="text-xs text-textSecondary mt-1 leading-relaxed max-w-2xl font-medium">
                Manage PPF, Sukanya Samriddhi Yojana (SSY), MIS monthly interest payout schedules, NSC, KVP, and Post Office RD / savings accounts with real-time projections.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
            Launch Center →
          </div>
        </div>
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

      {data.live_api_working === false && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Live market API is temporarily offline. Showing cached asset prices from {data.last_updated_time || 'previously recorded sync'}.</span>
        </div>
      )}

      {/* Summary dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="doppel-shell">
          <div className="doppel-core p-5 flex flex-col justify-between">
            <span className="eyebrow-badge !px-2 !py-0.5">Portfolio Value</span>
            <div className="mt-2">
              <h3 className="text-xl font-extrabold text-textPrimary font-numeric tracking-tight">₹{(summary.total_current_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
              <span className="text-[11px] text-textMuted font-medium mt-1 block">Cost Basis: ₹{(summary.total_investment || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="doppel-shell">
          <div className="doppel-core p-5 flex flex-col justify-between">
            <span className="eyebrow-badge !px-2 !py-0.5">Cumulative Return</span>
            <div className="mt-2">
              <div className="flex items-baseline space-x-1.5">
                <h3 className={`text-xl font-extrabold font-numeric tracking-tight ${(summary.total_profit_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  ₹{(summary.total_profit_loss || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
                <span className={`text-xs font-bold font-numeric ${(summary.total_profit_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {(summary.total_profit_loss_percentage || 0).toFixed(2)}%
                </span>
              </div>
              <span className="text-[11px] text-textMuted font-medium mt-1 block">All-time net returns</span>
            </div>
          </div>
        </div>

        <div className="doppel-shell">
          <div className="doppel-core p-5 flex flex-col justify-between">
            <span className="eyebrow-badge !px-2 !py-0.5">Today's Movement</span>
            <div className="mt-2">
              <div className="flex items-baseline space-x-1.5">
                <h3 className={`text-xl font-extrabold font-numeric tracking-tight ${(summary.today_gain_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {(summary.today_gain_loss || 0) >= 0 ? '+' : ''}₹{(summary.today_gain_loss || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
                <span className={`text-xs font-bold font-numeric ${(summary.today_gain_loss || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {(summary.total_current_value > 0 ? (summary.today_gain_loss / summary.total_current_value * 100.0) : 0).toFixed(2)}%
                </span>
              </div>
              <span className="text-[11px] text-textMuted font-medium mt-1 block">Live day market change</span>
            </div>
          </div>
        </div>

        <div className="doppel-shell">
          <div className="doppel-core p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="eyebrow-badge !px-2 !py-0.5">Risk & Dividends</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                (summary.portfolio_risk_score || 0) > 6 ? 'bg-danger/10 text-danger border-danger/20' : 
                (summary.portfolio_risk_score || 0) > 3 ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'
              }`}>
                Risk: {summary.portfolio_risk_score || 0}/10
              </span>
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-extrabold text-textPrimary font-numeric tracking-tight">
                ₹{(summary.total_dividends || 0).toLocaleString()}
              </h3>
              <span className="text-[11px] text-textMuted font-medium mt-1 block">Total payouts received</span>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation charts & details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between md:col-span-1">
          <h4 className="text-sm font-bold text-textPrimary mb-4">Asset Class Allocation</h4>
          {allocation.length > 0 ? (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
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
              <div className="grid grid-cols-2 gap-2 mt-2">
                {allocation.map((item, index) => (
                  <div key={item.name} className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-[10px] font-bold text-textSecondary truncate">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-textMuted text-xs">
              Add holdings to build allocation chart
            </div>
          )}
        </div>

        {/* Ledger lists */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm md:col-span-2 overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-textPrimary">Investment Holdings Ledger</h4>
            <span className="text-xs font-semibold text-textSecondary">{items.length} Assets Registered</span>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-3">
              {/* Mobile Card List View (< md) */}
              <div className="block md:hidden space-y-3">
                {items.map((item) => {
                  const isPositive = item.profit_loss >= 0;
                  return (
                    <div key={item.id} className="p-4 rounded-2xl border border-borderColor/70 bg-surface/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-textPrimary text-sm">{item.asset_name}</h5>
                          <div className="text-[11px] text-textMuted font-medium flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-background border border-borderColor text-[10px] text-textSecondary">{item.asset_type}</span>
                            {item.symbol && <span>• {item.symbol}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black font-numeric text-textPrimary">₹{item.current_value.toLocaleString(undefined, {maximumFractionDigits: 1})}</span>
                          <span className={`text-xs font-bold block ${isPositive ? 'text-success' : 'text-danger'}`}>{isPositive ? '+' : ''}{item.profit_loss_percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-borderColor/40 text-xs text-textSecondary font-medium">
                        <span>Holdings: {item.quantity} @ ₹{item.purchase_price.toLocaleString()}</span>
                        <span>CAGR: {item.cagr.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t border-borderColor/30">
                        <button onClick={() => handleOpenEdit(item)} className="px-3 py-1 bg-surface border border-borderColor rounded-xl text-xs font-bold text-primary">Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-danger/10 text-danger rounded-xl text-xs font-bold">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-borderColor text-textSecondary font-bold">
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Holdings</th>
                      <th className="py-2.5 px-3 text-right">Current Value</th>
                      <th className="py-2.5 px-3 text-right">Total Gain/Loss</th>
                      <th className="py-2.5 px-3 text-right">CAGR</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isPositive = item.profit_loss >= 0;
                      return (
                        <tr key={item.id} className="border-b border-borderColor/60 hover:bg-hoverBg/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-textPrimary">{item.asset_name}</div>
                            {item.symbol && (
                              <div className="text-[10px] text-textMuted uppercase flex items-center space-x-1 mt-0.5">
                                <span className="font-bold text-textSecondary">{item.symbol}</span>
                                {item.exchange && (
                                  <>
                                    <span>•</span>
                                    <span>{item.exchange}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-background border border-borderColor text-[10px] text-textSecondary">
                              {item.asset_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-textSecondary">
                            {item.quantity} @ ₹{item.purchase_price.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-textPrimary">
                            ₹{item.current_value.toLocaleString(undefined, {maximumFractionDigits: 1})}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                            {isPositive ? '+' : ''}{item.profit_loss_percentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-textPrimary">
                            {item.cagr.toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex justify-center space-x-1">
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-textSecondary hover:bg-hoverBg rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-textMuted hover:text-danger hover:bg-danger/5 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-2xl bg-background/50">
              <Coins className="w-8 h-8 text-textMuted mb-2" />
              <p className="text-xs font-semibold">No assets found</p>
              <p className="text-[10px] text-textMuted mt-0.5">Click "Add Asset Holding" above to start logging</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Wealth Forecaster & Net Worth Projector ── */}
      <div className="doppel-shell">
        <div className="doppel-core p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <span className="eyebrow-badge mb-1">Simulate & Plan</span>
              <h2 className="text-base font-extrabold text-textPrimary tracking-tight">Compound Interest Wealth Forecaster</h2>
              <p className="text-[11px] text-textMuted font-medium mt-0.5">Project your net worth future growth curve by adjusting return expectations</p>
            </div>
            
            <div className="bg-surface border border-borderColor rounded-2xl p-4 flex items-center justify-between gap-6 self-start lg:self-auto min-w-[240px]">
              <div>
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Projected Portfolio</span>
                <h4 className="text-xl font-extrabold text-primary font-numeric tracking-tight mt-0.5">
                  ₹{(projectionData[projectionData.length - 1]?.balance || 0).toLocaleString()}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Total Contributions</span>
                <p className="text-xs font-bold text-textPrimary font-numeric mt-0.5">
                  +₹{(projectionData[projectionData.length - 1]?.contributions || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Sliders */}
            <div className="lg:col-span-1 space-y-4 bg-background/50 border border-borderColor/60 rounded-2xl p-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-textSecondary">Target CAGR</span>
                  <span className="font-bold text-primary font-numeric">{cagr}%</span>
                </div>
                <input 
                  type="range"
                  min="2"
                  max="30"
                  step="0.5"
                  value={cagr}
                  onChange={(e) => setCagr(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-borderColor rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-textSecondary">Monthly Contribution</span>
                  <span className="font-bold text-primary font-numeric">₹{monthlyContribution.toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="200000"
                  step="5000"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-borderColor rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-textSecondary">Projection Period</span>
                  <span className="font-bold text-primary font-numeric">{projectionYears} Years</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="35"
                  step="1"
                  value={projectionYears}
                  onChange={(e) => setProjectionYears(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-borderColor rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="pt-2 border-t border-borderColor/40 text-[10px] text-textMuted font-medium leading-relaxed">
                *Forecasts are based on monthly compounding interest calculations using your initial holdings balance of 
                <span className="font-bold font-numeric text-textPrimary"> ₹{(currentAssetValue).toLocaleString()}</span> as principal.
              </div>
            </div>

            {/* Projection Area Chart */}
            <div className="lg:col-span-2 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 12, right: 16, left: 16, bottom: 4 }}>
                  <defs>
                    <linearGradient id="glowForecaster" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                    <filter id="cagrGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="var(--primary)" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} opacity={0.6} />
                  <XAxis 
                    dataKey="year" 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    dx={-12}
                    tickFormatter={v => {
                      if (v === 0) return '0';
                      const abs = Math.abs(v);
                      if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(1)}Cr`;
                      if (abs >= 100000) return `₹${(abs / 100000).toFixed(0)}L`;
                      return `₹${(abs / 1000).toFixed(0)}k`;
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Portfolio Value']}
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      fontSize: 12,
                      boxShadow: 'var(--shadow-lg)'
                    }}
                    cursor={{ stroke: 'rgba(99, 102, 241, 0.25)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="var(--primary)" 
                    fill="url(#glowForecaster)" 
                    strokeWidth={3} 
                    filter="url(#cagrGlow)"
                    activeDot={{ r: 7, stroke: 'var(--primary)', strokeWidth: 3, fill: 'var(--card-bg)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-cardBg border border-borderColor rounded-3xl p-4 sm:p-6 shadow-xl relative animate-scale-up">
            <h3 className="text-lg font-bold text-textPrimary mb-4">
              {editingId ? 'Edit Asset Holding' : 'Log New Investment'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Asset Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Reliance, BTC, SGB"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Asset Type</label>
                  <select 
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  >
                    {ASSET_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Symbol</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. AAPL, RELIANCE.NS"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Exchange</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. NASDAQ, NSE, BSE, Crypto"
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Quantity</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Avg Buy Price (₹)</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="1200"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Purchase Date</label>
                  <input 
                    type="date" 
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
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
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* India Post Investment Center Modal */}
      <IndiaPostModal 
        isOpen={showIndiaPostModal} 
        onClose={() => setShowIndiaPostModal(false)}
        onRefreshParent={fetchInvestments}
      />
    </div>
  );
};

// Simple Edit2 icon fallback locally
const Edit2 = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

export default InvestmentsPage;
