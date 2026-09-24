import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import PariViewLogo from '../components/common/PariViewLogo';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.response?.data?.detail || 'Invalid email or password.');
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
            <span className="eyebrow-badge mb-1">Smart Finance Platform</span>
            <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">Welcome Back</h2>
            <p className="text-[11px] text-textMuted font-medium mt-0.5">Your money. Your view. Your future.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-extrabold text-textMuted uppercase tracking-wider">Password</label>
                <a href="#" className="text-[10px] font-bold text-primary hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
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
                  <span>Authenticate Session</span>
                  <span className="btn-island-icon">
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-textMuted">
            Don't have an account?{' '}
            <Link to="/register" className="font-extrabold text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;