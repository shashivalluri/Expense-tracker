import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { exportToExcel, printToPDF } from '../utils/exportHelpers';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  SlidersHorizontal, 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  X,
  Briefcase,
  Utensils,
  FolderOpen,
  Tv,
  Car,
  ShoppingBag,
  PiggyBank,
  Sparkles,
  DollarSign,
  Calendar
} from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Modal from '../components/common/Modal';
import { ShimmerList } from '../components/common/Shimmer';
import { formatCurrency as formatCurrencyHelper, getCurrencySymbol } from '../utils/currency';

const Transactions = () => {
  const { user } = useAuth();
  const { 
    transactions, 
    pagination, 
    fetchTransactions, 
    addTransaction, 
    editTransaction, 
    deleteTransaction,
    loadingTransactions 
  } = useBudget();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Food');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurrence, setFormRecurrence] = useState('monthly');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Trigger search on filter changes or page alterations
  useEffect(() => {
    fetchTransactions({
      q: searchTerm,
      type: filterType,
      category: filterCategory,
      startDate: filterStartDate,
      endDate: filterEndDate,
      page: currentPage,
      limit: 10
    });
  }, [fetchTransactions, searchTerm, filterType, filterCategory, filterStartDate, filterEndDate, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterCategory('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
  };

  // Compile full list for file exporting (wipes pagination limit to export EVERYTHING matching current filters!)
  const handleExcelExport = async () => {
    // Hit API without limit to pull ALL matching records
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        type: filterType,
        category: filterCategory,
        startDate: filterStartDate,
        endDate: filterEndDate,
        limit: 1000 // Grab up to 1000 items
      });
      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token')}` }
      });
      const resData = await response.json();
      if (resData.success) {
        exportToExcel(resData.data, 'aura_ledger_report.xlsx');
      }
    } catch (err) {
      console.error('Failed to export:', err.message);
    }
  };

  // Launch Edit modal
  const openEditModal = (tx) => {
    setSelectedTx(tx);
    setFormAmount(tx.amount.toString());
    setFormCategory(tx.category);
    setFormDate(new Date(tx.date).toISOString().substring(0, 10));
    setFormDescription(tx.description);
    setFormNote(tx.note || '');
    setFormIsRecurring(tx.isRecurring || false);
    setFormRecurrence(tx.recurrenceInterval || 'monthly');
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formAmount || parseFloat(formAmount) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please enter a description.');
      return;
    }

    setFormLoading(true);
    try {
      await editTransaction(selectedTx._id, {
        amount: parseFloat(formAmount),
        category: formCategory,
        date: formDate,
        description: formDescription,
        note: formNote,
        isRecurring: formIsRecurring,
        recurrenceInterval: formIsRecurring ? formRecurrence : 'none'
      });
      setIsEditModalOpen(false);
      // Refresh current page
      fetchTransactions({
        q: searchTerm,
        type: filterType,
        category: filterCategory,
        startDate: filterStartDate,
        endDate: filterEndDate,
        page: currentPage,
        limit: 10
      });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save modifications.');
    } finally {
      setFormLoading(false);
    }
  };

  // Format currencies
  const formatCurrency = (val) => {
    return formatCurrencyHelper(val, user?.settings?.currency || 'INR');
  };

  // Get icons
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Salary':
      case 'Freelance':
        return <Briefcase className="text-emerald-500" size={16} />;
      case 'Food':
        return <Utensils className="text-amber-500" size={16} />;
      case 'Utilities':
        return <FolderOpen className="text-blue-500" size={16} />;
      case 'Entertainment':
        return <Tv className="text-violet-500" size={16} />;
      case 'Transportation':
        return <Car className="text-sky-500" size={16} />;
      case 'Shopping':
        return <ShoppingBag className="text-pink-500" size={16} />;
      case 'Savings':
        return <PiggyBank className="text-indigo-500" size={16} />;
      default:
        return <Sparkles className="text-slate-500" size={16} />;
    }
  };

  const categoriesList = ['Salary', 'Freelance', 'Investments', 'Refunds', 'Food', 'Utilities', 'Entertainment', 'Transportation', 'Shopping', 'Savings', 'Others'];

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* 1. Header & Actions (No print class added so printing ledger hides header buttons) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Ledger
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Ledger Transactions
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`glass-btn-secondary ${showFiltersPanel ? 'border-brand-indigo text-brand-indigo dark:text-brand-violet' : ''}`}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
          
          <button
            onClick={handleExcelExport}
            className="glass-btn-secondary"
            title="Download Excel sheet"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>

          <button
            onClick={printToPDF}
            className="glass-btn-secondary"
            title="Print report"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* 2. Responsive Filters Panel */}
      {showFiltersPanel && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="no-print overflow-hidden"
        >
          <GlassCard className="p-5 border-white/20 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Filter: Category Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 outline-none border border-slate-300 dark:border-slate-800 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {/* Filter: Category Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 outline-none border border-slate-300 dark:border-slate-800 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="">All Categories</option>
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Filter: Start Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 outline-none border border-slate-300 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              />
            </div>

            {/* Filter: End Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 outline-none border border-slate-300 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all duration-300"
              >
                Wipe Filters
              </button>
            </div>

          </GlassCard>
        </motion.div>
      )}

      {/* 3. Text Search Bar */}
      <div className="relative no-print">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 dark:text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="glass-input pl-11"
          placeholder="Search by descriptions, categories, or notes..."
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 4. Ledger Table List */}
      <GlassCard className="border-white/20 dark:border-white/10 shadow-glass print-card overflow-hidden">
        {loadingTransactions ? (
          <div className="p-6">
            <ShimmerList rows={6} />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="py-4.5 px-6">Transaction</th>
                  <th className="py-4.5 px-6">Category</th>
                  <th className="py-4.5 px-6">Date</th>
                  <th className="py-4.5 px-6 text-right">Sum</th>
                  <th className="py-4.5 px-6 text-center no-print">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactions && transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr 
                      key={tx._id} 
                      className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10 transition-colors text-sm"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 block">
                            {tx.description}
                          </span>
                          {tx.note && (
                            <span className="block text-xs text-slate-400 dark:text-slate-500 max-w-[200px] sm:max-w-md truncate mt-0.5 font-medium">
                              {tx.note}
                            </span>
                          )}
                          {tx.isRecurring && (
                            <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-indigo/15 text-brand-indigo dark:text-brand-violet">
                              Recurring: {tx.recurrenceInterval}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300/30 dark:border-slate-700/30">
                            {getCategoryIcon(tx.category)}
                          </span>
                          {tx.category}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-bold text-slate-500 dark:text-slate-400">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>

                      <td className={`py-4 px-6 font-black text-right ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>

                      <td className="py-4 px-6 text-center no-print">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => openEditModal(tx)}
                            className="p-1.5 rounded text-slate-400 hover:text-brand-indigo dark:hover:text-brand-violet hover:bg-slate-200 dark:hover:bg-slate-850 transition-colors"
                            title="Edit transaction"
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => deleteTransaction(tx._id, tx.description)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Wipe transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      No transactions match your current search and filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Area */}
        {pagination.totalPages > 1 && (
          <div className="no-print border-t border-slate-200 dark:border-slate-800/80 px-6 py-4.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} entries)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-200/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg bg-slate-200/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* EDIT MODAL DIALOG */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modify Transaction Details"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {formError}
            </div>
          )}

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
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
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
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="glass-input py-3 cursor-pointer"
              >
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
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
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="glass-input"
                placeholder="e.g. Grocery store"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Notes (Optional)</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="glass-input py-2 h-16 resize-none"
              placeholder="Provide extra details..."
            />
          </div>

          {/* Recurrence Settings Toggle */}
          <div className="p-3 bg-slate-200/40 dark:bg-slate-900/40 rounded-xl space-y-2 border border-slate-300/10">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Is this a recurring transaction?</span>
              <input
                type="checkbox"
                checked={formIsRecurring}
                onChange={(e) => setFormIsRecurring(e.target.checked)}
                className="w-4 h-4 text-brand-indigo rounded focus:ring-brand-indigo cursor-pointer"
              />
            </div>

            {formIsRecurring && (
              <div className="space-y-1 mt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interval</label>
                <select
                  value={formRecurrence}
                  onChange={(e) => setFormRecurrence(e.target.value)}
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
            {formLoading ? 'Saving Changes...' : 'Apply Changes'}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default Transactions;
