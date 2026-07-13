import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Zap,
  ShieldCheck,
  Bell,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const PRIORITY_CONFIG = {
  Critical: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/20',
    badgeBg: 'bg-red-500/10 text-red-500 border-red-500/20',
    order: 0
  },
  High: {
    icon: Zap,
    iconColor: 'text-danger',
    bgColor: 'bg-danger/5',
    borderColor: 'border-danger/20',
    badgeBg: 'bg-danger/10 text-danger border-danger/20',
    order: 1
  },
  Medium: {
    icon: Info,
    iconColor: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/20',
    badgeBg: 'bg-warning/10 text-warning border-warning/20',
    order: 2
  },
  Low: {
    icon: CheckCircle,
    iconColor: 'text-success',
    bgColor: 'bg-success/5',
    borderColor: 'border-success/20',
    badgeBg: 'bg-success/10 text-success border-success/20',
    order: 3
  }
};

const CATEGORY_ICONS = {
  Income: TrendingUp,
  Savings: Target,
  Budget: Bell,
  Goals: Target,
  Investment: TrendingUp,
  Subscriptions: Bell,
  'Upcoming Payments': Bell,
  Expense: AlertTriangle,
  'Fraud Detection': ShieldCheck
};

const AIInsightsPage = () => {
  const navigate = useNavigate();
  const { refreshTrigger } = useThemeAndRefresh();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPriority, setFilterPriority] = useState('All');
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/dashboard/ai-summary?t=${Date.now()}`);
      setInsights(res.data?.insights || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshing(true);
    setDismissedIds(new Set());
    fetchInsights();
  };

  const handleAction = (insight) => {
    const action = (insight.action || '').toLowerCase();
    if (action.includes('transaction') || action.includes('view')) {
      navigate('/transactions');
    } else if (action.includes('budget') || action.includes('create')) {
      navigate('/budgets');
    } else if (action.includes('goal') || action.includes('increase')) {
      navigate('/savings');
    } else if (action.includes('investment') || action.includes('open invest')) {
      navigate('/investments');
    } else if (action.includes('subscription') || action.includes('renew')) {
      navigate('/subscriptions');
    } else if (action.includes('ignore') || action.includes('done') || action.includes('mark')) {
      setDismissedIds(prev => new Set([...prev, insight.title + insight.description]));
    }
  };

  // Filter out dismissed insights
  const activeInsights = insights.filter(i => !dismissedIds.has(i.title + i.description));

  // Filter by priority
  const filteredInsights = filterPriority === 'All'
    ? activeInsights
    : activeInsights.filter(i => i.priority === filterPriority);

  // Sort by priority order
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const aOrder = PRIORITY_CONFIG[a.priority]?.order ?? 99;
    const bOrder = PRIORITY_CONFIG[b.priority]?.order ?? 99;
    return aOrder - bOrder;
  });

  // Count by priority
  const counts = insights.reduce((acc, i) => {
    acc[i.priority] = (acc[i.priority] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">AI Insights</h1>
          </div>
          <p className="text-textSecondary mt-1">
            Dynamically generated financial intelligence based on your actual ledger records
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-textMuted mt-0.5">
              Last analyzed: {lastUpdated.toLocaleTimeString('en-IN')}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2.5 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary hover:border-primary/30 transition-all shadow-sm text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Re-Analyze</span>
        </button>
      </div>

      {/* Priority Summary Cards */}
      {!loading && insights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Critical', 'High', 'Medium', 'Low'].map(priority => {
            const config = PRIORITY_CONFIG[priority];
            const Icon = config.icon;
            const count = counts[priority] || 0;
            return (
              <button
                key={priority}
                onClick={() => setFilterPriority(filterPriority === priority ? 'All' : priority)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  filterPriority === priority
                    ? `${config.bgColor} ${config.borderColor} shadow-md`
                    : 'bg-cardBg border-borderColor hover:border-borderColor/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}`}>
                    {count}
                  </span>
                </div>
                <p className="text-sm font-black text-textPrimary">{priority}</p>
                <p className="text-[10px] text-textMuted mt-0.5">
                  {count === 1 ? '1 insight' : `${count} insights`}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter pill */}
      {filterPriority !== 'All' && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-textSecondary">Filtering by:</span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer ${PRIORITY_CONFIG[filterPriority]?.badgeBg || ''}`}
            onClick={() => setFilterPriority('All')}
          >
            {filterPriority} ✕
          </span>
        </div>
      )}

      {/* Insights Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-cardBg border border-borderColor rounded-2xl p-5 animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-hoverBg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-hoverBg rounded w-1/3" />
                  <div className="h-3 bg-hoverBg rounded w-3/4" />
                  <div className="h-3 bg-hoverBg rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedInsights.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-3xl bg-cardBg space-y-2">
          <Sparkles className="w-10 h-10 text-textMuted" />
          <p className="text-sm font-semibold">
            {insights.length === 0
              ? 'No insights generated yet'
              : `No ${filterPriority.toLowerCase()} priority insights`}
          </p>
          <p className="text-xs text-textMuted text-center max-w-xs">
            {insights.length === 0
              ? 'Add at least a few transactions, budgets, or investments for the AI to analyze your financial patterns.'
              : 'Try switching to a different priority filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedInsights.map((insight, idx) => {
            const config = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.Low;
            const Icon = config.icon;
            const CatIcon = CATEGORY_ICONS[insight.category] || Info;

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-5 transition-all animate-fade-in ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgColor} border ${config.borderColor}`}>
                      <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h4 className="text-sm font-black text-textPrimary">{insight.title}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}`}>
                          {insight.priority}
                        </span>
                        {insight.category && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-background border border-borderColor text-textMuted">
                            {insight.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-textSecondary leading-relaxed">{insight.description}</p>

                      {insight.confidence && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-[9px] text-textMuted font-bold">Confidence:</span>
                          <div className="flex-1 max-w-[80px] h-1 bg-borderColor/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${config.iconColor.replace('text-', 'bg-')}`}
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-textSecondary">{insight.confidence}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  {insight.action && insight.action !== 'Ignore' && (
                    <button
                      onClick={() => handleAction(insight)}
                      className={`ml-4 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border ${config.badgeBg} hover:opacity-80`}
                    >
                      <span>{insight.action}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {insight.action === 'Ignore' && (
                    <button
                      onClick={() => handleAction(insight)}
                      className="ml-4 px-3 py-2 rounded-xl text-xs font-bold text-textMuted hover:bg-hoverBg border border-borderColor transition-all flex-shrink-0"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {!loading && insights.length > 0 && (
        <div className="p-4 bg-background/50 border border-borderColor/50 rounded-2xl text-[10px] text-textMuted leading-relaxed">
          <strong className="text-textSecondary">About AI Insights:</strong> All insights are automatically generated from your actual transaction, budget, investment, and savings goal records in the database. No hardcoded or simulated data is used. Insights refresh automatically when you add, edit, or delete financial records.
        </div>
      )}
    </div>
  );
};

export default AIInsightsPage;
