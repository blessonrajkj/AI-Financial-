import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative bg-background overflow-hidden select-none">
      {/* ── Multi-layer Ambient Lighting & Grid ── */}
      <div className="absolute top-1/4 -left-20 w-[480px] h-[480px] bg-primary/12 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[480px] h-[480px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      {/* ── Register Card Container ── */}
      <div className="w-full max-w-[440px] relative z-10">
        <div className="bg-cardBg/90 dark:bg-cardBg/95 backdrop-blur-2xl border border-borderColor/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] rounded-3xl p-8 sm:p-9 transition-all duration-300">
          
          {/* ── Brand Header ── */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-2.5 rounded-2xl bg-surface/80 border border-borderColor/60 shadow-sm mb-3.5 hover:scale-105 transition-transform duration-300">
              <PariViewLogo size="lg" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-widest mb-2.5">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span>Create Account</span>
            </div>

            <h1 className="text-2xl font-black text-textPrimary tracking-tight">
              Register Access
            </h1>
            <p className="text-xs text-textMuted font-medium mt-1">
              Your money. Your view. Your future.
            </p>
          </div>

          {/* ── Banners ── */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-danger/10 border border-danger/25 text-danger text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3.5 rounded-2xl bg-success/10 border border-success/25 text-success text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{success}</div>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Full Name Field */}
            <div>
              <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-12 pl-11 pr-4 bg-hoverBg/40 dark:bg-surface/60 border border-borderColor/80 rounded-2xl text-textPrimary placeholder:text-textMuted/60 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-cardBg transition-all duration-200"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-12 pl-11 pr-4 bg-hoverBg/40 dark:bg-surface/60 border border-borderColor/80 rounded-2xl text-textPrimary placeholder:text-textMuted/60 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-cardBg transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative group mb-2">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-primary transition-colors">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 bg-hoverBg/40 dark:bg-surface/60 border border-borderColor/80 rounded-2xl text-textPrimary placeholder:text-textMuted/60 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-cardBg transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary p-1 rounded-lg transition-colors focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
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

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 hover:from-primaryHover hover:to-indigo-800 text-white font-extrabold text-xs tracking-wide shadow-[0_8px_25px_rgba(99,102,241,0.32)] hover:shadow-[0_12px_30px_rgba(99,102,241,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  </div>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
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