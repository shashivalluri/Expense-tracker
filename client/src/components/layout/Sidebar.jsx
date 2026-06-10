import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutGrid, 
  ArrowRightLeft, 
  PieChart, 
  Scale, 
  Target, 
  History, 
  Settings, 
  LogOut, 
  User,
  Wallet
} from 'lucide-react';
import logoUrl from '../../assets/logo.png';

const Sidebar = ({ isOpen, toggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutGrid size={20} /> },
    { name: 'Expense Categories', path: '/transactions', icon: <ArrowRightLeft size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <PieChart size={20} /> },
    { name: 'Monthly Reports', path: '/budgets', icon: <Scale size={20} /> },
    { name: 'Budget Goals', path: '/goals', icon: <Target size={20} /> },
    { name: 'Savings Insights', path: '/logs', icon: <History size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-6 px-4">
      {/* 1. Header Branding Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-neon bg-black">
          <img src={logoUrl} alt="Budget Tracker Pro Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-teal bg-clip-text text-transparent tracking-wide truncate pr-2">
            Budget Tracker Pro
          </span>
          <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest -mt-1">
            Tracker Suite
          </span>
        </div>
      </div>

      {/* 2. Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (isOpen) toggleMobileSidebar(); // Close drawer on link click in mobile
            }}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 group
              ${isActive 
                ? 'bg-gradient-to-r from-brand-indigo/15 to-brand-violet/10 text-brand-indigo dark:text-brand-violet border-l-4 border-brand-indigo dark:border-brand-violet' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-100'
              }
            `}
          >
            <span className="transition-transform group-hover:scale-110 duration-300">
              {item.icon}
            </span>
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* 3. Footer Profile Card & Signout */}
      {user && (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-brand-indigo dark:text-brand-violet border border-slate-300 dark:border-slate-700">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.username}</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 font-semibold text-sm transition-all duration-300 hover:scale-[1.01]"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 w-64 h-full bg-white/70 dark:bg-brand-dark/40 backdrop-blur-glass border-r border-slate-200 dark:border-slate-800/60 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-500 ${isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        {/* Dark Screen Blur */}
        <div 
          onClick={toggleMobileSidebar}
          className={`absolute inset-0 bg-[#060713]/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        />
        
        {/* Drawer slide-in */}
        <div className={`absolute top-0 left-0 w-64 h-full bg-white dark:bg-[#0a0b1e] shadow-2xl transition-transform duration-500 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
