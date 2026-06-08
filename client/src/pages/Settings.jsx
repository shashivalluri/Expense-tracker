import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBudget } from '../context/BudgetContext';
import GlassCard from '../components/common/GlassCard';
import { User, Moon, Sun, LogOut, Save, Settings as SettingsIcon, Globe, Database } from 'lucide-react';

const Settings = () => {
  const { user, logout, updateSettings } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addNotification } = useBudget();
  
  const [formData, setFormData] = useState({
    currency: user?.settings?.currency || 'INR',
    language: user?.settings?.language || 'en',
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateSettings(formData);
    setIsSaving(false);
    
    if (success) {
      addNotification('Settings updated successfully', 'success');
    } else {
      addNotification('Failed to update settings', 'danger');
    }
  };

  const handleThemeToggle = async () => {
    toggleTheme();
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ ...formData, theme: newTheme });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
          <SettingsIcon className="text-brand-indigo" />
          Workspace Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage your account preferences and application configuration.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-indigo/10 text-brand-indigo rounded-xl">
                <User size={24} />
              </div>
              <h2 className="text-xl font-bold">Profile Details</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Username</label>
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-medium">
                  {user?.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-medium">
                  {user?.email}
                </div>
              </div>
              <div className="pt-2 text-xs text-slate-500">
                Profile details are managed centrally. Please contact support to change your email or username.
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Preferences Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-teal/10 text-brand-teal rounded-xl">
                <Globe size={24} />
              </div>
              <h2 className="text-xl font-bold">Preferences</h2>
            </div>
            
            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Display Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo focus:border-transparent transition-all"
                >
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="JPY">JPY (¥) — Japanese Yen</option>
                  <option value="AUD">AUD (A$) — Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-indigo focus:border-transparent transition-all"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Theme Mode</span>
                <button
                  onClick={handleThemeToggle}
                  className={`
                    relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300
                    ${theme === 'dark' ? 'bg-brand-indigo' : 'bg-slate-300 dark:bg-slate-700'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 flex items-center justify-center shadow-md
                      ${theme === 'dark' ? 'translate-x-8' : 'translate-x-1'}
                    `}
                  >
                    {theme === 'dark' ? <Moon size={12} className="text-brand-indigo" /> : <Sun size={12} className="text-amber-500" />}
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-6 mt-auto">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-indigo text-white rounded-xl font-bold hover:bg-brand-indigo/90 transition-colors shadow-lg shadow-brand-indigo/30 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Data & Security Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-2"
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <Database size={24} />
              </div>
              <h2 className="text-xl font-bold">Data & Security</h2>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-xl border border-rose-500/10 bg-rose-500/5">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Account Session</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Log out of your current active session on this device. You will need to sign in again to access your workspace.
                </p>
              </div>
              <button
                onClick={() => {
                  logout();
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-bold transition-colors whitespace-nowrap shadow-lg shadow-rose-500/30"
              >
                <LogOut />
                Sign Out
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
