import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, TrendingUp, Target, PieChart, BarChart3, ShieldCheck } from 'lucide-react';
import PariViewLogo from '../components/common/PariViewLogo';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Incorrect email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-textPrimary overflow-x-hidden selection:bg-primary selection:text-white">

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. LEFT BRAND PANEL (Desktop 45-48% width, hidden on mobile/tablet) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] bg-[#0B0F19] text-white p-10 xl:p-16 flex-col justify-between relative overflow-hidden select-none min-h-screen border-r border-slate-800/60">
        
        {/* Subtle grid background pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px'
          }}
        />

        {/* Faint blue-violet ambient gradient line */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Background financial chart line contour (subtle vector overlay) */}
        <svg className="absolute bottom-10 left-0 w-full opacity-10 pointer-events-none" viewBox="0 0 500 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120 Q 100 80, 200 100 T 400 40 T 500 10" stroke="url(#lineGrad)" strokeWidth="2.5" fill="none" />
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Brand Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <PariViewLogo size="md" variant="monochrome-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-blue-300 text-[10px] font-extrabold tracking-widest uppercase mt-3">
            <ShieldCheck className="w-3 h-3" />
            <span>Smart Finance Platform</span>
          </div>
        </div>

        {/* Brand Headline & Messaging */}
        <div className="relative z-10 my-auto py-8">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-snug mb-4">
            Your money.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-100">
              Your view.
            </span><br />
            Your future.
          </h1>

          <p className="text-sm xl:text-base text-slate-400 max-w-md leading-relaxed mb-10 font-normal">
            Track spending, manage budgets, monitor investments, and understand your financial journey — all in one place.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 mb-1 text-blue-400 font-bold text-xs">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Track & Analyze</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">Understand where your money goes.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 mb-1 text-emerald-400 font-bold text-xs">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Plan & Save</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">Manage budgets & financial goals.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 mb-1 text-indigo-400 font-bold text-xs">
                <PieChart className="w-4 h-4 text-indigo-400" />
                <span>Invest & Grow</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">Track investments & portfolio value.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 mb-1 text-violet-400 font-bold text-xs">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <span>Smart Insights</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">Turn financial data into useful insights.</p>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="relative z-10 pt-4 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between font-medium">
          <span>© 2026 PariView. All rights reserved.</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            256-Bit Bank Grade Encryption
          </span>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. RIGHT LOGIN PANEL (Desktop 52-55% width, Full width on Mobile) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[54%] xl:w-[52%] min-h-screen flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative bg-background">
        
        <div className="w-full max-w-[420px] my-auto">
          
          {/* Mobile Header Logo (Visible on mobile/tablet only) */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <PariViewLogo size="lg" className="mb-3" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              <span>Smart Finance Platform</span>
            </div>
          </div>

          {/* Desktop Login Header */}
          <div className="mb-8">
            <div className="hidden lg:block mb-4">
              <PariViewLogo size="md" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-textPrimary tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-textMuted font-medium mt-1.5">
              Sign in to continue your financial journey.
            </p>
          </div>

          {/* Error Container */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold leading-relaxed flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* EMAIL ADDRESS */}
            <div>
              <label className="block text-[11px] font-extrabold text-textMuted uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-textMuted absolute left-4 top-3.5 pointer-events-none" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-12 pl-11 pr-4 bg-surface/70 border border-borderColor rounded-xl text-textPrimary placeholder:text-textMuted/50 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-extrabold text-textMuted uppercase tracking-wider">
                  Password
                </label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); alert('Password reset instructions have been sent to your registered email.'); }} 
                  className="text-[11px] font-bold text-primary hover:text-primaryHover transition-colors hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-textMuted absolute left-4 top-3.5 pointer-events-none" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 bg-surface/70 border border-borderColor rounded-xl text-textPrimary placeholder:text-textMuted/50 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary p-1 rounded-lg transition-colors focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* KEEP ME SIGNED IN */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-borderColor text-primary focus:ring-primary/20 cursor-pointer transition-all"
                />
                <span className="text-xs font-semibold text-textSecondary group-hover:text-textPrimary transition-colors">
                  Keep me signed in
                </span>
              </label>
            </div>

            {/* SIGN IN BUTTON */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 sm:h-13 rounded-xl bg-primary hover:bg-primaryHover active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Bottom Register Link */}
          <div className="mt-8 pt-6 border-t border-borderColor/60 text-center">
            <p className="text-xs font-semibold text-textMuted">
              Don't have an account?{' '}
              <Link to="/register" className="font-extrabold text-primary hover:text-primaryHover transition-colors hover:underline">
                Create Account
              </Link>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;