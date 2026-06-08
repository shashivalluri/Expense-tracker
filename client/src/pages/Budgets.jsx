import React, { useState, useEffect, useCallback } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  Plus, 
  Edit, 
  AlertTriangle, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Check, 
  DollarSign, 
  Smile,
  Frown,
  ArrowRight
} from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Modal from '../components/common/Modal';
import { ShimmerList } from '../components/common/Shimmer';
import api from '../utils/api';
import { formatCurrency as formatCurrencyHelper, getCurrencySymbol } from '../utils/currency';

const Budgets = () => {
  const { user } = useAuth();
  const { 
    activeBudget, 
    fetchBudget, 
    updateBudget, 
    alerts, 
    fetchAlerts,
    loadingBudget 
  } = useBudget();

  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  
  // Local states for tracking spends of selected month
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [categorySpends, setCategorySpends] = useState({});

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formTotalLimit, setFormTotalLimit] = useState('2000');
  const [formCategoryLimits, setFormCategoryLimits] = useState({
    Food: 500,
    Utilities: 300,
    Entertainment: 200,
    Transportation: 200,
    Shopping: 400,
    Others: 400
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Helper to count days in a month
  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

  // Load selected month details
  const loadMonthData = useCallback(async () => {
    setLoadingMonthDetails(true);
    try {
      // 1. Fetch budget rules
      await fetchBudget(selectedMonth);

      // 2. Fetch all transactions for this specific month range
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysCount = getDaysInMonth(year, month);
      
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(daysCount).padStart(2, '0')}`;

      const res = await api.get('/transactions', {
        params: { startDate, endDate, limit: 1000 }
      });

      if (res.data.success) {
        const txs = res.data.data;
        setMonthTransactions(txs);

        // Compute spends
        let incomeSum = 0;
        let expenseSum = 0;
        const spendsMap = {
          Food: 0,
          Utilities: 0,
          Entertainment: 0,
          Transportation: 0,
          Shopping: 0,
          Savings: 0,
          Others: 0
        };

        txs.forEach(t => {
          const amount = parseFloat(t.amount);
          if (t.type === 'income') {
            incomeSum += amount;
          } else if (t.type === 'expense') {
            expenseSum += amount;
            // Map categories
            const cat = spendsMap[t.category] !== undefined ? t.category : 'Others';
            spendsMap[cat] = (spendsMap[cat] || 0) + amount;
          }
        });

        setMonthIncome(incomeSum);
        setMonthExpense(expenseSum);
        setCategorySpends(spendsMap);
      }
    } catch (err) {
      console.error('Failed to load budget month details:', err.message);
    } finally {
      setLoadingMonthDetails(false);
    }
  }, [selectedMonth, fetchBudget]);

  useEffect(() => {
    loadMonthData();
    if (selectedMonth === currentMonthStr) {
      fetchAlerts();
    }
  }, [loadMonthData, selectedMonth, currentMonthStr, fetchAlerts]);

  // Open modal & prepopulate forms
  const openEditModal = () => {
    if (activeBudget) {
      setFormTotalLimit(activeBudget.totalLimit.toString());
      setFormCategoryLimits({
        Food: activeBudget.categoryLimits?.Food !== undefined ? activeBudget.categoryLimits.Food : 500,
        Utilities: activeBudget.categoryLimits?.Utilities !== undefined ? activeBudget.categoryLimits.Utilities : 300,
        Entertainment: activeBudget.categoryLimits?.Entertainment !== undefined ? activeBudget.categoryLimits.Entertainment : 200,
        Transportation: activeBudget.categoryLimits?.Transportation !== undefined ? activeBudget.categoryLimits.Transportation : 200,
        Shopping: activeBudget.categoryLimits?.Shopping !== undefined ? activeBudget.categoryLimits.Shopping : 400,
        Others: activeBudget.categoryLimits?.Others !== undefined ? activeBudget.categoryLimits.Others : 400,
      });
    }
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Submit budget modifications
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const total = parseFloat(formTotalLimit);
    if (isNaN(total) || total <= 0) {
      setFormError('Please enter a valid monthly limit.');
      return;
    }

    setFormLoading(true);
    try {
      await updateBudget(selectedMonth, {
        totalLimit: total,
        categoryLimits: formCategoryLimits
      });
      setIsEditModalOpen(false);
      loadMonthData();
    } catch (err) {
      setFormError('Failed to save budget settings. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (val) => {
    return formatCurrencyHelper(val, user?.settings?.currency || 'INR');
  };

  // Determine progress bar classes
  const getProgressBarColor = (percentage) => {
    if (percentage < 50) return 'bg-emerald-500';
    if (percentage < 80) return 'bg-amber-500';
    if (percentage < 100) return 'bg-orange-500';
    return 'bg-rose-500 animate-pulse';
  };

  const getProgressBackground = (percentage) => {
    if (percentage < 50) return 'bg-emerald-500/10 border-emerald-500/20';
    if (percentage < 80) return 'bg-amber-500/10 border-amber-500/20';
    if (percentage < 100) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  const categories = ['Food', 'Utilities', 'Entertainment', 'Transportation', 'Shopping', 'Others'];
  const overallLimit = activeBudget ? activeBudget.totalLimit : 2000;
  const overallPercentage = Math.min(200, Math.round((monthExpense / overallLimit) * 100));

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Limit Allocations
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Category Budgets
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Input Selector */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Calendar size={15} />
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs font-bold rounded-xl bg-white/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 outline-none border border-slate-300/40 dark:border-slate-700/40 cursor-pointer focus:ring-1 focus:ring-brand-indigo"
            />
          </div>

          <button
            onClick={openEditModal}
            className="glass-btn-primary py-2 px-3 text-xs"
            disabled={loadingBudget}
          >
            <Edit size={14} />
            Adjust Budget Rules
          </button>
        </div>
      </div>

      {/* 2. Loading state */}
      {loadingBudget || loadingMonthDetails ? (
        <ShimmerList rows={4} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns: Budget Dashboard Bento elements (spans 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bento block 1: Overall month summary meter */}
            <GlassCard className={`p-6 border ${getProgressBackground(overallPercentage)} shadow-lg relative overflow-hidden flex flex-col justify-between`}>
              <div className="absolute right-0 top-0 w-64 h-64 ambient-glow-indigo rounded-full pointer-events-none opacity-20" />
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Overall Monthly Cap status
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    overallPercentage >= 100 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                      : overallPercentage >= 80 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  }`}>
                    {selectedMonth === currentMonthStr ? 'Active Month' : 'Archived Month'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-6">
                  <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    {formatCurrency(monthExpense)}
                  </h3>
                  <span className="text-sm font-bold text-slate-400">
                    of {formatCurrency(overallLimit)} limit ({overallPercentage}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-350/20 dark:bg-slate-900/60 rounded-full h-3 overflow-hidden border border-slate-300/10">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(overallPercentage)}`}
                    style={{ width: `${Math.min(100, overallPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Monthly stats breakdown footer */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800/80 pt-6 mt-6">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Month Earnings
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
                    <TrendingUp size={14} />
                    {formatCurrency(monthIncome)}
                  </div>
                </div>

                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Month Expenses
                  </span>
                  <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-sm sm:text-base">
                    <TrendingDown size={14} />
                    {formatCurrency(monthExpense)}
                  </div>
                </div>

                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Net Balance
                  </span>
                  <div className={`flex items-center gap-1 font-bold text-sm sm:text-base ${
                    monthIncome - monthExpense >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    <PiggyBank size={14} />
                    {formatCurrency(monthIncome - monthExpense)}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Bento block 2: Category breakdown slider elements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {categories.map(category => {
                const limit = activeBudget?.categoryLimits?.[category] !== undefined ? activeBudget.categoryLimits[category] : 400;
                const spent = categorySpends[category] || 0;
                const percentage = limit > 0 ? Math.min(200, Math.round((spent / limit) * 100)) : 0;

                return (
                  <GlassCard key={category} className="p-5 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{category}</span>
                        <span className={`text-xs font-black ${
                          percentage >= 100 ? 'text-rose-500' : percentage >= 80 ? 'text-amber-500' : 'text-brand-indigo dark:text-brand-violet'
                        }`}>
                          {percentage}%
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(spent)}</span>
                        <span className="text-[10px] text-slate-400 font-bold">/ {formatCurrency(limit)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full bg-slate-200/50 dark:bg-slate-900/60 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(percentage)}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>

                      {percentage >= 100 && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 uppercase tracking-wide">
                          <AlertTriangle size={12} />
                          Overspent by {formatCurrency(spent - limit)}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>

          </div>

          {/* Right Column: Real-time warnings & active list warnings */}
          <div className="space-y-6">
            
            {/* Spend Warnings Card */}
            <GlassCard className="p-6 border-white/20 dark:border-white/10 shadow-glass">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-brand-indigo" />
                  Budget Spend Alerts
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedMonth === currentMonthStr ? 'Real-Time' : 'Historical'}
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {selectedMonth === currentMonthStr ? (
                  alerts && alerts.length > 0 ? (
                    alerts.map((alert, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-xl text-xs flex gap-2.5 border ${
                          alert.alertType === 'danger'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        }`}
                      >
                        <AlertTriangle className="flex-shrink-0 mt-0.5 animate-bounce" size={16} />
                        <div>
                          <span className="font-bold block uppercase tracking-wider text-[9px]">{alert.category}</span>
                          <p className="mt-0.5 font-medium leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <Smile className="text-emerald-500 mx-auto mb-2" size={30} />
                      <p className="text-xs font-bold">No budget warnings!</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Spends are fully aligned with your limits.</p>
                    </div>
                  )
                ) : (
                  // Historical month alerts simulated client-side
                  (() => {
                    const simulatedAlerts = [];
                    // Over limit total
                    if (overallPercentage >= 100) {
                      simulatedAlerts.push({
                        category: 'All Categories',
                        type: 'danger',
                        msg: `Total expenses exceeded the monthly cap of ${formatCurrency(overallLimit)}.`
                      });
                    } else if (overallPercentage >= 80) {
                      simulatedAlerts.push({
                        category: 'All Categories',
                        type: 'warning',
                        msg: `Total expenses consumed over ${overallPercentage}% of the budget limit.`
                      });
                    }

                    // Category limits
                    categories.forEach(cat => {
                      const limit = activeBudget?.categoryLimits?.[cat] || 400;
                      const spent = categorySpends[cat] || 0;
                      if (limit > 0 && spent >= limit) {
                        simulatedAlerts.push({
                          category: cat,
                          type: 'danger',
                          msg: `Category limit of ${formatCurrency(limit)} was exceeded.`
                        });
                      } else if (limit > 0 && spent >= limit * 0.8) {
                        const pct = Math.round((spent / limit) * 100);
                        simulatedAlerts.push({
                          category: cat,
                          type: 'warning',
                          msg: `Category consumed ${pct}% of its ${formatCurrency(limit)} limit.`
                        });
                      }
                    });

                    if (simulatedAlerts.length > 0) {
                      return simulatedAlerts.map((alert, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3.5 rounded-xl text-xs flex gap-2.5 border ${
                            alert.type === 'danger'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}
                        >
                          <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                          <div>
                            <span className="font-bold block uppercase tracking-wider text-[9px]">{alert.category}</span>
                            <p className="mt-0.5 font-medium leading-relaxed">{alert.msg}</p>
                          </div>
                        </div>
                      ));
                    }

                    return (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Smile className="text-emerald-500 mx-auto mb-2" size={30} />
                        <p className="text-xs font-bold">No historical warnings!</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Budget boundaries remained secure.</p>
                      </div>
                    );
                  })()
                )}
              </div>
            </GlassCard>

            {/* Financial Motivation Card */}
            <GlassCard className="p-6 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between h-44 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 ambient-glow-teal rounded-full pointer-events-none opacity-20" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Budget Insights
                </span>
                <p className="text-xs font-semibold text-slate-650 dark:text-slate-300 leading-relaxed">
                  {overallPercentage >= 100 
                    ? "Careful! You've depleted your total budget limit. Consider trimming discretionary expenditures to avoid cash flow issues."
                    : overallPercentage >= 80
                      ? "You are approaching your spending threshold. Review your transaction log to see if any items can be delayed."
                      : "Outstanding! You are operating well within your financial parameters. Keep tracking your spending patterns!"}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-brand-indigo dark:text-brand-violet mt-3">
                <span className="flex items-center gap-1">
                  {overallPercentage >= 100 ? <Frown size={14} /> : <Smile size={14} />}
                  Status: {overallPercentage >= 100 ? "Over Limit" : "Secure Ledger"}
                </span>
                <a href="/transactions" className="hover:underline flex items-center gap-0.5">
                  Transactions
                  <ArrowRight size={10} />
                </a>
              </div>
            </GlassCard>

          </div>

        </div>
      )}

      {/* MODAL: EDIT MONTHLY BUDGET RULES */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Set Budget Rules for "${selectedMonth}"`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {formError}
            </div>
          )}

          {/* Overall total Limit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Overall Total Limit ({getCurrencySymbol(user?.settings?.currency || 'INR')})
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                {getCurrencySymbol(user?.settings?.currency || 'INR')}
              </span>
              <input
                type="number"
                step="50"
                min="100"
                value={formTotalLimit}
                onChange={(e) => setFormTotalLimit(e.target.value)}
                className="glass-input pl-9 font-extrabold"
                placeholder="2000"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 pl-1">
              This is the overall limit cap for all your month's combined expenses.
            </p>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <h5 className="text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider pl-1">
              Category Limits
            </h5>
            
            <div className="grid grid-cols-2 gap-4">
              {categories.map(category => (
                <div key={category} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider pl-1">
                    {category} ({getCurrencySymbol(user?.settings?.currency || 'INR')})
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={formCategoryLimits[category] || 0}
                    onChange={(e) => setFormCategoryLimits({
                      ...formCategoryLimits,
                      [category]: parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-slate-200/50 dark:bg-slate-850 outline-none border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    placeholder="200"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="glass-btn-primary w-full py-3 mt-6"
          >
            {formLoading ? 'Saving Rules...' : 'Save Budget Adjustments'}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default Budgets;
