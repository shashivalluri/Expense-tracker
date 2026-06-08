import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Wallet } from 'lucide-react';
import GlassCard from '../components/common/GlassCard';

const Register = () => {
  const { register, authError, clearError } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Custom alerts state
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Clean errors
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validations
    if (!username || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all requested fields.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const success = await register(username, email, password);
    setLoading(false);

    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#060713] flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] ambient-glow-teal rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] ambient-glow-indigo rounded-full pointer-events-none" />

      {/* Sliding animated card container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Top Wallet Icon */}
        <div className="w-16 h-16 bg-gradient-to-tr from-brand-indigo to-brand-violet rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-neon text-white float-animation">
          <Wallet size={28} />
        </div>

        <GlassCard className="p-8 border-white/20 dark:border-white/10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Create Account
            </h2>
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              Begin your AURA journey
            </p>
          </div>

          {/* Messages Alerts */}
          {(localError || authError) && (
            <div className="p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{localError || authError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            
            {/* Input: Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Preferred Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input pl-11"
                  placeholder="e.g. Alex"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Input: Email */}
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

            {/* Input: Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input pl-11 pr-11"
                  placeholder="At least 6 characters"
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

            {/* Input: Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input pl-11"
                  placeholder="Re-enter password"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary w-full py-3.5 mt-2"
            >
              {loading ? 'Creating Profile...' : 'Complete Registration'}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Footer Navigation link */}
          <div className="text-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
            </span>
            <Link
              to="/login"
              className="text-xs font-bold text-brand-indigo dark:text-brand-violet hover:underline outline-none"
            >
              Sign in here
            </Link>
          </div>

        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Register;
