import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Wallet, CheckSquare, Square, Key, Sparkles, CheckCircle2 } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import logoUrl from '../assets/logo.png';

const Login = () => {
  const { login, forgotPassword, resetPassword, authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Core Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot Password flow states
  const [flowMode, setFlowMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [flowSuccessMessage, setFlowSuccessMessage] = useState('');
  const [localError, setLocalError] = useState(null);

  // Clear errors on load
  useEffect(() => {
    clearError();
    setLocalError(null);
    
    // Check if redirect has expired URL param
    if (location.search.includes('expired=true')) {
      setLocalError('Your security session expired. Please log in again.');
    }
  }, [location.search]);

  // Handle standard Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    const success = await login(email, password, rememberMe);
    setLoading(false);

    if (success) {
      setFlowSuccessMessage('Login successful.');
      setTimeout(() => {
        navigate('/');
      }, 500);
    }
  };

  // Handle Request Forgot Password Code
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setFlowSuccessMessage('');
    clearError();

    if (!recoveryEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(recoveryEmail);
      setLoading(false);
      setFlowSuccessMessage(`Code found! Enter verification code "${res.resetCode}" to set a new password.`);
      setResetCode(res.resetCode); // Pre-fill for developer convenience!
      setFlowMode('reset');
    } catch (err) {
      setLoading(false);
      setLocalError(err.response?.data?.error || 'Account not found with that email.');
    }
  };

  // Handle Reset Password Submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!resetCode || !newPassword) {
      setLocalError('Please enter the code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(resetCode, newPassword);
      setLoading(false);
      setFlowMode('login');
      setFlowSuccessMessage('Password reset successfully! You can now log in.');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      setLoading(false);
      setLocalError(err.response?.data?.error || 'Invalid or expired code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#060713] flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Ambient background blur blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ambient-glow-indigo rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] ambient-glow-teal rounded-full pointer-events-none" />

      {/* Main glass login card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Decorative Top Floating Wallet Icon */}
        <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-neon float-animation overflow-hidden bg-black border border-white/10">
          <img src={logoUrl} alt="Tracker Logo" className="w-full h-full object-cover" />
        </div>

        <GlassCard className="p-8 border-white/20 dark:border-white/10 shadow-2xl">
          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Tracker
            </h2>
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              Track Smarter. Save Better.
            </p>
          </div>

          {/* Messages Alert Banners */}
          {(localError || authError) && (
            <div className="p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{localError || authError}</span>
            </div>
          )}

          {flowSuccessMessage && (
            <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{flowSuccessMessage}</span>
            </div>
          )}

          {/* FLOW: LOGIN */}
          {flowMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input pl-11"
                    placeholder="name@example.com"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setFlowMode('forgot')}
                    className="text-xs font-bold text-brand-indigo dark:text-brand-violet hover:underline outline-none"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input pl-11 pr-11"
                    placeholder="••••••••"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between py-1 px-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 outline-none transition-colors"
                >
                  {rememberMe ? (
                    <CheckSquare size={18} className="text-brand-indigo dark:text-brand-violet" />
                  ) : (
                    <Square size={18} />
                  )}
                  Remember Me
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-btn-primary w-full py-3.5"
              >
                {loading ? 'Entering Ledger...' : 'Access Workspace'}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('demo@example.com');
                  setPassword('password123');
                  const quickLogin = async () => {
                    setLoading(true);
                    const success = await login('demo@example.com', 'password123', true);
                    setLoading(false);
                    if (success) navigate('/');
                  };
                  quickLogin();
                }}
                disabled={loading}
                className="glass-btn-secondary w-full py-3 mt-3 border border-brand-indigo/30 dark:border-brand-indigo/25 text-brand-indigo dark:text-brand-violet hover:bg-brand-indigo/10 dark:hover:bg-brand-indigo/10 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} className="animate-pulse" />
                Quick Demo Login
              </button>
            </form>
          )}

          {/* FLOW: FORGOT PASSWORD */}
          {flowMode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed mb-4">
                Enter your email address below. We'll generate a verification reset code that will display instantly on screen for easy verification!
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="glass-input pl-11"
                    placeholder="name@example.com"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-btn-primary w-full py-3.5"
              >
                {loading ? 'Retrieving Code...' : 'Request Recovery Code'}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => { setFlowMode('login'); setLocalError(null); }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mt-2 block"
              >
                Cancel and Go Back
              </button>
            </form>
          )}

          {/* FLOW: RESET PASSWORD */}
          {flowMode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Verification Reset Code</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Key size={18} />
                  </span>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="glass-input pl-11 tracking-widest text-center font-bold"
                    placeholder="XXXXXX"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">New Secure Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input pl-11 pr-11"
                    placeholder="••••••••"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-btn-primary w-full py-3.5"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => { setFlowMode('login'); setLocalError(null); }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mt-2 block"
              >
                Cancel and Go Back
              </button>
            </form>
          )}

          {/* Footer Navigation Link */}
          {flowMode === 'login' && (
            <div className="text-center mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                New to Tracker?{' '}
              </span>
              <Link
                to="/register"
                className="text-xs font-bold text-brand-indigo dark:text-brand-violet hover:underline outline-none"
              >
                Create an account
              </Link>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Login;
