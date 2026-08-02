import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  ScanLine,
  Smartphone,
  Target,
  UploadCloud,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtPct = (n) => `${Math.abs(n || 0).toFixed(1)}%`;

// Custom Glassmorphic Cashflow Tooltip
const CustomCashflowTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const incomeItem  = payload.find(p => p.dataKey === 'income');
  const expenseItem = payload.find(p => p.dataKey === 'expense');
  const savingsItem = payload.find(p => p.dataKey === 'savings');

  const income  = incomeItem  ? incomeItem.value  : 0;
  const expense = expenseItem ? expenseItem.value : 0;
  const savings = savingsItem ? savingsItem.value : (income - expense);

  const formattedDate = label ? new Date(label).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : label;

  return (
    <div className="bg-cardBg/95 backdrop-blur-md border border-borderColor p-3.5 rounded-2xl shadow-2xl space-y-2 min-w-[210px] pointer-events-none">
      <div className="flex items-center justify-between pb-2 border-b border-borderColor/60">
        <span className="text-[11px] font-bold text-textPrimary tracking-tight flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          {formattedDate}
        </span>
        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
          Daily Ledger
        </span>
      </div>
      <div className="space-y-1.5 pt-0.5">
        {incomeItem && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="font-semibold text-textSecondary">Income</span>
            </div>
            <span className="font-numeric font-bold text-emerald-600 dark:text-emerald-400">+₹{income.toLocaleString('en-IN')}</span>
          </div>
        )}
        {expenseItem && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="font-semibold text-textSecondary">Expense</span>
            </div>
            <span className="font-numeric font-bold text-rose-600 dark:text-rose-400">−₹{expense.toLocaleString('en-IN')}</span>
          </div>
        )}
        {savingsItem && (
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-borderColor/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="font-semibold text-textPrimary">Net Savings</span>
            </div>
            <span className={`font-numeric font-bold ${savings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-danger'}`}>
              {savings >= 0 ? '+' : ''}₹{savings.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Priority icon — functional, not decorative
const PriorityIcon = ({ priority }) => {
  switch ((priority || '').toLowerCase()) {
    case 'critical': return <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />;
    case 'high':     return <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />;
    case 'medium':   return <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />;
    default:         return <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />;
  }
};

const priorityStyle = (priority) => {
  switch ((priority || '').toLowerCase()) {
    case 'critical': return 'text-danger bg-danger/8 border-danger/20';
    case 'high':     return 'text-warning bg-warning/8 border-warning/20';
    case 'medium':   return 'text-primary bg-primary/8 border-primary/20';
    default:         return 'text-success bg-success/8 border-success/20';
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const { refreshTrigger } = useThemeAndRefresh();
  const [summary, setSummary]     = useState(null);
  const [trends, setTrends]       = useState([]);
  
  const cashflowStats = useMemo(() => {
    if (!trends || trends.length === 0) return { totalIncome: 0, totalExpense: 0, netSavings: 0, savingsRate: 0, avgDailySpending: 0 };
    let totalIncome = 0;
    let totalExpense = 0;
    trends.forEach(day => {
      totalIncome += (day.income || 0);
      totalExpense += (day.expense || 0);
    });
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const avgDailySpending = totalExpense / Math.max(1, trends.length);
    return { totalIncome, totalExpense, netSavings, savingsRate, avgDailySpending };
  }, [trends]);

  const [chartDays, setChartDays] = useState(30);
  const [showIncome, setShowIncome]   = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showSavings, setShowSavings] = useState(true);
  const [loading, setLoading]     = useState(true);
  const [aiInsights, setAiInsights]   = useState([]);
  const [aiLoading, setAiLoading]     = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, trendsRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/summary?t=${Date.now()}`),
        axios.get(`${API_URL}/analytics/trends?days=${chartDays}&t=${Date.now()}`)
      ]);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data?.daily_spending || []);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await axios.get(`${API_URL}/analytics/dashboard/ai-summary?t=${Date.now()}`);
      setAiInsights(res.data?.insights || []);
    } catch (err) {
      console.error('Failed to fetch AI summary:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAiSummary();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchOnlyTrends = async () => {
      try {
        const res = await axios.get(`${API_URL}/analytics/trends?days=${chartDays}&t=${Date.now()}`);
        setTrends(res.data?.daily_spending || []);
      } catch (err) { console.error(err); }
    };
    fetchOnlyTrends();
  }, [chartDays]);

  const handleInsightAction = (insight, index) => {
    const action = (insight.action || '').toLowerCase();
    if (action.includes('transaction'))                 navigate('/transactions');
    else if (action.includes('budget'))                 navigate('/budgets');
    else if (action.includes('goal') || action.includes('increase')) navigate('/savings');
    else if (action.includes('investment'))             navigate('/investments');
    else if (action.includes('subscription'))           navigate('/subscriptions');
    else setAiInsights(prev => prev.filter((_, i) => i !== index));
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.full_name?.split(' ')[0] || 'there';

  const monthComp   = summary?.monthly_comparison || {};
  const incomeDiff  = monthComp.income_diff_pct  ?? 0;
  const expenseDiff = monthComp.expense_diff_pct ?? 0;
  const budgetUsedPct = Math.min(100,
    ((summary?.monthly_spending ?? 0) / (summary?.total_budget_limit ?? 1)) * 100
  );

  return (
    <div className="space-y-5">

      {/* ── Header card ── */}
      <div className="doppel-shell relative overflow-hidden">
        <div className="glow-orb-primary -top-20 -left-20 w-80 h-80" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)',
          backgroundSize: '16px 16px'
        }} />
        <div className="doppel-core px-6 py-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-textPrimary tracking-tight">
              {getGreeting()}, {userName}
            </h1>
            {summary?.ai_insight && (
              <p className="text-xs text-textMuted mt-1 max-w-xl leading-relaxed">
                {summary.ai_insight.insight_text}
                {' '}
                <span className={`font-bold ${summary.ai_insight.savings_rate_diff >= 0 ? 'text-success' : 'text-danger'}`}>
                  {summary.ai_insight.savings_rate_diff >= 0 ? '↑' : '↓'} {Math.abs(summary.ai_insight.savings_rate_diff || 0).toFixed(1)}% vs last month
                </span>
              </p>
            )}
          </div>

          {/* Quick Actions Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-2 xl:mt-0">
            <button
              onClick={() => navigate('/transactions')}
              className="btn-island group flex-shrink-0"
            >
              <span>Add Tx</span>
              <span className="btn-island-icon">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </button>
            <button
              onClick={() => navigate('/import')}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded-full bg-surface border border-borderColor text-textPrimary hover:bg-hoverBg hover:border-primary/20 transition-all duration-200 shadow-sm flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5 text-textMuted" />
              <span>Import</span>
            </button>
            <button
              onClick={() => navigate('/scanner')}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded-full bg-surface border border-borderColor text-textPrimary hover:bg-hoverBg hover:border-primary/20 transition-all duration-200 shadow-sm flex items-center gap-1.5"
            >
              <ScanLine className="w-3.5 h-3.5 text-textMuted" />
              <span>Scan Receipt</span>
            </button>
            <button
              onClick={() => navigate('/upi-scanner')}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded-full bg-surface border border-borderColor text-textPrimary hover:bg-hoverBg hover:border-primary/20 transition-all duration-200 shadow-sm flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-textMuted" />
              <span>Scan UPI</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-36 rounded-[24px] skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Balance */}
          <div className="doppel-shell">
            <div className="doppel-core p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5">Balance</span>
                <div className="w-8 h-8 rounded-xl bg-hoverBg flex items-center justify-center text-textMuted">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">
                  {fmt(summary?.current_balance)}
                </p>
                <p className="text-[11px] text-success font-semibold mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                  Live account balance
                </p>
              </div>
            </div>
          </div>

          {/* Income */}
          <div className="doppel-shell">
            <div className="doppel-core p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5 !text-success !border-success/20 !bg-success/10">Income</span>
                <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center text-success">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">
                  {fmt(summary?.monthly_income)}
                </p>
                <div className={`flex items-center gap-1 text-[11px] font-bold mt-1 ${incomeDiff >= 0 ? 'text-success' : 'text-danger'}`}>
                  {incomeDiff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {fmtPct(incomeDiff)} vs last month
                </div>
              </div>
            </div>
          </div>

          {/* Spending */}
          <div className="doppel-shell">
            <div className="doppel-core p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5 !text-danger !border-danger/20 !bg-danger/10">Spending</span>
                <div className="w-8 h-8 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">
                  {fmt(summary?.monthly_spending)}
                </p>
                <div className={`flex items-center gap-1 text-[11px] font-bold mt-1 ${expenseDiff <= 0 ? 'text-success' : 'text-danger'}`}>
                  {expenseDiff <= 0 ? <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {fmtPct(expenseDiff)} vs last month
                </div>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="doppel-shell">
            <div className="doppel-core p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5">Budget</span>
                <span className="text-xs font-numeric font-bold text-textPrimary bg-hoverBg px-2 py-0.5 rounded-lg border border-borderColor">
                  {budgetUsedPct.toFixed(0)}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">
                  {fmt(summary?.budget_remaining)}
                </p>
                <div className="mt-2.5 h-2 bg-borderColor/60 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      budgetUsedPct >= 90 ? 'bg-danger shadow-danger-glow' : budgetUsedPct >= 70 ? 'bg-warning' : 'bg-success shadow-success-glow'
                    }`}
                    style={{ width: `${budgetUsedPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-textMuted font-medium mt-1.5">
                  of {fmt(summary?.total_budget_limit)} limit remaining
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Cashflow chart — 2/3 width */}
        <div className="lg:col-span-2 doppel-shell min-h-[460px]">
          <div className="doppel-core p-6 flex flex-col justify-between h-full">
            {/* Header + Time range filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="eyebrow-badge">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Cashflow Dynamic
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-textPrimary tracking-tight">Financial Velocity & Savings Rate</h2>
              </div>
              <div className="flex items-center gap-1 bg-surface border border-borderColor rounded-full p-1 shadow-inner self-start sm:self-auto">
                {[
                  { label: '7D', value: 7 },
                  { label: '30D', value: 30 },
                  { label: '90D', value: 90 },
                  { label: '1Y', value: 365 },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => setChartDays(btn.value)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all duration-200 ${
                      chartDays === btn.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-textMuted hover:text-textPrimary hover:bg-hoverBg'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive series toggle badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap text-xs font-semibold">
              <button
                onClick={() => setShowIncome(!showIncome)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  showIncome
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'bg-hoverBg/50 border-borderColor text-textMuted line-through opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                <span>Income</span>
                <span className="font-numeric font-bold text-[11px]">({fmt(cashflowStats.totalIncome)})</span>
              </button>

              <button
                onClick={() => setShowExpense(!showExpense)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  showExpense
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'bg-hoverBg/50 border-borderColor text-textMuted line-through opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                <span>Expense</span>
                <span className="font-numeric font-bold text-[11px]">({fmt(cashflowStats.totalExpense)})</span>
              </button>

              <button
                onClick={() => setShowSavings(!showSavings)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  showSavings
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'bg-hoverBg/50 border-borderColor text-textMuted line-through opacity-60'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.7)]" />
                <span>Net Savings</span>
                <span className="font-numeric font-bold text-[11px]">({fmt(cashflowStats.netSavings)})</span>
              </button>
            </div>

            {/* Area Chart canvas */}
            <div className="h-[330px] w-full relative">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 20, right: 24, left: 20, bottom: 8 }}>
                    <defs>
                      {/* Gradient fills */}
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="60%" stopColor="#10B981" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                        <stop offset="60%" stopColor="#F43F5E" stopOpacity={0.06} />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="60%" stopColor="#6366F1" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>

                      {/* Line Glow drop-shadow filters */}
                      <filter id="glowIncome" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#10B981" floodOpacity="0.45" />
                      </filter>
                      <filter id="glowExpense" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#F43F5E" floodOpacity="0.4" />
                      </filter>
                      <filter id="glowSavings" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#6366F1" floodOpacity="0.45" />
                      </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} opacity={0.6} />

                    <XAxis
                      dataKey="date"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      tickFormatter={v => v?.slice(5) || v}
                    />

                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      dx={-12}
                      width={68}
                      domain={['dataMin - 1000', 'dataMax + 1000']}
                      tickFormatter={v => {
                        if (v === 0) return '0';
                        const abs = Math.abs(v);
                        const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : `${abs}`;
                        return v > 0 ? `+₹${formatted}` : `−₹${formatted}`;
                      }}
                    />
                    <Tooltip content={<CustomCashflowTooltip />} cursor={{ stroke: 'rgba(99, 102, 241, 0.25)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

                    <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.12)" strokeWidth={1.5} strokeDasharray="3 3" />

                    {showIncome && (
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10B981"
                        fill="url(#gIncome)"
                        strokeWidth={3}
                        filter="url(#glowIncome)"
                        activeDot={{ r: 7, stroke: '#10B981', strokeWidth: 3, fill: 'var(--card-bg)' }}
                      />
                    )}

                    {showExpense && (
                      <Area
                        type="monotone"
                        dataKey="expense"
                        name="Expense"
                        stroke="#F43F5E"
                        fill="url(#gExpense)"
                        strokeWidth={3}
                        filter="url(#glowExpense)"
                        activeDot={{ r: 7, stroke: '#F43F5E', strokeWidth: 3, fill: 'var(--card-bg)' }}
                      />
                    )}

                    {showSavings && (
                      <Area
                        type="monotone"
                        dataKey="savings"
                        name="Savings"
                        stroke="#6366F1"
                        fill="url(#gSavings)"
                        strokeWidth={3}
                        filter="url(#glowSavings)"
                        activeDot={{ r: 7, stroke: '#6366F1', strokeWidth: 3, fill: 'var(--card-bg)' }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-textMuted font-medium">No cashflow data recorded for this period</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent transactions — 1/3 width */}
        <div className="doppel-shell h-[420px] w-full">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="eyebrow-badge mb-1">Ledger</span>
                <h2 className="text-base font-extrabold text-textPrimary tracking-tight">Recent Activity</h2>
              </div>
              <Link
                to="/transactions"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 bg-hoverBg px-2.5 py-1 rounded-full border border-primary/20"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {summary?.recent_transactions?.length > 0 ? (
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                {summary.recent_transactions.map(t => {
                  const isIncome = t.type?.toLowerCase() === 'income';
                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate('/transactions')}
                      className="flex items-center justify-between py-2.5 px-3 border border-borderColor/40 bg-surface/50 cursor-pointer hover:bg-hoverBg hover:border-borderColor rounded-xl transition-all group"
                    >
                      <div className="overflow-hidden flex-1 mr-3">
                        <p className="text-xs font-bold text-textPrimary truncate group-hover:text-primary transition-colors">
                          {t.merchant || t.category || 'Transaction'}
                        </p>
                        <p className="text-[10px] text-textMuted font-medium mt-0.5">
                          {t.date} · {t.category}
                        </p>
                      </div>
                      <span className={`text-xs font-bold font-numeric flex-shrink-0 ${isIncome ? 'text-success' : 'text-danger'}`}>
                        {isIncome ? '+' : '−'}{fmt(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-textMuted font-medium text-center">No recent activity logged</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Advisor ── */}
      <div className="doppel-shell overflow-hidden">
        <div className="doppel-core p-6">
          <div className="flex items-center justify-between pb-4 border-b border-borderColor mb-5">
            <div>
              <span className="eyebrow-badge mb-1">AI Copilot</span>
              <h2 className="text-base font-extrabold text-textPrimary tracking-tight">Autonomous Financial Insights</h2>
              <p className="text-xs text-textMuted mt-0.5 font-medium">Real-time algorithmic analysis tailored to your cashflow pattern</p>
            </div>
            {!aiLoading && aiInsights.length > 0 && (
              <Link
                to="/ai-insights"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 bg-hoverBg px-3 py-1.5 rounded-full border border-primary/20"
              >
                Full Analysis <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div>
            {aiLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl skeleton" />
                ))}
              </div>
            ) : aiInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {aiInsights.slice(0, 6).map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-4 bg-surface border border-borderColor rounded-2xl hover:border-borderStrong hover:shadow-sm transition-all"
                  >
                    <div className="mt-0.5 p-1.5 rounded-xl bg-hoverBg border border-borderColor">
                      <PriorityIcon priority={insight.priority} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-textPrimary truncate">
                          {insight.title}
                        </span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${priorityStyle(insight.priority)}`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-xs text-textSecondary leading-relaxed line-clamp-2">
                        {insight.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleInsightAction(insight, idx)}
                    className="flex-shrink-0 mt-0.5 text-primary hover:text-primaryHover transition-colors"
                    title={insight.action}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-textPrimary">No insights yet</p>
              <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                Add transactions, set budgets, or link investments — the advisor will surface recommendations automatically.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => navigate('/transactions')}
                  className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primaryHover transition-colors"
                >
                  Add Transaction
                </button>
                <button
                  onClick={() => navigate('/budgets')}
                  className="px-3.5 py-2 bg-background border border-borderColor text-xs font-semibold text-textPrimary rounded-lg hover:bg-hoverBg transition-colors"
                >
                  Set Budget
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ── Quick Actions strip ── */}
      <div className="bg-cardBg border border-borderColor rounded-2xl p-5">
        <h2 className="text-sm font-bold text-textPrimary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: 'Add Transaction', icon: Plus,        path: '/transactions', accent: 'primary' },
            { label: 'Import',          icon: UploadCloud, path: '/import',        accent: 'primary' },
            { label: 'Scan Receipt',    icon: ScanLine,    path: '/scanner',       accent: 'primary' },
            { label: 'UPI Scan',        icon: Smartphone,  path: '/upi-scanner',   accent: 'primary' },
            { label: 'Investments',     icon: TrendingUp,  path: '/investments',   accent: 'primary' },
            { label: 'Savings Goal',    icon: Target,      path: '/savings',       accent: 'primary' },
            { label: 'Set Budget',      icon: Wallet,      path: '/budgets',       accent: 'primary' },
          ].map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-3.5 bg-background border border-borderColor hover:border-primary/40 hover:bg-hoverBg rounded-xl text-textSecondary hover:text-primary transition-all group"
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;