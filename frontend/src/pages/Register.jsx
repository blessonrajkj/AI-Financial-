import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, TrendingUp, Target, PieChart, BarChart3, ShieldCheck } from 'lucide-react';
import PariViewLogo from '../components/common/PariViewLogo';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: 'bg-borderColor' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score, label: 'Weak', color: 'bg-danger shadow-danger-glow', textClass: 'text-danger' };
      case 2:
      case 3:
        return { score, label: 'Medium', color: 'bg-warning', textClass: 'text-warning' };
      case 4:
      default:
        return { score, label: 'Strong & Secure', color: 'bg-success shadow-success-glow', textClass: 'text-success' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register(email, password, fullName);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed. Please check your information and try again.');
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

        {/* Brand Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <PariViewLogo size="md" variant="monochrome-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-blue-300 text-[10px] font-extrabold tracking-widest uppercase mt-3">
            <ShieldCheck className="w-3 h-3" />
            <span>Create Account</span>
          </div>
        </div>

        {/* Brand Headline & Messaging */}
        <div className="relative z-10 my-auto py-8">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-snug mb-4">
            Join PariView.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-100">
              Control your money.
            </span><br />
            Build your future.
          </h1>

          <p className="text-sm xl:text-base text-slate-400 max-w-md leading-relaxed mb-10 font-normal">
            Take complete control of your financial life with intelligent tracking, automated budgets, and deep analytics.
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
      {/* 2. RIGHT REGISTER PANEL (Desktop 52-55% width, Full width on Mobile) */}
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

          {/* Desktop Register Header */}
          <div className="mb-8">
            <div className="hidden lg:block mb-4">
              <PariViewLogo size="md" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-textPrimary tracking-tight">
              Create Account
            </h2>
            <p className="text-xs sm:text-sm text-textMuted font-medium mt-1.5">
              Start managing your finances with PariView today.
            </p>
          </div>

          {/* Banners */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold leading-relaxed flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-semibold leading-relaxed flex items-start gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{success}</div>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* FULL NAME */}
            <div>
              <label className="block text-[11px] font-extrabold text-textMuted uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4.5 h-4.5 text-textMuted absolute left-4 top-3.5 pointer-events-none" />
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-12 pl-11 pr-4 bg-surface/70 border border-borderColor rounded-xl text-textPrimary placeholder:text-textMuted/50 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
            </div>

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
              <label className="block text-[11px] font-extrabold text-textMuted uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative mb-2">
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

              {/* Password strength indicator */}
              {password && (
                <div className="space-y-1.5 animate-in fade-in duration-200 mb-2">
                  <div className="flex justify-between items-center text-[10px] font-extrabold">
                    <span className="text-textMuted uppercase tracking-wider">Password Strength</span>
                    <span className={getPasswordStrength(password).textClass}>{getPasswordStrength(password).label}</span>
                  </div>
                  <div className="w-full h-1 bg-borderColor/60 rounded-full overflow-hidden p-[1px]">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                      style={{ width: `${(getPasswordStrength(password).score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CREATE ACCOUNT BUTTON */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 sm:h-13 rounded-xl bg-primary hover:bg-primaryHover active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Bottom Log In Link */}
          <div className="mt-8 pt-6 border-t border-borderColor/60 text-center">
            <p className="text-xs font-semibold text-textMuted">
              Already have an account?{' '}
              <Link to="/login" className="font-extrabold text-primary hover:text-primaryHover transition-colors hover:underline">
                Log In
              </Link>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Register;