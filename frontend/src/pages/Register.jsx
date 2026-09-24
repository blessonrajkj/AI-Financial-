import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import PariViewLogo from '../components/common/PariViewLogo';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-background overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/8 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <div className="w-full max-w-md doppel-shell z-10">
        <div className="doppel-core p-8 flex flex-col justify-between">
          {/* Header Logo */}
          <div className="flex flex-col items-center mb-8">
            <PariViewLogo size="lg" className="mb-3" />
            <span className="eyebrow-badge mb-1">Create Account</span>
            <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">Register Access</h2>
            <p className="text-[11px] text-textMuted font-medium mt-0.5">Your money. Your view. Your future.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold leading-relaxed">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-bold leading-relaxed">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="w-4.5 h-4.5 text-textMuted absolute left-4 top-3.5" />
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-12 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary focus:outline-none focus:border-primary transition-all text-xs font-semibold"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-textMuted absolute left-4 top-3.5" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full h-12 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary focus:outline-none focus:border-primary transition-all text-xs font-semibold"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider mb-2">Password</label>
              <div className="relative mb-2">
                <Lock className="w-4.5 h-4.5 text-textMuted absolute left-4 top-3.5" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary focus:outline-none focus:border-primary transition-all text-xs font-semibold"
                />
              </div>

              {/* Dynamic strength indicator */}
              {password && (
                <div className="space-y-1.5 animate-fade-in mb-3">
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
              className="btn-island group w-full justify-center py-3.5"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="btn-island-icon">
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="font-extrabold text-primary hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;