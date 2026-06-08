import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBudget } from '../../context/BudgetContext';
import { Menu, Bell, Sun, Moon, AlertTriangle, X } from 'lucide-react';
import GlassCard from '../common/GlassCard';

const Navbar = ({ toggleMobileSidebar }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { alerts, fetchAlerts } = useBudget();
  const [showNotifications, setShowNotifications] = useState(false);
  const [greeting, setGreeting] = useState('Welcome back');

  // Trigger alerts fetch on mount
  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user, fetchAlerts]);

  // Set greeting according to local time
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-20 bg-white/40 dark:bg-brand-dark/20 backdrop-blur-glass border-b border-slate-200 dark:border-slate-800/50 z-20 transition-all duration-300">
      <div className="h-full flex items-center justify-between px-6 lg:px-8">
        
        {/* Left: Mobile hamburger & Welcome */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>
          
          <div className="hidden sm:block">
            <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Financial Control
            </span>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {greeting}, {user ? user.username : 'Guest'}!
            </h1>
          </div>
        </div>

        {/* Right: Currency Indicator, Theme Toggle, Notification Bell */}
        <div className="flex items-center gap-3">
          
          {/* Currency indicator bubble */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200/60 dark:bg-slate-800/40 text-brand-indigo dark:text-brand-violet border border-slate-300/40 dark:border-slate-700/40">
              <span>Currency:</span>
              <span className="uppercase">{user.settings?.currency || 'USD'}</span>
            </div>
          )}

          {/* Theme Toggler Button */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-slate-200/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-brand-indigo dark:hover:text-brand-violet hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/40 dark:border-slate-700/40 transition-all duration-300 active:scale-95"
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notification Alert Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 rounded-xl bg-slate-200/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-brand-indigo dark:hover:text-brand-violet hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/40 dark:border-slate-700/40 transition-all duration-300 active:scale-95 relative"
              aria-label="View alerts"
            >
              <Bell size={18} />
              
              {/* Glowing notification badge if alerts are active */}
              {alerts && alerts.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-neon border-2 border-white dark:border-[#0a0b1e] animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 z-50">
                <GlassCard className="p-4 shadow-2xl border-white/20 dark:border-white/10 max-h-96 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Bell size={16} className="text-brand-indigo dark:text-brand-violet" />
                      Spend Alerts & Warnings ({alerts ? alerts.length : 0})
                    </span>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {alerts && alerts.length > 0 ? (
                      alerts.map((alert, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-xl text-xs flex gap-2.5 border ${
                            alert.alertType === 'danger'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block uppercase tracking-wider text-[10px]">{alert.category}</span>
                            <p className="mt-0.5 font-medium leading-relaxed">{alert.message}</p>
                            <span className="block text-[9px] text-slate-400 mt-1 font-semibold">
                              Threshold: {alert.percentage}% spent
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                        <p className="text-xs font-semibold">No budget overspends detected!</p>
                        <p className="text-[10px] mt-1">Keep it up! Your finances are perfectly structured.</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
