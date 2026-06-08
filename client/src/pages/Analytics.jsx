import React, { useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  LineChart, 
  Line, 
  ComposedChart,
  Area,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  BarChart3, 
  Scale, 
  Sparkles,
  DollarSign
} from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import { ShimmerBentoGrid } from '../components/common/Shimmer';
import { formatCurrency as formatCurrencyHelper } from '../utils/currency';

const Analytics = () => {
  const { user } = useAuth();
  const { stats, activeBudget, fetchStats, fetchBudget, loadingStats } = useBudget();

  useEffect(() => {
    fetchStats();
    // Fetch budget for current month to check limit comparisons
    const currentMonth = new Date().toISOString().substring(0, 7);
    fetchBudget(currentMonth);
  }, [fetchStats, fetchBudget]);

  const PIE_COLORS = ['#8b5cf6', '#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899'];

  const formatCurrency = (val) => {
    return formatCurrencyHelper(val, user?.settings?.currency || 'INR');
  };

  if (loadingStats) {
    return <ShimmerBentoGrid />;
  }

  const trends = stats.monthlyTrends || [];
  const breakdown = stats.categoryBreakdown || [];

  // Compile Composed Chart data: Category Budget Limit vs Category Spent
  // Reads values from activeBudget categoryLimits map and links them to category totals in stats
  let budgetComparisonData = [];
  if (activeBudget) {
    const limitsMap = activeBudget.categoryLimits || {};
    
    // Default categories list
    const defaultCategories = ['Food', 'Utilities', 'Entertainment', 'Transportation', 'Shopping', 'Others'];
    
    budgetComparisonData = defaultCategories.map(cat => {
      // Find spent amount
      const spentItem = breakdown.find(item => item.name.toLowerCase() === cat.toLowerCase());
      const spent = spentItem ? spentItem.value : 0;
      
      // Find limit
      const limit = limitsMap[cat] !== undefined ? parseFloat(limitsMap[cat]) : 400; // default seed fallback
      
      return {
        name: cat,
        Spent: spent,
        Limit: limit
      };
    });
  }

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Visualizations
        </span>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
          Financial Analytics
        </h2>
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Income vs Expense comparison (Bar Chart) */}
        <GlassCard className="p-6 border-white/20 dark:border-white/10 shadow-glass">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-brand-indigo dark:text-brand-violet" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Income vs Expense Breakdown
            </h3>
          </div>

          <div className="h-72 w-full mt-4">
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 11, 30, 0.85)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '11px'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="income" name="Earnings" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No chart data compiled</div>
            )}
          </div>
        </GlassCard>

        {/* CHART 2: Spending Trends (Area Curve) */}
        <GlassCard className="p-6 border-white/20 dark:border-white/10 shadow-glass">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-brand-indigo dark:text-brand-violet" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Monthly Expense Trajectory
            </h3>
          </div>

          <div className="h-72 w-full mt-4">
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 11, 30, 0.85)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '11px'
                    }} 
                  />
                  <Line type="monotone" dataKey="expense" name="Expense Flow" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No trajectory data compiled</div>
            )}
          </div>
        </GlassCard>

        {/* CHART 3: Category Allocation (Pie/Donut Chart) */}
        <GlassCard className="p-6 border-white/20 dark:border-white/10 shadow-glass">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="text-brand-indigo dark:text-brand-violet" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Category Asset Distribution
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 h-72">
            <div className="h-full w-full sm:w-1/2 flex justify-center">
              {breakdown && breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
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

            <div className="w-full sm:w-1/2 space-y-2.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              {breakdown && breakdown.length > 0 ? (
                breakdown.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-200/40 dark:bg-slate-800/25 border border-slate-300/20 dark:border-slate-700/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3.5 h-3.5 rounded-lg flex-shrink-0" 
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} 
                      />
                      <span className="font-bold text-slate-750 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{formatCurrency(item.value)}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-12">No allocations tabulated</div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* CHART 4: Budget vs Spent (Composed Bar & Line overlay) */}
        <GlassCard className="p-6 border-white/20 dark:border-white/10 shadow-glass">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="text-brand-indigo dark:text-brand-violet" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Allocated Budget vs Actual Spend
            </h3>
          </div>

          <div className="h-72 w-full mt-4">
            {budgetComparisonData && budgetComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={budgetComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 11, 30, 0.85)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '11px'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Spent" name="Actual Spent" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25} />
                  <Line type="monotone" dataKey="Limit" name="Budget Limit" stroke="#f43f5e" strokeWidth={3.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Setup a budget plan under settings to check comparisons.
              </div>
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  );
};

export default Analytics;
