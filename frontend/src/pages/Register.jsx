import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import pariViewLogoImg from '../assets/pariview-logo.png';

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
    if (!pw) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score, label: 'Weak', color: 'bg-red-500', textClass: 'text-red-500' };
      case 2:
      case 3:
        return { score, label: 'Medium', color: 'bg-amber-500', textClass: 'text-amber-500' };
      case 4:
      default:
        return { score, label: 'Strong & Secure', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
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
            Create Account
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Start managing your finances with PariView today.
          </p>
        </div>

        {/* Banners */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{success}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* FULL NAME */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
              <input 
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
          </div>

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
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative mb-2">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors focus:outline-none cursor-pointer z-10"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && (
              <div className="space-y-1 animate-in fade-in duration-200 mb-2">
                <div className="flex justify-between items-center text-[10px] font-extrabold">
                  <span className="text-slate-400 uppercase tracking-wider">Password Strength</span>
                  <span className={getPasswordStrength(password).textClass}>{getPasswordStrength(password).label}</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden p-[1px]">
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
            className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 before:h-[1px] before:flex-1 before:bg-slate-200 after:h-[1px] after:flex-1 after:bg-slate-200">
          <span className="text-[11px] font-semibold text-slate-400">
            Already have an account?
          </span>
        </div>

        {/* Log In Outline Button */}
        <Link 
          to="/login"
          className="w-full h-11 rounded-xl border-2 border-[#4F46E5] bg-white hover:bg-indigo-50/60 active:scale-[0.99] text-[#4F46E5] font-extrabold text-xs sm:text-sm tracking-wide transition-all duration-200 flex items-center justify-center shadow-xs"
        >
          Log In
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

export default Register;