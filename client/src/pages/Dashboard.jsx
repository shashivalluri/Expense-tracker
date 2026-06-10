import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  DollarSign, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Briefcase, 
  Utensils, 
  Tv, 
  Car, 
  ShoppingBag, 
  Sparkles, 
  AlertTriangle,
  FolderOpen,
  Calendar,
  Smile
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import GlassCard from '../components/common/GlassCard';
import Modal from '../components/common/Modal';
import { ShimmerBentoGrid } from '../components/common/Shimmer';
import { formatCurrency as formatCurrencyHelper, getCurrencySymbol } from '../utils/currency';
import { Activity, Zap, Map } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    stats, 
    transactions, 
    goals, 
    alerts, 
    fetchStats, 
    fetchTransactions, 
    fetchGoals, 
    fetchAlerts,
    addTransaction, 
    deleteTransaction,
    contributeGoal,
    loadingStats,
    loadingTransactions
  } = useBudget();

  // Onboarding guide show state
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('aura_show_guide') !== 'false';
  });

  const dismissGuide = () => {
    localStorage.setItem('aura_show_guide', 'false');
    setShowGuide(false);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionAmt, setContributionAmt] = useState('');

  // Transaction form state
  const [txType, setTxType] = useState('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Food');
  const [txDate, setTxDate] = useState(new Date().toISOString().substring(0, 10));
  const [txDescription, setTxDescription] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txIsRecurring, setTxIsRecurring] = useState(false);
  const [txRecurrence, setTxRecurrence] = useState('monthly');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load dashboard stats on mount
  useEffect(() => {
    fetchStats();
    fetchTransactions({ page: 1, limit: 5 }); // Get 5 recent transactions
    fetchGoals();
    fetchAlerts();
  }, [fetchStats, fetchTransactions, fetchGoals, fetchAlerts]);

  // Icons mapper based on category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Salary':
      case 'Freelance':
        return <Briefcase className="text-emerald-500" size={18} />;
      case 'Food':
        return <Utensils className="text-amber-500" size={18} />;
      case 'Utilities':
        return <FolderOpen className="text-blue-500" size={18} />;
      case 'Entertainment':
        return <Tv className="text-violet-500" size={18} />;
      case 'Transportation':
        return <Car className="text-sky-500" size={18} />;
      case 'Shopping':
        return <ShoppingBag className="text-pink-500" size={18} />;
      case 'Savings':
        return <PiggyBank className="text-indigo-500" size={18} />;
      default:
        return <Sparkles className="text-slate-500" size={18} />;
    }
  };

  // Transaction Form submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!txAmount || parseFloat(txAmount) <= 0) {
      setFormError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!txDescription.trim()) {
      setFormError('Please enter a brief description.');
      return;
    }

    setFormLoading(true);
    try {
      await addTransaction({
        type: txType,
        amount: parseFloat(txAmount),
        category: txCategory,
        date: txDate,
        description: txDescription,
        note: txNote,
        isRecurring: txIsRecurring,
        recurrenceInterval: txIsRecurring ? txRecurrence : 'none'
      });
      
      // Close and clear
      setIsAddModalOpen(false);
      setTxAmount('');
      setTxDescription('');
      setTxNote('');
      setTxIsRecurring(false);
      setTxRecurrence('monthly');
      
      // Reload dashboard list
      fetchTransactions({ page: 1, limit: 5 });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to record transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  // Goal contribution form submit
  const handleContributeSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!contributionAmt || parseFloat(contributionAmt) <= 0) {
      setFormError('Enter a valid contribution amount.');
      return;
    }

    setFormLoading(true);
    try {
      const completed = await contributeGoal(selectedGoal._id, parseFloat(contributionAmt), selectedGoal.name);
      
      if (completed) {
        // Trigger Canvas Confetti!
        import('canvas-confetti').then((confetti) => {
          confetti.default({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        });
      }

      setIsContributeModalOpen(false);
      setContributionAmt('');
      // Reload dashboard list
      fetchTransactions({ page: 1, limit: 5 });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Contribution failed.');
    } finally {
      setFormLoading(false);
    }
  };

  // Trigger modal launch
  const openContributeModal = (goal) => {
    setSelectedGoal(goal);
    setIsContributeModalOpen(true);
  };

  // Recharts color list
  const PIE_COLORS = ['#8b5cf6', '#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899'];

  // Currency helper formatting
  const formatCurrency = (val) => {
    return formatCurrencyHelper(val, user?.settings?.currency || 'INR');
  };

  if (loadingStats || loadingTransactions) {
    return <ShimmerBentoGrid />;
  }

  const summary = stats.summary || { totalBalance: 0, totalIncome: 0, totalExpense: 0, totalSavings: 0, savingsRate: 0 };
  const breakdown = stats.categoryBreakdown || [];
  const trends = stats.monthlyTrends || [];

  // Calculate Financial Health Score (0-100)
  const healthScore = Math.min(100, Math.max(0, 50 + (summary.savingsRate || 0) - (alerts ? alerts.length * 10 : 0)));
  let healthColor = 'text-emerald-500';
  if (healthScore < 70) healthColor = 'text-amber-500';
  if (healthScore < 40) healthColor = 'text-rose-500';

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* 1. TOP ROW: Quick Stats & Floating Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-brand-indigo dark:text-brand-violet uppercase tracking-widest block mb-1">
            Email: {user?.email}
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
            Welcome, {user?.username}
          </h2>
        </div>
        
        <button
          onClick={() => {
            setTxType('expense');
            setTxCategory('Food');
            setIsAddModalOpen(true);
          }}
          className="glass-btn-primary self-start sm:self-center"
        >
          <Plus size={18} />
          Quick Add
        </button>
      </div>

      {/* BEGINNER ONBOARDING GUIDE BANNER */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-brand-indigo/30 dark:border-brand-indigo/20 bg-gradient-to-r from-brand-indigo/10 to-brand-violet/10 dark:from-brand-indigo/15 dark:to-brand-violet/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-indigo to-brand-violet rounded-xl flex items-center justify-center shadow-neon">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Welcome to Budget Tracker Pro. Here's how to get started:</h3>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                {[
                  '① Click "Quick Add" to record your first income or expense',
                  '② Visit Budgets to set your monthly spending limits per category',
                  '③ Head to Goals to create a savings goal and track progress',
                  '④ Check Analytics for visual charts of your spending patterns',
                  '⑤ Go to Settings to change currency (₹ INR is default)',
                ].map((step) => (
                  <span key={step} className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-start gap-1">
                    {step}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={dismissGuide}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg text-brand-indigo dark:text-brand-violet bg-brand-indigo/10 dark:bg-brand-indigo/20 hover:bg-brand-indigo/20 dark:hover:bg-brand-indigo/30 transition-colors"
            >
              Got it!
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BENTO GRID: LAYOUT STRUCTURE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* BENTO CELL 1: Total Balance Card (spans 2 columns on desktop) */}
        <GlassCard className="p-6 col-span-1 lg:col-span-2 flex flex-col justify-between border-white/20 dark:border-white/10 shadow-glass-glow relative overflow-hidden">
          {/* Ambient inner glow */}
          <div className="absolute right-0 top-0 w-48 h-48 ambient-glow-indigo rounded-full pointer-events-none opacity-40" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Net Portfolio Worth
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                <TrendingUp size={14} />
                Active Ledger
              </span>
            </div>
            <h3 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-6">
              {formatCurrency(summary.totalBalance)}
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800/80 pt-6">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Total Income
              </span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
                <TrendingUp size={16} className="text-emerald-500" />
                {formatCurrency(summary.totalIncome)}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Total Expenses
              </span>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-sm sm:text-base">
                <TrendingDown size={16} className="text-rose-500" />
                {formatCurrency(summary.totalExpense)}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Savings Rate
              </span>
              <div className="flex items-center gap-1.5 text-brand-indigo dark:text-brand-violet font-bold text-sm sm:text-base">
                <PiggyBank size={16} className="text-brand-indigo" />
                {summary.savingsRate}%
              </div>
            </div>
          </div>
        </GlassCard>

        {/* BENTO CELL 2: Net Monthly Balance Trend (Recharts Area curve) */}
        <GlassCard className="p-6 col-span-1 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Performance Curve
            </span>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Monthly Trends
            </h4>
          </div>

          <div className="h-40 w-full">
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 11, 30, 0.8)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '11px'
                    }} 
                  />
                  <Area type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No chart data yet</div>
            )}
          </div>
        </GlassCard>

        {/* BENTO CELL 3: Budget Overspends & Notifications */}
        <GlassCard className="p-6 col-span-1 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Category Budgets
              </span>
              <span className="text-xs font-bold text-brand-indigo dark:text-brand-violet">
                {alerts ? alerts.length : 0} Alert(s)
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Budget Status
            </h4>
          </div>

          <div className="my-6 space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <div key={idx} className="flex gap-2.5 items-start p-3 bg-amber-500/10 dark:bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs">
                  <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold uppercase text-[9px] text-amber-600 dark:text-amber-400">{alert.category}</span>
                    <p className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-300 font-medium">{alert.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                <Smile className="text-emerald-500" size={24} />
                <div>
                  <p className="text-xs font-bold">All budgets fully aligned!</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">You are doing fantastic with your finances.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-400">Monthly Cap limit:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {stats.activeBudgetLimit ? formatCurrency(stats.activeBudgetLimit) : formatCurrency(2000)}
            </span>
          </div>
        </GlassCard>

        {/* BENTO CELL 4: Spending Categories Breakdown Pie Chart */}
        <GlassCard className="p-6 col-span-1 lg:col-span-2 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Expense Allocation
            </span>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Categories Breakdown
            </h4>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-44 w-full sm:w-1/2 flex justify-center">
              {breakdown && breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(10, 11, 30, 0.85)', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        fontSize: '11px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No chart data yet</div>
              )}
            </div>

            <div className="w-full sm:w-1/2 grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {breakdown && breakdown.length > 0 ? (
                breakdown.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2 p-2 rounded-xl bg-slate-200/40 dark:bg-slate-800/25 border border-slate-300/20 dark:border-slate-700/20">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} 
                    />
                    <div className="overflow-hidden">
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{item.name}</span>
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-xs text-slate-400 text-center py-6">Add expenses to review allocations</div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* BENTO CELL 5: Recent Transactions ledger preview (spans 2 columns) */}
        <GlassCard className="p-6 col-span-1 lg:col-span-2 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Accounting
              </span>
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                Recent Transactions
              </h4>
            </div>
            
            <a 
              href="/transactions" 
              className="text-xs font-bold text-brand-indigo dark:text-brand-violet hover:underline flex items-center gap-1"
            >
              Full History
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
            {transactions && transactions.length > 0 ? (
              transactions.map((tx) => (
                <div 
                  key={tx._id} 
                  className="flex items-center justify-between p-3 bg-slate-200/30 dark:bg-[#0f1128]/30 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/30 border border-slate-300/10 dark:border-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/30 dark:border-slate-700/30 flex items-center justify-center">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none mb-1">
                        {tx.description}
                      </h5>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {tx.category} • {new Date(tx.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-extrabold ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <button
                      onClick={() => deleteTransaction(tx._id, tx.description)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Wipe transaction"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                No transactions recorded yet. Click "Quick Add" to add one!
              </div>
            )}
          </div>
        </GlassCard>

        {/* BENTO CELL 6: Savings Goals overview */}
        <GlassCard className="p-6 col-span-1 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Financial Goals
            </span>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Savings Progression
            </h4>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
            {goals && goals.length > 0 ? (
              goals.slice(0, 3).map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div key={goal._id} className="space-y-1.5 p-3 rounded-xl bg-slate-200/40 dark:bg-slate-800/25 border border-slate-300/20 dark:border-slate-700/20">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{goal.name}</span>
                      <span className="text-xs font-black text-brand-indigo dark:text-brand-violet">{percent}%</span>
                    </div>

                    <div className="w-full bg-slate-300/30 dark:bg-slate-700/30 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-brand-indigo to-brand-violet h-full rounded-full" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-1">
                      <span>{formatCurrency(goal.currentAmount)} saved</span>
                      <button
                        onClick={() => openContributeModal(goal)}
                        className="text-brand-indigo dark:text-brand-violet hover:underline flex items-center gap-0.5"
                      >
                        Contribute
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                No financial goals set. Click Goals on the sidebar to create one!
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4 text-center">
            <a 
              href="/goals" 
              className="text-xs font-bold text-brand-indigo dark:text-brand-violet hover:underline inline-flex items-center gap-1"
            >
              Manage all goals
              <ArrowRight size={14} />
            </a>
          </div>
        </GlassCard>

      </div>

      {/* ADDITIONAL BENTO GRID COMPONENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* BENTO CELL 7: Financial Health Score */}
        <GlassCard className="p-6 col-span-1 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between items-center text-center">
          <div className="w-full flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Financial Health
            </span>
            <Activity size={16} className={healthColor} />
          </div>
          
          <div className="relative w-32 h-32 flex items-center justify-center my-4">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-800" />
              <circle 
                cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" 
                strokeDasharray={`${2 * Math.PI * 58}`} 
                strokeDashoffset={`${2 * Math.PI * 58 * (1 - healthScore / 100)}`}
                className={`${healthColor} transition-all duration-1000 ease-out`} 
                strokeLinecap="round" 
              />
            </svg>
            <span className={`text-4xl font-black ${healthColor}`}>{healthScore}</span>
          </div>

          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-4">
            {healthScore >= 70 ? 'Excellent financial discipline!' : healthScore >= 40 ? 'Fair standing. Try to save more.' : 'Action required to stabilize finances.'}
          </p>
        </GlassCard>

        {/* BENTO CELL 8: Smart Insights Panel */}
        <GlassCard className="p-6 col-span-1 lg:col-span-2 border-white/20 dark:border-white/10 shadow-glass flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <Zap size={18} className="text-amber-500" />
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Smart Insights
            </h4>
          </div>

          <div className="space-y-4 flex-1">
            {breakdown && breakdown.length > 0 ? (
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <h5 className="text-sm font-bold text-amber-600 dark:text-amber-500 mb-1">Top Expense Alert</h5>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  You are spending the most on <strong className="font-extrabold">{breakdown[0].name}</strong> ({formatCurrency(breakdown[0].value)}). Consider reducing this category's budget next month to instantly boost your savings rate!
                </p>
              </div>
            ) : null}

            {summary.savingsRate > 20 ? (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <h5 className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mb-1">Savings Goal Master</h5>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  You are saving {summary.savingsRate}% of your income! You are on a fantastic track for long-term wealth building.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-indigo/10 to-brand-violet/10 border border-brand-indigo/20">
                <h5 className="text-sm font-bold text-brand-indigo dark:text-brand-violet mb-1">Increase Savings Buffer</h5>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Your savings rate is currently {summary.savingsRate}%. A healthy target to aim for is 20%. Try reducing discretionary spending.
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* BENTO CELL 9: Spending Heatmap Placeholder */}
        <GlassCard className="p-6 col-span-1 md:col-span-2 lg:col-span-3 border-white/20 dark:border-white/10 shadow-glass overflow-hidden relative">
          <div className="flex items-center gap-2 mb-4">
            <Map size={18} className="text-brand-teal dark:text-brand-teal" />
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Spending Heatmap (30 Days)
            </h4>
          </div>
          
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start sm:justify-between py-2">
            {/* Render 30 mock boxes to represent days */}
            {Array.from({ length: 30 }).map((_, i) => {
              // Mock random intensity
              const intensity = Math.floor(Math.random() * 5); // 0 to 4
              const colors = [
                'bg-slate-200 dark:bg-slate-800', 
                'bg-brand-indigo/20', 
                'bg-brand-indigo/40', 
                'bg-brand-indigo/70', 
                'bg-brand-indigo'
              ];
              return (
                <div 
                  key={i} 
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md ${colors[intensity]} transition-colors duration-300 hover:scale-110 cursor-pointer`}
                  title={`Day ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="mt-2 text-right">
             <span className="text-[10px] font-bold text-slate-400">Low &larr; Intensity &rarr; High</span>
          </div>
        </GlassCard>
      </div>

      {/* MODAL: QUICK ADD TRANSACTION */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Record Ledger ${txType === 'expense' ? 'Expense' : 'Income'}`}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {formError}
            </div>
          )}

          {/* Toggle Type buttons */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={() => { setTxType('expense'); setTxCategory('Food'); }}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                txType === 'expense' 
                  ? 'bg-gradient-to-r from-brand-indigo to-brand-violet text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setTxType('income'); setTxCategory('Salary'); }}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                txType === 'income' 
                  ? 'bg-gradient-to-r from-brand-indigo to-brand-violet text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Amount ({getCurrencySymbol(user?.settings?.currency || 'INR')})</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 font-bold text-sm">
                  {getCurrencySymbol(user?.settings?.currency || 'INR')}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="glass-input pl-9"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Category</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="glass-input py-3 cursor-pointer"
              >
                {txType === 'income' ? (
                  categories.income.map(cat => <option key={cat} value={cat}>{cat}</option>)
                ) : (
                  categories.expense.map(cat => <option key={cat} value={cat}>{cat}</option>)
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="glass-input pl-9"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Description</label>
              <input
                type="text"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className="glass-input"
                placeholder="e.g. Weekly Groceries"
                required
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Notes (Optional)</label>
            <textarea
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
              className="glass-input py-2 h-16 resize-none"
              placeholder="Provide extra details..."
            />
          </div>

          {/* Recurrence Toggle */}
          <div className="p-3 bg-slate-200/40 dark:bg-slate-900/40 rounded-xl space-y-2 border border-slate-300/10">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Is this a recurring transaction?</span>
              <input
                type="checkbox"
                checked={txIsRecurring}
                onChange={(e) => setTxIsRecurring(e.target.checked)}
                className="w-4 h-4 text-brand-indigo rounded focus:ring-brand-indigo cursor-pointer"
              />
            </div>

            {txIsRecurring && (
              <div className="space-y-1 mt-2 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interval</label>
                <select
                  value={txRecurrence}
                  onChange={(e) => setTxRecurrence(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 outline-none border border-slate-300 dark:border-slate-700"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="glass-btn-primary w-full py-3 mt-4"
          >
            {formLoading ? 'Recording Transaction...' : 'Save Transaction'}
          </button>
        </form>
      </Modal>

      {/* MODAL: GOAL SAVINGS CONTRIBUTION */}
      <Modal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        title={selectedGoal ? `Add Savings to "${selectedGoal.name}"` : 'Add Goal Savings'}
      >
        <form onSubmit={handleContributeSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {formError}
            </div>
          )}

          {selectedGoal && (
            <div className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-900/50 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                <span>Target Balance:</span>
                <span>{formatCurrency(selectedGoal.targetAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                <span>Current Savings:</span>
                <span>{formatCurrency(selectedGoal.currentAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Contribution Sum ({getCurrencySymbol(user?.settings?.currency || 'INR')})</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 font-bold text-sm">
                {getCurrencySymbol(user?.settings?.currency || 'INR')}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={contributionAmt}
                onChange={(e) => setContributionAmt(e.target.value)}
                className="glass-input pl-9"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="glass-btn-primary w-full py-3 mt-4"
          >
            {formLoading ? 'Recording Transfer...' : 'Commit Savings Transfer'}
          </button>
        </form>
      </Modal>

    </div>
  );
};

// Static default categories definition
const categories = {
  income: ['Salary', 'Freelance', 'Investments', 'Refunds', 'Others'],
  expense: ['Food', 'Utilities', 'Entertainment', 'Transportation', 'Shopping', 'Savings', 'Others']
};

export default Dashboard;
