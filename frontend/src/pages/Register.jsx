import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-background">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-success/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-cardBg p-8 rounded-3xl border border-borderColor shadow-lg relative z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-extrabold text-xl shadow-md mb-3">
            W
          </div>
          <h2 className="text-2xl font-extrabold text-textPrimary tracking-tight">Create Account</h2>
          <p className="text-sm text-textSecondary mt-1">Start tracking your wealth with WealthPilot AI</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Input */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 text-textMuted absolute left-4 top-3.5" />
              <input 
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-12 pl-12 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary focus:outline-none focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-textMuted absolute left-4 top-3.5" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full h-12 pl-12 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary focus:outline-none focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-textMuted absolute left-4 top-3.5" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-12 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary focus:outline-none focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/25 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-textSecondary">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;