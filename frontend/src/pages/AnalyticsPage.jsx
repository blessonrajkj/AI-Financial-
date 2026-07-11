import React, { useState, useEffect } from 'react';
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
  Pie
} from 'recharts';
import { LineChart, Sparkles, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'];

const AnalyticsPage = () => {
  const [trends, setTrends] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      const [trendsRes, forecastRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/trends?t=${Date.now()}`),
        axios.get(`${API_URL}/analytics/forecast?t=${Date.now()}`),
        axios.get(`${API_URL}/analytics/summary?t=${Date.now()}`)
      ]);
      setTrends(trendsRes.data);
      setForecast(forecastRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to fetch analytics data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  const getCategoryData = () => {
    if (!trends || !trends.categories) return [];
    return trends.categories;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Analytics</h1>
          <p className="text-textSecondary mt-1">Deep-dive financial reports, category analysis, and ML forecasts</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary hover:border-primary/30 transition-all shadow-sm flex items-center space-x-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top overview metrics */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Total Cashflow In</p>
                    <h3 className="text-2xl font-black text-success mt-2">₹{summary.total_income?.toLocaleString() || 0}</h3>
                  </div>
                  <span className="p-2.5 bg-success/10 text-success rounded-xl"><TrendingUp className="w-5 h-5" /></span>
                </div>
              </div>

              <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Total Cashflow Out</p>
                    <h3 className="text-2xl font-black text-danger mt-2">₹{summary.total_expense?.toLocaleString() || 0}</h3>
                  </div>
                  <span className="p-2.5 bg-danger/10 text-danger rounded-xl"><TrendingDown className="w-5 h-5" /></span>
                </div>
              </div>

              <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wider">Net Savings Rate</p>
                    <h3 className="text-2xl font-black text-primary mt-2">
                      {summary.total_income > 0 
                        ? `${(((summary.total_income - summary.total_expense) / summary.total_income) * 100).toFixed(0)}%`
                        : '0%'
                      }
                    </h3>
                  </div>
                  <span className="p-2.5 bg-primary/10 text-primary rounded-xl"><Sparkles className="w-5 h-5" /></span>
                </div>
              </div>
            </div>
          )}

          {/* Area Chart: Income vs Expense trends */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-textPrimary mb-4">Cashflow Trends</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.daily_spending || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border)', 
                      borderRadius: '16px',
                      color: 'var(--text-primary)'
                    }} 
                  />
                  <Area type="monotone" dataKey="amount" name="Expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-textPrimary mb-4">Category Distributions</h3>
              
              {getCategoryData().length > 0 ? (
                <div className="h-64 flex items-center justify-between">
                  <div className="h-full w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getCategoryData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getCategoryData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2.5 pl-4 max-h-60 overflow-y-auto">
                    {getCategoryData().map((entry, idx) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="font-semibold text-textSecondary">{entry.name}</span>
                        </div>
                        <span className="font-bold text-textPrimary">₹{entry.value?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-textSecondary">
                  <span>No category breakdowns available</span>
                </div>
              )}
            </div>

            {/* AI ML Forecasting */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-primary mb-4">
                  <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                  <h3 className="text-lg font-bold text-textPrimary">AI Spending Forecast (90-day)</h3>
                </div>
                
                {forecast.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="expected_spend" name="Expected Spend" stroke="#7C3AED" fillOpacity={1} fill="url(#colorForecast)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-textSecondary text-xs">
                    <span>Insufficient transaction logs to compile AI forecast</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-textMuted mt-4 bg-hoverBg p-2.5 rounded-xl border border-borderColor/40">
                💡 **AI Insight**: Based on your historical ledger records, spending is expected to stabilize over the next quarter. Ensure your Shopping and Entertainment budgets are kept under ₹8,000 to maximize net savings rates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;