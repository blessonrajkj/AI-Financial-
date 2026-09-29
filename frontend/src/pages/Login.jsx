import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import pariViewLogoImg from '../assets/pariview-logo.png';

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
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Incorrect email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F4F6FB] relative overflow-hidden select-none">

      {/* Ambient background glowing circles */}
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-purple-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[450px] h-[450px] bg-blue-200/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Geometric background grid lines overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px),
            linear-gradient(45deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Floating Center Card Container */}
      <div className="w-full max-w-[440px] bg-white border border-slate-100/80 rounded-[28px] p-7 sm:p-10 shadow-2xl shadow-indigo-100/60 relative z-10 my-auto">
        
        {/* Card Top Brand Logo Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <img 
            src={pariViewLogoImg} 
            alt="PariView Logo" 
            className="w-16 h-16 object-contain rounded-2xl shadow-md shadow-indigo-500/10 mb-2.5 transition-transform duration-200 hover:scale-105"
          />
          <div className="flex items-center text-2xl font-black tracking-tight text-slate-900 leading-none">
            <span>Pari</span>
            <span className="text-primary font-black ml-[1px]">View</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mt-1.5">
            Smart Finance Platform
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sign in to continue your financial journey.
          </p>
        </div>

        {/* Error Container */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* EMAIL ADDRESS */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 pl-11 pr-4 bg-[#EFF5FF] border border-[#D5E3FF] rounded-xl text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); alert('Password reset instructions have been sent to your registered email.'); }} 
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-11 pr-11 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* KEEP ME SIGNED IN */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer transition-all"
              />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Keep me signed in
              </span>
            </label>
          </div>

          {/* SIGN IN BUTTON */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 before:h-[1px] before:flex-1 before:bg-slate-200 after:h-[1px] after:flex-1 after:bg-slate-200">
          <span className="text-[11px] font-semibold text-slate-400">
            Don't have an account?
          </span>
        </div>

        {/* Create Account Outline Button */}
        <Link 
          to="/register"
          className="w-full h-11 rounded-xl border-2 border-[#4F46E5] bg-white hover:bg-indigo-50/60 active:scale-[0.99] text-[#4F46E5] font-extrabold text-xs sm:text-sm tracking-wide transition-all duration-200 flex items-center justify-center shadow-xs"
        >
          Create Account
        </Link>

        {/* Security Encryption Footer */}
        <div className="mt-5 pt-1 text-center">
          <p className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Your financial data is protected with secure authentication.</span>
          </p>
        </div>

      </div>

    </div>
  );
};

export default Login;