import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Sparkles, 
  Plus, 
  ScanLine, 
  Calendar,
  Eye,
  Smartphone,
  Target,
  UploadCloud,
  ArrowRight,
  Zap,
  Info,
  CheckCircle,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const Dashboard = () => {
  const { user } = useAuth();
  const { refreshTrigger, invalidateCache } = useThemeAndRefresh();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [loading, setLoading] = useState(true);
  
  // AI Insights State
  const [aiInsights, setAiInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [typingText, setTypingText] = useState('Initializing WealthPilot advisor...');
  
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
      console.error("Failed to fetch dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async () => {
    setAiLoading(true);
    setTypingText('Scanning accounts & ledger categories...');
    try {
      // Small simulated delay for typing effect experience
      await new Promise(resolve => setTimeout(resolve, 800));
      setTypingText('Formulating priority advisor checks...');
      
      const res = await axios.get(`${API_URL}/analytics/dashboard/ai-summary?t=${Date.now()}`);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setAiInsights(res.data?.insights || []);
    } catch (err) {
      console.error("Failed to fetch AI summary:", err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAiSummary();
  }, [refreshTrigger]);

  useEffect(() => {
    // Re-fetch trends only if days filter updates
    const fetchOnlyTrends = async () => {
      try {
        const trendsRes = await axios.get(`${API_URL}/analytics/trends?days=${chartDays}&t=${Date.now()}`);
        setTrends(trendsRes.data?.daily_spending || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOnlyTrends();
  }, [chartDays]);

  // Handle Insight Action Click
  const handleActionClick = (insight, index) => {
    const action = insight.action.toLowerCase();
    
    if (action.includes('transaction')) {
      navigate('/transactions');
    } else if (action.includes('budget')) {
      navigate('/budgets');
    } else if (action.includes('goal') || action.includes('increase')) {
      navigate('/savings');
    } else if (action.includes('investment')) {
      navigate('/investments');
    } else if (action.includes('subscription') || action.includes('renew')) {
      navigate('/subscriptions');
    } else if (action.includes('done') || action.includes('ignore')) {
      // Locally dismiss insight with state filter
      setAiInsights(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.full_name ? user.full_name.split(' ')[0] : 'Blesson';

  // Priority Badge colors
  const getPriorityBadgeClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-danger/15 text-danger border-danger/25';
      case 'high':
        return 'bg-warning/15 text-warning border-warning/25';
      case 'medium':
        return 'bg-primary/15 text-primary border-primary/25';
      default:
        return 'bg-success/15 text-success border-success/25';
    }
  };

  // Average confidence calculator
  const averageConfidence = aiInsights.length > 0 
    ? Math.round(aiInsights.reduce((sum, item) => sum + item.confidence, 0) / aiInsights.length) 
    : 95;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Grid */}
      <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all">
        <div>
          <span className="inline-flex items-center space-x-1.5 text-[10px] uppercase tracking-wider font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            <Zap className="w-3.5 h-3.5" />
            <span>WealthPilot AI Engine Active</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary mt-3">
            {getGreeting()}, {userName}
          </h1>
          
          {summary?.ai_insight && (
            <div className="flex items-center space-x-2.5 mt-2.5 bg-hoverBg/50 border border-borderColor/60 rounded-xl p-3 max-w-xl">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs">
                <span className="text-textSecondary">{summary.ai_insight.insight_text}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                  summary.ai_insight.savings_rate_diff >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                }`}>
                  {summary.ai_insight.savings_rate_diff >= 0 ? '▲ Improved' : '▼ Decreased'}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3 text-textSecondary bg-background border border-borderColor p-3 rounded-2xl md:self-start">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-xs font-bold">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ================================================== */}
      {/* ✨ AI FINANCIAL SUMMARY CARD CENTERPIECE (Task 1-7) */}
      {/* ================================================== */}
      <div className="relative bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border border-borderColor/80 rounded-[24px] p-6 shadow-md transition-all duration-300 backdrop-blur-md overflow-hidden group">
        
        {/* Glow border element */}
        <div className="absolute inset-0 border border-transparent rounded-[24px] bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Card Header & Subtitle */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-extrabold text-xl shadow-lg shrink-0">
              ✨
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-textPrimary tracking-tight">AI Financial Summary</h2>
                <span className="text-[9px] font-extrabold text-textSecondary uppercase tracking-widest bg-background/60 border border-borderColor/60 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-textSecondary mt-0.5">
                Personalized insights generated from your financial activity
              </p>
              <div className="text-[9px] text-textMuted font-bold mt-2">
                Last Updated: <span className="text-textSecondary">Just now</span>
              </div>
            </div>
          </div>

          {/* AI Score / Confidence Progress Ring (Task 6) */}
          <div className="flex items-center space-x-3 bg-background/50 border border-borderColor/60 px-4 py-2.5 rounded-2xl shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="var(--border)" strokeWidth="3" fill="transparent" />
                <circle cx="20" cy="20" r="16" stroke="url(#aiGlow)" strokeWidth="3" fill="transparent" 
                        strokeDasharray={100} strokeDashoffset={100 - averageConfidence} strokeLinecap="round" />
                <defs>
                  <linearGradient id="aiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-[10px] font-black text-textPrimary">{averageConfidence}%</span>
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-textSecondary uppercase tracking-wider">AI Confidence</p>
              <p className="text-[10px] font-bold text-textPrimary mt-0.5">High Precision</p>
            </div>
          </div>
        </div>

        {/* Insight list / Loader */}
        <div className="mt-6 border-t border-borderColor/60 pt-5 relative">
          {aiLoading ? (
            <div className="flex items-center space-x-3 py-6 text-xs text-textSecondary">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
              <span className="font-bold animate-pulse">{typingText}</span>
            </div>
          ) : aiInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-start p-4 bg-background/40 hover:bg-hoverBg border border-borderColor/60 hover:border-borderColor rounded-2xl transition-all duration-200 shadow-sm"
                >
                  <div className="space-y-1.5 overflow-hidden mr-3">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] font-extrabold text-textSecondary uppercase tracking-wider bg-borderColor px-2 py-0.5 rounded">
                        {insight.category}
                      </span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadgeClass(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-textPrimary leading-relaxed">
                      {insight.title}
                    </p>
                    <p className="text-[11px] text-textSecondary leading-normal">
                      {insight.description}
                    </p>
                  </div>
                  
                  {/* Action Handler (Task 7) */}
                  <button 
                    onClick={() => handleActionClick(insight, idx)}
                    className="shrink-0 flex items-center space-x-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] rounded-xl transition-all"
                  >
                    <span>{insight.action}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State Container (Task 10) */
            <div className="flex flex-col items-center justify-center py-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-borderColor/40 flex items-center justify-center text-textSecondary text-xl">
                📝
              </div>
              <div>
                <h4 className="text-xs font-black text-textPrimary uppercase tracking-wider">Awaiting Ledger History</h4>
                <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">
                  Add more transactions or sync account screenshots to unlock personalized AI financial insights.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                <button 
                  onClick={() => navigate('/transactions?add=true')}
                  className="px-3.5 py-2 bg-primary hover:bg-primaryHover text-white font-bold text-[10px] rounded-xl shadow-sm transition-all"
                >
                  Add Transaction
                </button>
                <button 
                  onClick={() => navigate('/import')}
                  className="px-3.5 py-2 bg-background border border-borderColor hover:border-primary/40 text-textPrimary font-bold text-[10px] rounded-xl transition-all"
                >
                  Import Excel
                </button>
                <button 
                  onClick={() => navigate('/scanner')}
                  className="px-3.5 py-2 bg-background border border-borderColor hover:border-success/40 text-textPrimary font-bold text-[10px] rounded-xl transition-all"
                >
                  Scan Receipt
                </button>
                <button 
                  onClick={() => navigate('/upi-scanner')}
                  className="px-3.5 py-2 bg-background border border-borderColor hover:border-info/40 text-textPrimary font-bold text-[10px] rounded-xl transition-all"
                >
                  UPI Screenshot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Real-time KPI Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total Balance */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Current Balance</span>
                <span className="p-2 bg-primary/10 text-primary rounded-xl"><Wallet className="w-4 h-4" /></span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textPrimary">₹{(summary?.current_balance ?? 0).toLocaleString()}</h3>
                <p className="text-[10px] text-success font-bold mt-1">● Real-time Balance Active</p>
              </div>
            </div>

            {/* Monthly Income Card */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Monthly Income</span>
                <span className="p-2 bg-success/10 text-success rounded-xl"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textPrimary">₹{(summary?.monthly_income ?? 0).toLocaleString()}</h3>
                <p className={`text-[10px] font-bold mt-1 flex items-center space-x-1 ${
                  (summary?.monthly_comparison?.income_diff_pct ?? 0) >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  <span>{(summary?.monthly_comparison?.income_diff_pct ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(summary?.monthly_comparison?.income_diff_pct ?? 0)}% vs last month</span>
                </p>
              </div>
            </div>

            {/* Monthly Spending Card */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Monthly Spending</span>
                <span className="p-2 bg-danger/10 text-danger rounded-xl"><TrendingDown className="w-4 h-4" /></span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-textPrimary">₹{(summary?.monthly_spending ?? 0).toLocaleString()}</h3>
                <p className={`text-[10px] font-bold mt-1 flex items-center space-x-1 ${
                  (summary?.monthly_comparison?.expense_diff_pct ?? 0) <= 0 ? 'text-success' : 'text-danger'
                }`}>
                  <span>{(summary?.monthly_comparison?.expense_diff_pct ?? 0) <= 0 ? '▼' : '▲'} {Math.abs(summary?.monthly_comparison?.expense_diff_pct ?? 0)}% vs last month</span>
                </p>
              </div>
            </div>

            {/* Budget Remaining Card */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between h-44">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-textSecondary uppercase tracking-wider">Budget Remaining</span>
                <span className="p-2 bg-warning/10 text-warning rounded-xl"><Sparkles className="w-4 h-4" /></span>
              </div>
              <div>
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black text-textPrimary">₹{(summary?.budget_remaining ?? 0).toLocaleString()}</h3>
                  <span className="text-[9px] text-textSecondary font-bold mb-1">
                    Limit: ₹{(summary?.total_budget_limit ?? 50000).toLocaleString()}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-borderColor/60 h-2.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-warning h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, ((summary?.monthly_spending ?? 0) / (summary?.total_budget_limit ?? 50000)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions Panel */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-textPrimary uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              
              <button 
                onClick={() => navigate('/transactions?add=true')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <Plus className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">Add Txn</span>
              </button>

              <button 
                onClick={() => navigate('/import')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <UploadCloud className="w-5 h-5 text-secondary group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">Import Excel</span>
              </button>

              <button 
                onClick={() => navigate('/scanner')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <ScanLine className="w-5 h-5 text-success group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">Scan Receipt</span>
              </button>

              <button 
                onClick={() => navigate('/upi-scanner')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <Smartphone className="w-5 h-5 text-info group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">UPI Scan</span>
              </button>

              <button 
                onClick={() => navigate('/investments')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <TrendingUp className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">Add Invest</span>
              </button>

              <button 
                onClick={() => navigate('/savings')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <Target className="w-5 h-5 text-warning group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">Create Goal</span>
              </button>

              <button 
                onClick={() => navigate('/budgets')}
                className="p-4 bg-background border border-borderColor hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-2 text-textSecondary hover:text-primary transition-all group shadow-sm"
              >
                <Wallet className="w-5 h-5 text-danger group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-bold">Set Budget</span>
              </button>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Column (Dynamic Switcher) */}
            <div className="lg:col-span-2 bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-extrabold text-textPrimary uppercase tracking-wider">Cashflow Metrics</h3>
                
                {/* Chart timeline controls */}
                <div className="flex space-x-1.5 bg-background border border-borderColor p-1 rounded-xl">
                  {[
                    { label: '7D', value: 7 },
                    { label: '30D', value: 30 },
                    { label: '90D', value: 90 },
                    { label: '1Y', value: 365 }
                  ].map((btn) => (
                    <button 
                      key={btn.label}
                      onClick={() => setChartDays(btn.value)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                        chartDays === btn.value ? 'bg-primary text-white' : 'text-textSecondary hover:bg-hoverBg'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64 w-full">
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                      <Area type="monotone" dataKey="savings" name="Savings" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-textSecondary text-xs">
                    <span>No cashflow timeseries details loaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live activity feed */}
            <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-textPrimary uppercase tracking-wider mb-4">Recent Activity</h3>
                
                {summary?.recent_transactions && summary.recent_transactions.length > 0 ? (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {summary.recent_transactions.map((t) => {
                      const isIncome = t.type.toLowerCase() === 'income';
                      return (
                        <div 
                          key={t.id} 
                          onClick={() => navigate('/transactions')}
                          className="flex justify-between items-center text-xs p-2.5 bg-background/40 hover:bg-hoverBg border border-borderColor/40 hover:border-borderColor rounded-xl transition-all cursor-pointer"
                        >
                          <div className="overflow-hidden flex-1 mr-2">
                            <p className="font-bold text-textPrimary truncate">{t.merchant || 'Unknown'}</p>
                            <div className="flex items-center space-x-1.5 mt-0.5 text-[9px] text-textSecondary">
                              <span>{t.date}</span>
                              <span>•</span>
                              <span className="px-1 py-0.2 bg-borderColor rounded text-[8px]">{t.category}</span>
                              <span>•</span>
                              <span>{t.payment_method}</span>
                            </div>
                          </div>
                          <span className={`font-extrabold shrink-0 ${isIncome ? 'text-success' : 'text-danger'}`}>
                            {isIncome ? '+' : '-'} ₹{t.amount.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-textSecondary text-xs">
                    <span>No recent activity logged</span>
                  </div>
                )}
              </div>

              <Link 
                to="/transactions" 
                className="w-full text-center py-2.5 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold text-xs rounded-xl border border-borderColor transition-colors mt-4 block"
              >
                View Full Ledger
              </Link>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;