import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { cachedGet } from '../services/apiCache';
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
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const fmt = (n) => {
  const val = Number(n) || 0;
  return `${val < 0 ? '−' : ''}₹${Math.abs(val).toLocaleString('en-IN')}`;
};
const fmtPct = (n) => `${Math.abs(n || 0).toFixed(1)}%`;

// Custom Fintech Cashflow Tooltip
const CustomCashflowTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const incomeItem  = payload.find(p => p.dataKey === 'income');
  const expenseItem = payload.find(p => p.dataKey === 'expense');
  const savingsItem = payload.find(p => p.dataKey === 'savings');

  const income  = incomeItem  ? incomeItem.value  : 0;
  const expense = expenseItem ? expenseItem.value : 0;
  const savings = savingsItem ? savingsItem.value : (income - expense);

  const formattedDate = label
    ? new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : label;

  return (
    <div className="bg-cardBg border border-borderColor p-3.5 rounded-xl shadow-lg space-y-2.5 min-w-[200px] pointer-events-none">
      <div className="flex items-center justify-between pb-1.5 border-b border-borderColor/60">
        <span className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          {formattedDate}
        </span>
      </div>
      <div className="space-y-1.5">
        {incomeItem && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span className="text-textSecondary font-medium">Income</span>
            </div>
            <span className="font-numeric font-bold text-emerald-600 dark:text-emerald-400">
              ₹{income.toLocaleString('en-IN')}
            </span>
          </div>
        )}
        {expenseItem && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              <span className="text-textSecondary font-medium">Expense</span>
            </div>
            <span className="font-numeric font-bold text-rose-600 dark:text-rose-400">
              ₹{expense.toLocaleString('en-IN')}
            </span>
          </div>
        )}
        {savingsItem && (
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-borderColor/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
              <span className="text-textPrimary font-semibold">Net Savings</span>
            </div>
            <span className={`font-numeric font-bold ${savings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-danger'}`}>
              {savings < 0 ? '−' : ''}₹{Math.abs(savings).toLocaleString('en-IN')}
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
  const { refreshTrigger, privacyMode, togglePrivacyMode } = useThemeAndRefresh();
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

  const trendsWithSavings = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    return trends.map(day => ({
      ...day,
      savings: (day.income || 0) - (day.expense || 0)
    }));
  }, [trends]);

  const [chartDays, setChartDays] = useState(30);

  const formatYAxis = (v) => {
    if (v === 0) return '₹0';
    const abs = Math.abs(v);
    let formatted = '';
    if (abs >= 100000) {
      formatted = `${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`;
    } else if (abs >= 1000) {
      formatted = `${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
    } else {
      formatted = `${abs}`;
    }
    return v < 0 ? `-₹${formatted}` : `₹${formatted}`;
  };

  const formatXAxis = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    if (chartDays === 7) {
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    } else if (chartDays === 30) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } else {
      return d.toLocaleDateString('en-IN', { month: 'short' });
    }
  };
  const [showIncome, setShowIncome]   = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showSavings, setShowSavings] = useState(true);

  // Independent loading & error states per widget (Phase 2 & 4 Optimization)
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError]     = useState(null);

  const [trendsLoading, setTrendsLoading]   = useState(true);
  const [trendsError, setTrendsError]       = useState(null);

  const [aiInsights, setAiInsights]         = useState([]);
  const [aiLoading, setAiLoading]           = useState(true);
  const [aiError, setAiError]               = useState(null);

  const [isSpeaking, setIsSpeaking]         = useState(false);
  const navigate = useNavigate();

  const toggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToSpeak = `${summary?.ai_insight?.insight_text || ''}. Current month savings rate stands at ${summary?.savings_rate || 0}%.`;
      if (!textToSpeak) return;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // 1. Fetch Summary (KPIs, Recent Activity, Monthly comparisons)
  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await cachedGet(`${API_URL}/analytics/summary`);
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary', err);
      setSummaryError(err.response?.data?.detail || 'Unable to connect to financial metrics server');
    } finally {
      setSummaryLoading(false);
    }
  };

  // 2. Fetch Trends (Cash Flow Chart)
  const fetchTrends = async (days = chartDays) => {
    setTrendsLoading(true);
    setTrendsError(null);
    try {
      const data = await cachedGet(`${API_URL}/analytics/trends?days=${days}`);
      setTrends(data?.daily_spending || []);
    } catch (err) {
      console.error('Failed to fetch cashflow trends', err);
      setTrendsError(err.response?.data?.detail || 'Unable to load cash flow trends');
    } finally {
      setTrendsLoading(false);
    }
  };

  // 3. Fetch AI Summary (Copilot Recommendations)
  const fetchAiSummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await cachedGet(`${API_URL}/analytics/dashboard/ai-summary`);
      setAiInsights(data?.insights || []);
    } catch (err) {
      console.error('Failed to fetch AI summary:', err);
      setAiError(err.response?.data?.detail || 'AI insights temporarily unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  // Concurrent widget loading on mount or cache invalidation
  useEffect(() => {
    Promise.allSettled([
      fetchSummary(),
      fetchTrends(chartDays),
      fetchAiSummary()
    ]);
  }, [refreshTrigger]);

  // Handle timeframe change without firing duplicate request on initial mount
  const initialTrendsMount = useRef(true);
  useEffect(() => {
    if (initialTrendsMount.current) {
      initialTrendsMount.current = false;
      return;
    }
    fetchTrends(chartDays);
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
  const budgetUsedPct = (summary?.total_budget_limit > 0)
    ? Math.min(100, ((summary?.monthly_spending ?? 0) / summary.total_budget_limit) * 100)
    : 0;

  return (
    <div className="space-y-5">

      {/* ── Header card ── */}
      <div className="doppel-shell relative overflow-hidden">
        <div className="glow-orb-primary -top-20 -left-20 w-80 h-80 pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)',
          backgroundSize: '16px 16px'
        }} />
        <div className="doppel-core p-6 space-y-4 relative z-10">

          {/* Top Row: Greeting + Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="eyebrow-badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-textPrimary tracking-tight">
                {getGreeting()}, {userName}
              </h1>
            </div>

            {/* Quick Actions Navigation Bar */}
            <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={togglePrivacyMode}
                title={privacyMode ? 'Disable Privacy Shield' : 'Enable Privacy Shield'}
                className={`px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-bold rounded-xl border transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 ${
                  privacyMode
                    ? 'bg-danger/10 border-danger/30 text-danger'
                    : 'bg-surface hover:bg-hoverBg border-borderColor text-textPrimary'
                }`}
              >
                {privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-textMuted" />}
                <span>{privacyMode ? 'Shield' : 'Privacy'}</span>
              </button>

              <button
                onClick={() => navigate('/import')}
                title="Import Financial Data"
                className="px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-bold rounded-xl bg-surface border border-borderColor text-textPrimary hover:bg-hoverBg transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-textMuted" />
                <span>Import</span>
              </button>

              <button
                onClick={() => navigate('/scanner')}
                title="Scan Receipt / Invoice"
                className="px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-bold rounded-xl bg-surface border border-borderColor text-textPrimary hover:bg-hoverBg transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <ScanLine className="w-3.5 h-3.5 text-textMuted" />
                <span>Scan</span>
              </button>

              <button
                onClick={() => navigate('/transactions')}
                className="px-4 py-2 min-h-[40px] sm:min-h-0 text-xs font-extrabold rounded-xl bg-primary hover:bg-primaryHover text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Tx</span>
              </button>
            </div>
          </div>

          {/* AI Insight Banner (Full-Width Clean Row) */}
          {summary?.ai_insight && (
            <div className="pt-3.5 border-t border-borderColor/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2">
                <span className="p-1 rounded-lg bg-primary/10 text-primary mt-0.5 sm:mt-0 flex-shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </span>
                <p className="text-xs text-textSecondary font-medium leading-relaxed">
                  {summary.ai_insight.insight_text}
                  {' '}
                  <span className={`font-bold ml-1 ${summary.ai_insight.savings_rate_diff >= 0 ? 'text-success' : 'text-danger'}`}>
                    {summary.ai_insight.savings_rate_diff >= 0 ? '↑' : '↓'} {Math.abs(summary.ai_insight.savings_rate_diff || 0).toFixed(1)}% vs last month
                  </span>
                </p>
              </div>

              <button
                onClick={toggleSpeak}
                title={isSpeaking ? 'Stop Voice Briefing' : 'Listen to Voice Briefing'}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold flex-shrink-0 self-start sm:self-auto ${
                  isSpeaking 
                    ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                    : 'bg-surface hover:bg-hoverBg border-borderColor text-textSecondary'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 animate-bounce text-primary" />
                    <span>Stop Briefing</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-textMuted" />
                    <span>Voice Briefing</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── KPI row ── */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-36 rounded-[24px] skeleton" />
          ))}
        </div>
      ) : summaryError ? (
        <div className="doppel-shell p-4 border-danger/30 bg-danger/5 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-textPrimary">Unable to load KPI summary</p>
              <p className="text-xs text-textSecondary">{summaryError}</p>
            </div>
          </div>
          <button
            onClick={fetchSummary}
            className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Primary Hero Balance Card */}
          <div className="doppel-shell col-span-2 sm:col-span-2 lg:col-span-1 border-primary/30 shadow-[0_4px_20px_rgba(99,102,241,0.08)]">
            <div className="doppel-core p-4 sm:p-5 flex flex-col justify-between gap-3 bg-gradient-to-br from-primary/10 via-cardBg to-cardBg h-full">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2.5 !py-0.5 !bg-primary/15 !text-primary !border-primary/30 font-bold text-[11px]">
                  Total Balance
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary shadow-sm">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-end justify-between gap-1.5 sm:gap-2 mt-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl xl:text-3xl font-black text-textPrimary font-numeric tracking-tight privacy-mask whitespace-nowrap">
                    {fmt(summary?.current_balance)}
                  </p>
                  <p className="text-[10px] text-success font-bold mt-1 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-ping shrink-0" />
                    <span>Linked accounts active</span>
                  </p>
                </div>
                {trends.length > 0 && (
                  <div className="h-8 sm:h-9 w-12 sm:w-16 xl:w-20 shrink-0 mb-0.5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
                        <Area type="monotone" dataKey="savings" stroke="#6366F1" fill="#6366F1" fillOpacity={0.12} strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Income (Secondary) */}
          <div className="doppel-shell col-span-1">
            <div className="doppel-core p-3.5 sm:p-5 flex flex-col justify-between gap-3 h-full">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5 !text-success !border-success/20 !bg-success/10 font-bold text-[10px]">Income</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-success/10 flex items-center justify-center text-success">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 mt-1">
                <div>
                  <p className="text-lg sm:text-2xl font-extrabold text-textPrimary font-numeric tracking-tight privacy-mask whitespace-nowrap">
                    {fmt(summary?.monthly_income)}
                  </p>
                  <div className={`flex flex-wrap items-center gap-0.5 text-[10px] font-bold mt-0.5 ${incomeDiff >= 0 ? 'text-success' : 'text-danger'}`}>
                    <span className="flex items-center gap-0.5 shrink-0">
                      {incomeDiff >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
                      {fmtPct(incomeDiff)}
                    </span>
                    <span className="text-textMuted font-medium text-[9px] sm:text-[10px]">vs last mo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spending (Secondary) */}
          <div className="doppel-shell col-span-1">
            <div className="doppel-core p-3.5 sm:p-5 flex flex-col justify-between gap-3 h-full">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5 !text-danger !border-danger/20 !bg-danger/10 font-bold text-[10px]">Spending</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 mt-1">
                <div>
                  <p className="text-lg sm:text-2xl font-extrabold text-textPrimary font-numeric tracking-tight privacy-mask whitespace-nowrap">
                    {fmt(summary?.monthly_spending)}
                  </p>
                  <div className={`flex flex-wrap items-center gap-0.5 text-[10px] font-bold mt-0.5 ${expenseDiff <= 0 ? 'text-success' : 'text-danger'}`}>
                    <span className="flex items-center gap-0.5 shrink-0">
                      {expenseDiff <= 0 ? <ArrowDownRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />}
                      {fmtPct(expenseDiff)}
                    </span>
                    <span className="text-textMuted font-medium text-[9px] sm:text-[10px]">vs last mo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget (Secondary) */}
          <div className="doppel-shell col-span-2 sm:col-span-2 lg:col-span-1">
            <div className="doppel-core p-3.5 sm:p-5 flex flex-col justify-between gap-3 h-full">
              <div className="flex items-center justify-between">
                <span className="eyebrow-badge !px-2 !py-0.5 font-bold text-[10px]">Budget</span>
                {summary?.total_budget_limit > 0 ? (
                  <span className="text-[10px] font-numeric font-bold text-textPrimary bg-hoverBg px-2 py-0.5 rounded-lg border border-borderColor privacy-mask">
                    {budgetUsedPct.toFixed(0)}%
                  </span>
                ) : (
                  <button 
                    onClick={() => navigate('/budgets')}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Set Budget
                  </button>
                )}
              </div>
              <div>
                {summary?.total_budget_limit > 0 ? (
                  <>
                    <p className="text-xl sm:text-2xl font-extrabold text-textPrimary font-numeric tracking-tight privacy-mask whitespace-nowrap">
                      {fmt(summary?.budget_remaining)}
                    </p>
                    <div className="mt-1.5 h-1.5 bg-borderColor/60 rounded-full overflow-hidden p-[1px]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          budgetUsedPct >= 90 ? 'bg-danger shadow-danger-glow' : budgetUsedPct >= 70 ? 'bg-warning' : 'bg-success shadow-success-glow'
                        }`}
                        style={{ width: `${budgetUsedPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-textMuted font-medium mt-1">
                      of <span className="privacy-mask">{fmt(summary?.total_budget_limit)}</span> limit remaining
                    </p>
                  </>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-textSecondary">No budget configured</p>
                    <p className="text-[10px] text-textMuted mt-0.5">Define category limits in Budgets tab</p>
                  </div>
                )}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-textMuted block mb-0.5">
                  CASHFLOW DYNAMIC
                </span>
                <h2 className="text-lg font-extrabold text-textPrimary tracking-tight">Cash Flow Overview</h2>
                <p className="text-xs text-textSecondary font-medium mt-0.5">Income, expenses and net savings over time</p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 bg-surface border border-borderColor rounded-xl p-1 shadow-sm self-start sm:self-auto">
                {[
                  { label: '7D', value: 7 },
                  { label: '30D', value: 30 },
                  { label: '90D', value: 90 },
                  { label: '1Y', value: 365 },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => setChartDays(btn.value)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 ${
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

            {/* Metric Summary Row */}
            <div className="flex items-center gap-4 sm:gap-6 py-2 px-3.5 bg-surface/60 border border-borderColor/60 rounded-xl mb-4 flex-wrap">
              <button
                type="button"
                onClick={() => setShowIncome(!showIncome)}
                className={`flex items-center gap-2 text-xs font-medium transition-opacity ${showIncome ? 'opacity-100' : 'opacity-40 line-through'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-textSecondary">Income</span>
                <span className="font-numeric font-extrabold text-textPrimary">
                  ₹{(cashflowStats.totalIncome || 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowExpense(!showExpense)}
                className={`flex items-center gap-2 text-xs font-medium transition-opacity ${showExpense ? 'opacity-100' : 'opacity-40 line-through'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                <span className="text-textSecondary">Expense</span>
                <span className="font-numeric font-extrabold text-textPrimary">
                  ₹{(cashflowStats.totalExpense || 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowSavings(!showSavings)}
                className={`flex items-center gap-2 text-xs font-medium transition-opacity ${showSavings ? 'opacity-100' : 'opacity-40 line-through'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                <span className="text-textSecondary">Net Savings</span>
                <span className={`font-numeric font-extrabold ${cashflowStats.netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-danger'}`}>
                  {cashflowStats.netSavings < 0 ? '−' : ''}₹{Math.abs(cashflowStats.netSavings || 0).toLocaleString('en-IN')}
                </span>
              </button>
            </div>

            {/* Area Chart Canvas */}
            <div className="h-[330px] w-full relative">
              {trendsLoading ? (
                <div className="h-full w-full flex flex-col justify-center space-y-4 p-4">
                  <div className="h-4 w-48 skeleton rounded-lg" />
                  <div className="h-56 w-full skeleton rounded-2xl" />
                </div>
              ) : trendsError ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center shadow-sm">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-textPrimary">Failed to load cash flow trends</h4>
                    <p className="text-xs text-textSecondary mt-0.5">{trendsError}</p>
                  </div>
                  <button
                    onClick={() => fetchTrends(chartDays)}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Cashflow</span>
                  </button>
                </div>
              ) : trendsWithSavings.length > 0 && trendsWithSavings.some(t => (t.income || 0) > 0 || (t.expense || 0) > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsWithSavings} margin={{ top: 16, right: 10, left: -16, bottom: 4 }}>
                    <defs>
                      <linearGradient id="cfIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="cfExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="cfSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.35} />

                    <XAxis
                      dataKey="date"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      tickFormatter={formatXAxis}
                    />

                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={formatYAxis}
                    />

                    <ReferenceLine y={0} stroke="var(--border-color)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />

                    <Tooltip content={<CustomCashflowTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    {showIncome && (
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10b981"
                        fill="url(#cfIncomeGrad)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'var(--card-bg)' }}
                      />
                    )}

                    {showExpense && (
                      <Area
                        type="monotone"
                        dataKey="expense"
                        name="Expense"
                        stroke="#f43f5e"
                        fill="url(#cfExpenseGrad)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, stroke: '#f43f5e', strokeWidth: 2, fill: 'var(--card-bg)' }}
                      />
                    )}

                    {showSavings && (
                      <Area
                        type="monotone"
                        dataKey="savings"
                        name="Net Savings"
                        stroke="#6366f1"
                        fill="url(#cfSavingsGrad)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2, fill: 'var(--card-bg)' }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-textPrimary">No cash flow data for this period</h4>
                    <p className="text-xs text-textSecondary mt-0.5">Add a transaction or import a statement to view cashflow analytics</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => navigate('/transactions')}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Add Transaction
                    </button>
                    <button
                      onClick={() => navigate('/import')}
                      className="px-3.5 py-1.5 bg-surface hover:bg-hoverBg border border-borderColor text-textPrimary text-xs font-bold rounded-xl transition-all"
                    >
                      Import Statement
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent transactions — 1/3 width */}
        <div className="doppel-shell min-h-[380px] lg:min-h-[460px] w-full flex flex-col">
          <div className="doppel-core p-6 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="eyebrow-badge mb-1">Ledger</span>
                <h2 className="text-base font-extrabold text-textPrimary tracking-tight">Recent Activity</h2>
              </div>
              <Link
                to="/transactions"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 bg-hoverBg px-2.5 py-1 rounded-full border border-primary/20 shrink-0"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {summaryLoading ? (
              <div className="space-y-2.5 flex-1 pr-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 rounded-xl skeleton" />
                ))}
              </div>
            ) : summaryError ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-center p-4">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <p className="text-xs text-textSecondary font-medium">Failed to load recent activity</p>
                <button
                  onClick={fetchSummary}
                  className="px-3 py-1 text-xs font-bold bg-hoverBg hover:bg-surface border border-borderColor rounded-lg text-primary flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            ) : summary?.recent_transactions?.length > 0 ? (
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-borderColor mb-5">
            <div>
              <span className="eyebrow-badge mb-1">AI Copilot</span>
              <h2 className="text-base font-extrabold text-textPrimary tracking-tight">Autonomous Financial Insights</h2>
              <p className="text-xs text-textMuted mt-0.5 font-medium">Real-time algorithmic analysis tailored to your cashflow pattern</p>
            </div>
            {!aiLoading && aiInsights.length > 0 && (
              <Link
                to="/ai-insights"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 bg-hoverBg px-3 py-1.5 rounded-full border border-primary/20 self-start sm:self-auto shrink-0"
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
            ) : aiError ? (
              <div className="py-8 text-center space-y-2">
                <AlertTriangle className="w-5 h-5 text-warning mx-auto" />
                <p className="text-xs text-textSecondary font-medium">AI insights temporarily unavailable</p>
                <button
                  onClick={fetchAiSummary}
                  className="px-3 py-1.5 text-xs font-bold bg-hoverBg hover:bg-surface border border-borderColor rounded-lg text-primary inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Insights
                </button>
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
              className="flex flex-col items-center gap-2 p-2.5 sm:p-3.5 bg-background border border-borderColor hover:border-primary/40 hover:bg-hoverBg rounded-xl text-textSecondary hover:text-primary transition-all group"
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10px] font-semibold text-center leading-tight truncate max-w-full px-0.5">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;