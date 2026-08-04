import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Store,
  Calendar,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'];

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

const AnalyticsPage = () => {
  const { refreshTrigger } = useThemeAndRefresh();
  const [trends, setTrends] = useState({ categories: [], daily_spending: [] });
  const [forecast, setForecast] = useState({ forecast_points: [], metrics: {}, status: 'insufficient_data' });
  const [summary, setSummary] = useState(null);
  const [topMerchants, setTopMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const [trendsRes, forecastRes, summaryRes, merchantsRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/trends?days=${days}&t=${Date.now()}`),
        axios.get(`${API_URL}/analytics/forecast?t=${Date.now()}`),
        axios.get(`${API_URL}/analytics/summary?t=${Date.now()}`),
        axios.get(`${API_URL}/analytics/top-merchants?limit=8&t=${Date.now()}`).catch(() => ({ data: [] }))
      ]);
      setTrends(trendsRes.data || { categories: [], daily_spending: [] });
      setForecast(forecastRes.data || { forecast_points: [], metrics: {}, status: 'insufficient_data' });
      setSummary(summaryRes.data);
      setTopMerchants(merchantsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, refreshTrigger]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  const categoryData = trends?.categories || [];
  const dailyData = trends?.daily_spending || [];

  const savingsOffset = React.useMemo(() => {
    if (!dailyData || dailyData.length === 0) return 0.5;
    const savingsValues = dailyData.map(day => day.savings ?? 0);
    const max = Math.max(...savingsValues, 1);
    const min = Math.min(...savingsValues, -1);
    if (max === min) return 0.5;
    return max / (max - min);
  }, [dailyData]);
  const forecastPoints = forecast?.forecast_points || [];
  const metrics = forecast?.metrics || {};

  // Month comparison data
  const monthComp = summary?.monthly_comparison || {};

  // Forecast chart data — limit to 30 days for clarity
  const forecastChart = forecastPoints.slice(0, 30).map(p => ({
    date: p.date?.slice(5), // MM-DD
    predicted: p.predicted,
    lower: p.lower,
    upper: p.upper,
    expected_spend: p.predicted // for backward compat
  }));

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
                Intelligence Hub
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-textPrimary">Financial Analytics</h1>
            <p className="text-xs text-textMuted mt-1 font-medium">Deep-dive category allocation, spending velocity, merchant heatmaps, and ML forecasts</p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <div className="flex items-center bg-surface border border-borderColor rounded-full p-1 shadow-inner">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${days === d ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-textPrimary'}`}
                >
                  {d}D
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-surface hover:bg-hoverBg border border-borderColor text-textSecondary hover:text-textPrimary text-xs font-bold rounded-full transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* KPI Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Total Income</p>
                    <h3 className="text-2xl font-black text-success mt-2">{fmt(summary.monthly_income)}</h3>
                    <p className={`text-[10px] font-bold mt-1.5 flex items-center space-x-1 ${(monthComp.income_diff_pct ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(monthComp.income_diff_pct ?? 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{Math.abs(monthComp.income_diff_pct ?? 0)}% vs last month</span>
                    </p>
                  </div>
                  <span className="p-2.5 bg-success/10 text-success rounded-xl"><TrendingUp className="w-5 h-5" /></span>
                </div>
              </div>

              <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Total Expense</p>
                    <h3 className="text-2xl font-black text-danger mt-2">{fmt(summary.monthly_spending)}</h3>
                    <p className={`text-[10px] font-bold mt-1.5 flex items-center space-x-1 ${(monthComp.expense_diff_pct ?? 0) <= 0 ? 'text-success' : 'text-danger'}`}>
                      {(monthComp.expense_diff_pct ?? 0) <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      <span>{Math.abs(monthComp.expense_diff_pct ?? 0)}% vs last month</span>
                    </p>
                  </div>
                  <span className="p-2.5 bg-danger/10 text-danger rounded-xl"><TrendingDown className="w-5 h-5" /></span>
                </div>
              </div>

              <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Net Savings Rate</p>
                    <h3 className="text-2xl font-black text-primary mt-2">
                      {summary.monthly_income > 0
                        ? fmtPct(((summary.monthly_income - summary.monthly_spending) / summary.monthly_income) * 100)
                        : '0%'}
                    </h3>
                    <p className="text-[10px] text-textMuted mt-1.5">
                      Net: {fmt((summary.monthly_income || 0) - (summary.monthly_spending || 0))}
                    </p>
                  </div>
                  <span className="p-2.5 bg-primary/10 text-primary rounded-xl"><Sparkles className="w-5 h-5" /></span>
                </div>
              </div>
            </div>
          )}

          {/* Cashflow Trends — 3-series Area Chart */}
          <div className="doppel-shell">
            <div className="doppel-core p-6">
              <span className="eyebrow-badge mb-1">Trends</span>
              <h3 className="text-lg font-bold text-textPrimary tracking-tight">Cashflow Trends</h3>
              <p className="text-xs text-textMuted mb-4 font-medium">Income, Expense, and Net Savings — last {days} days</p>
              <div className="h-72 w-full">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData} margin={{ top: 16, right: 16, left: 16, bottom: 4 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset={`${savingsOffset * 100}%`} stopColor="#10B981" stopOpacity={0.05} />
                          <stop offset={`${savingsOffset * 100}%`} stopColor="#F43F5E" stopOpacity={0.05} />
                          <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.3} />
                        </linearGradient>

                        <filter id="glowInc" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10B981" floodOpacity="0.4" />
                        </filter>
                        <filter id="glowExp" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#F43F5E" floodOpacity="0.35" />
                        </filter>
                        <filter id="glowSav" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10B981" floodOpacity="0.3" />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} opacity={0.7} />
                      <XAxis
                        dataKey="date"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                        tickFormatter={(v) => v?.slice(5) || v}
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
                        tickFormatter={(v) => {
                          if (v === 0) return '0';
                          const abs = Math.abs(v);
                          const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : `${abs}`;
                          return v > 0 ? `+₹${formatted}` : `−₹${formatted}`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          fontSize: 12,
                          boxShadow: 'var(--shadow-lg)',
                        }}
                        cursor={{ stroke: 'rgba(99, 102, 241, 0.25)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        formatter={(v) => [`₹${(v || 0).toLocaleString('en-IN')}`, undefined]}
                      />
                      <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.12)" strokeWidth={1.5} strokeDasharray="3 3" />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingBottom: 8 }} />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" fill="url(#colorIncome)" strokeWidth={2.5} filter="url(#glowInc)" activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 3, fill: 'var(--card-bg)' }} />
                      <Area type="monotone" dataKey="expense" name="Expense" stroke="#F43F5E" fill="url(#colorExpense)" strokeWidth={2.5} filter="url(#glowExp)" activeDot={{ r: 6, stroke: '#F43F5E', strokeWidth: 3, fill: 'var(--card-bg)' }} />
                      <Area type="monotone" dataKey="savings" name="Net Savings" stroke="url(#colorSavings)" fill="url(#colorSavings)" strokeWidth={2.5} filter="url(#glowSav)" activeDot={{ r: 6, stroke: '#6366F1', strokeWidth: 3, fill: 'var(--card-bg)' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-textSecondary text-xs">
                    <span>No cashflow data for the selected period</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Pie + Top Merchants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution Pie */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-textPrimary mb-4">Category Distribution</h3>
              {categoryData.length > 0 ? (
                <div className="flex items-center justify-between h-64">
                  <div className="h-full w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`₹${v?.toLocaleString()}`, undefined]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 pl-4 max-h-60 overflow-y-auto">
                    {categoryData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold text-textSecondary truncate max-w-[100px]">{entry.name}</span>
                        </div>
                        <span className="font-bold text-textPrimary">{fmt(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-textSecondary text-xs">
                  <span>No category data for the selected period</span>
                </div>
              )}
            </div>

            {/* Top Merchants */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-textPrimary">Top Merchants</h3>
              </div>
              {topMerchants.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {topMerchants.map((m, idx) => {
                    const maxVal = topMerchants[0]?.total_spent || 1;
                    const barPct = ((m.total_spent || 0) / maxVal) * 100;
                    return (
                      <div key={m.merchant_name || idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-lg bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-textPrimary truncate max-w-[150px]">{m.merchant_name || 'Unknown'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-textPrimary">{fmt(m.total_spent)}</span>
                            <span className="text-textMuted ml-1">({m.tx_count} txns)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-borderColor/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-textSecondary text-xs space-y-1">
                  <Store className="w-8 h-8 text-textMuted" />
                  <span>No merchant data available</span>
                  <span className="text-textMuted">Add transactions with merchant names to see top merchants</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Spending Forecast */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <h3 className="text-lg font-bold text-textPrimary">AI Spending Forecast (90-day)</h3>
            </div>
            <p className="text-xs text-textSecondary mb-4">
              {forecast.status === 'success'
                ? 'Linear regression model trained on your real transaction history'
                : 'Log at least 10 expense transactions to enable AI forecasting'
              }
            </p>

            {/* Forecast Metrics Cards */}
            {forecast.status === 'success' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                {[
                  { label: 'Tomorrow', val: metrics.tomorrow, icon: Calendar },
                  { label: 'Next Week', val: metrics.next_week, icon: Calendar },
                  { label: 'Next Month', val: metrics.next_month, icon: Target },
                  { label: 'Next Quarter', val: metrics.next_quarter, icon: Target },
                  { label: 'Expected Savings', val: metrics.expected_savings, icon: Wallet, color: 'text-success' },
                  { label: 'Recommended Budget', val: metrics.recommended_budget, icon: TrendingDown, color: 'text-warning' },
                ].map(({ label, val, icon: Icon, color }) => (
                  <div key={label} className="bg-background border border-borderColor rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-textMuted uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-sm font-black ${color || 'text-textPrimary'}`}>{fmt(val)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Forecast Chart */}
            <div className="h-52 w-full">
              {forecastChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', borderRadius: '12px' }}
                      formatter={(v) => [`₹${(v || 0).toLocaleString()}`, undefined]}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted Spend"
                      stroke="#7C3AED"
                      fillOpacity={1}
                      fill="url(#colorForecast)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-textSecondary text-xs">
                  <span>Insufficient transaction history for AI forecast (need 10+ expense transactions)</span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;