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
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtPct = (n) => `${Math.abs(n || 0).toFixed(1)}%`;

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
      <div className="bg-cardBg border border-borderColor rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-textMuted tracking-wide">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-xl font-bold text-textPrimary mt-0.5 tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          {summary?.ai_insight && (
            <p className="text-[11px] text-textMuted mt-1 max-w-lg leading-relaxed">
              {summary.ai_insight.insight_text}
              {' '}
              <span className={`font-semibold ${summary.ai_insight.savings_rate_diff >= 0 ? 'text-success' : 'text-danger'}`}>
                {summary.ai_insight.savings_rate_diff >= 0 ? '↑' : '↓'} {Math.abs(summary.ai_insight.savings_rate_diff || 0).toFixed(1)}% vs last month
              </span>
            </p>
          )}
        </div>

        <button
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primaryHover text-white text-sm font-semibold rounded-xl transition-colors self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* ── KPI row ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Balance */}
          <div className="bg-cardBg border border-borderColor rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textMuted uppercase tracking-wider">Balance</span>
              <Wallet className="w-4 h-4 text-textMuted" />
            </div>
            <div>
              <p className="text-2xl font-bold text-textPrimary font-mono tracking-tight">
                {fmt(summary?.current_balance)}
              </p>
              <p className="text-[11px] text-success font-medium mt-1">Live balance</p>
            </div>
          </div>

          {/* Income */}
          <div className="bg-cardBg border border-borderColor rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textMuted uppercase tracking-wider">Income</span>
              <TrendingUp className="w-4 h-4 text-textMuted" />
            </div>
            <div>
              <p className="text-2xl font-bold text-textPrimary font-mono tracking-tight">
                {fmt(summary?.monthly_income)}
              </p>
              <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${incomeDiff >= 0 ? 'text-success' : 'text-danger'}`}>
                {incomeDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {fmtPct(incomeDiff)} vs last month
              </div>
            </div>
          </div>

          {/* Spending */}
          <div className="bg-cardBg border border-borderColor rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textMuted uppercase tracking-wider">Spending</span>
              <TrendingDown className="w-4 h-4 text-textMuted" />
            </div>
            <div>
              <p className="text-2xl font-bold text-textPrimary font-mono tracking-tight">
                {fmt(summary?.monthly_spending)}
              </p>
              <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${expenseDiff <= 0 ? 'text-success' : 'text-danger'}`}>
                {expenseDiff <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {fmtPct(expenseDiff)} vs last month
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-cardBg border border-borderColor rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-textMuted uppercase tracking-wider">Budget</span>
              <span className="text-[11px] font-mono font-bold text-textMuted">
                {budgetUsedPct.toFixed(0)}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-textPrimary font-mono tracking-tight">
                {fmt(summary?.budget_remaining)}
              </p>
              <div className="mt-2 h-1.5 bg-borderColor rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    budgetUsedPct >= 90 ? 'bg-danger' : budgetUsedPct >= 70 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
              <p className="text-[11px] text-textMuted mt-1">
                of {fmt(summary?.total_budget_limit)} limit
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Cashflow chart — 2/3 width */}
        <div className="lg:col-span-2 bg-cardBg border border-borderColor rounded-2xl p-5 h-[410px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-textPrimary">Cashflow</h2>
              <p className="text-[11px] text-textMuted mt-0.5">Income, expense and net savings</p>
            </div>
            <div className="flex items-center gap-1 bg-background border border-borderColor rounded-lg p-0.5">
              {[
                { label: '7D', value: 7 },
                { label: '30D', value: 30 },
                { label: '90D', value: 90 },
                { label: '1Y', value: 365 },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={() => setChartDays(btn.value)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    chartDays === btn.value
                      ? 'bg-textPrimary text-cardBg'
                      : 'text-textMuted hover:text-textPrimary'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[320px] w-full">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v?.slice(5) || v}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 12,
                      boxShadow: 'var(--shadow-lg)',
                    }}
                    formatter={v => [`₹${(v||0).toLocaleString('en-IN')}`, undefined]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                  />
                  <Area type="monotone" dataKey="income"  name="Income"  stroke="#059669" fill="url(#gIncome)"  strokeWidth={1.75} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#DC2626" fill="url(#gExpense)" strokeWidth={1.75} />
                  <Area type="monotone" dataKey="savings" name="Savings" stroke="#4F46E5" fill="url(#gSavings)" strokeWidth={1.75} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-textMuted">No data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent transactions — 1/3 width */}
        <div className="bg-cardBg border border-borderColor rounded-2xl p-5 flex flex-col h-[410px] w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-textPrimary">Recent</h2>
            <Link
              to="/transactions"
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {summary?.recent_transactions?.length > 0 ? (
            <div className="space-y-1 flex-1 overflow-y-auto pr-1">
              {summary.recent_transactions.map(t => {
                const isIncome = t.type?.toLowerCase() === 'income';
                return (
                  <div
                    key={t.id}
                    onClick={() => navigate('/transactions')}
                    className="flex items-center justify-between py-2.5 px-1 border-b border-borderColor/50 last:border-0 cursor-pointer hover:bg-hoverBg rounded-lg transition-colors group"
                  >
                    <div className="overflow-hidden flex-1 mr-3">
                      <p className="text-xs font-semibold text-textPrimary truncate group-hover:text-primary transition-colors">
                        {t.merchant || t.category || 'Transaction'}
                      </p>
                      <p className="text-[10px] text-textMuted mt-0.5">
                        {t.date} · {t.category}
                      </p>
                    </div>
                    <span className={`text-xs font-bold font-mono tabular-nums flex-shrink-0 ${isIncome ? 'text-success' : 'text-danger'}`}>
                      {isIncome ? '+' : '−'}{fmt(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-textMuted text-center">No recent transactions</p>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Advisor ── */}
      <div className="bg-cardBg border border-borderColor rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-borderColor">
          <div>
            <h2 className="text-sm font-bold text-textPrimary">Financial Advisor</h2>
            <p className="text-[11px] text-textMuted mt-0.5">Insights based on your actual account activity</p>
          </div>
          {!aiLoading && aiInsights.length > 0 && (
            <Link
              to="/ai-insights"
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="p-5">
          {aiLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl skeleton" />
              ))}
            </div>
          ) : aiInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.slice(0, 6).map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 bg-background border border-borderColor rounded-xl hover:border-borderColor/80 transition-colors"
                >
                  <div className="mt-0.5">
                    <PriorityIcon priority={insight.priority} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-textPrimary truncate">
                        {insight.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide flex-shrink-0 ${priorityStyle(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-textSecondary leading-relaxed line-clamp-2">
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