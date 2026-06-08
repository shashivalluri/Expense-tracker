import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Target, 
  Calendar, 
  PiggyBank, 
  Trash2, 
  DollarSign, 
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Modal from '../components/common/Modal';
import { ShimmerList } from '../components/common/Shimmer';
import { formatCurrency as formatCurrencyHelper, getCurrencySymbol } from '../utils/currency';

const Goals = () => {
  const { user } = useAuth();
  const { 
    goals, 
    fetchGoals, 
    addGoal, 
    deleteGoal, 
    contributeGoal, 
    loadingGoals 
  } = useBudget();

  // Create Goal Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalCategory, setGoalCategory] = useState('Savings');
  const [goalNotes, setGoalNotes] = useState('');

  // Contribution Modal
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionAmt, setContributionAmt] = useState('');
  
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Create Goal handler
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!goalName.trim()) {
      setFormError('Please enter a goal name.');
      return;
    }
    if (!goalTarget || parseFloat(goalTarget) <= 0) {
      setFormError('Please enter a target amount greater than zero.');
      return;
    }
    if (!goalDeadline) {
      setFormError('Please select a deadline target date.');
      return;
    }

    setFormLoading(true);
    try {
      await addGoal({
        name: goalName,
        targetAmount: parseFloat(goalTarget),
        deadlineDate: goalDeadline,
        category: goalCategory,
        notes: goalNotes
      });
      
      // Close and clear
      setIsAddModalOpen(false);
      setGoalName('');
      setGoalTarget('');
      setGoalDeadline('');
      setGoalNotes('');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to establish goal.');
    } finally {
      setFormLoading(false);
    }
  };

  // Contribute savings handler
  const handleContributeSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!contributionAmt || parseFloat(contributionAmt) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }

    setFormLoading(true);
    try {
      const completed = await contributeGoal(selectedGoal._id, parseFloat(contributionAmt), selectedGoal.name);
      
      if (completed) {
        // Trigger celebratory confetti explosion!
        import('canvas-confetti').then((confetti) => {
          confetti.default({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.65 }
          });
        });
      }

      setIsContributeModalOpen(false);
      setContributionAmt('');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Contribution transfer failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const openContributeModal = (goal) => {
    setSelectedGoal(goal);
    setIsContributeModalOpen(true);
  };

  const formatCurrency = (val) => {
    return formatCurrencyHelper(val, user?.settings?.currency || 'INR');
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Savings Planning
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Financial Goals Tracker
          </h2>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="glass-btn-primary self-start sm:self-center"
        >
          <Plus size={18} />
          Create Goal
        </button>
      </div>

      {/* Grid List */}
      {loadingGoals ? (
        <ShimmerList rows={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals && goals.length > 0 ? (
            goals.map((goal) => {
              const spentPercent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const isCompleted = goal.currentAmount >= goal.targetAmount;
              
              return (
                <GlassCard 
                  key={goal._id} 
                  className={`p-6 border-white/20 dark:border-white/10 shadow-glass flex flex-col justify-between relative overflow-hidden ${
                    isCompleted ? 'border-emerald-500/20 dark:border-emerald-500/10 shadow-neon-teal' : ''
                  }`}
                >
                  {/* Glowing completed badge icon decoration */}
                  {isCompleted && (
                    <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-emerald-500/10 rotate-45 flex items-center justify-center text-emerald-500" title="Completed!">
                      <Award size={24} className="mt-8 mr-1 transform -rotate-45" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-500 flex items-center justify-center">
                        <Target size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        {goal.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-150 mb-1 leading-snug">
                      {goal.name}
                    </h3>
                    
                    {goal.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal mb-4">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Goal Progress Ring/Line */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">Savings progress:</span>
                        <span className={`${isCompleted ? 'text-emerald-500 font-black' : 'text-brand-indigo font-bold'}`}>
                          {spentPercent}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-300/30 dark:bg-slate-700/30 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                              : 'bg-gradient-to-r from-brand-indigo to-brand-violet'
                          }`}
                          style={{ width: `${spentPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Balance</span>
                        <span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatCurrency(goal.currentAmount)}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Target</span>
                        <span className="text-slate-800 dark:text-slate-100 font-extrabold">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>

                    {/* Deadline block */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 pt-1">
                      <Calendar size={13} />
                      <span>Target Date: {new Date(goal.deadlineDate).toLocaleDateString()}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-4">
                      <button
                        onClick={() => openContributeModal(goal)}
                        disabled={isCompleted}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-500 cursor-not-allowed border border-emerald-500/20'
                            : 'bg-gradient-to-r from-brand-indigo to-brand-violet text-white shadow-neon hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        <PiggyBank size={14} />
                        {isCompleted ? 'Target Achieved!' : 'Contribute Savings'}
                      </button>

                      <button
                        onClick={() => deleteGoal(goal._id, goal.name)}
                        className="p-2.5 rounded-xl border border-slate-300/30 hover:border-rose-500/30 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300"
                        title="Delete Goal"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })
          ) : (
            <div className="col-span-1 md:col-span-3 py-24 text-center glass-card rounded-2xl p-8 border-white/20 dark:border-white/10 shadow-glass">
              <PiggyBank className="text-brand-indigo mx-auto mb-4" size={40} />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No savings plans set yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Add financial savings goals (like travel funds, house down payments, or gear purchases) and add contributions over time!
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ESTABLISH SAVINGS GOAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Establish Financial Saving Goal"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {formError}
            </div>
          )}

          {/* Goal Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Goal Title</label>
            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="glass-input"
              placeholder="e.g. Europe Vacation"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Target Sum ({getCurrencySymbol(user?.settings?.currency || 'INR')})</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 font-bold text-sm">
                  {getCurrencySymbol(user?.settings?.currency || 'INR')}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="glass-input pl-9"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Target Deadline Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Deadline Target Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="glass-input pl-9"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Goal Category</label>
            <select
              value={goalCategory}
              onChange={(e) => setGoalCategory(e.target.value)}
              className="glass-input py-3 cursor-pointer"
            >
              <option value="Savings">Savings</option>
              <option value="Travel">Travel</option>
              <option value="Electronics">Electronics</option>
              <option value="Investment">Investment</option>
              <option value="Property">Property</option>
              <option value="Education">Education</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Notes / Description</label>
            <textarea
              value={goalNotes}
              onChange={(e) => setGoalNotes(e.target.value)}
              className="glass-input py-2 h-16 resize-none"
              placeholder="Describe your motivation..."
            />
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="glass-btn-primary w-full py-3 mt-4"
          >
            {formLoading ? 'Creating Saving Target...' : 'Establish Savings Goal'}
          </button>
        </form>
      </Modal>

      {/* MODAL: SAVINGS CONTRIBUTION */}
      <Modal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        title={selectedGoal ? `Add Savings to "${selectedGoal.name}"` : 'Goal Contribution'}
      >
        <form onSubmit={handleContributeSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {formError}
            </div>
          )}

          {selectedGoal && (
            <div className="p-3.5 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 text-xs space-y-1.5 font-bold border border-slate-350/10">
              <div className="flex justify-between text-slate-500">
                <span>Target Amount:</span>
                <span className="text-slate-800 dark:text-slate-200">{formatCurrency(selectedGoal.targetAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Current Accumulated:</span>
                <span className="text-brand-indigo dark:text-brand-violet">{formatCurrency(selectedGoal.currentAmount)}</span>
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
            {formLoading ? 'Committing Transfer...' : 'Commit Savings Transfer'}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default Goals;
