import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';

const BudgetContext = createContext();

const normalizeTransaction = (tx) => ({
  ...tx,
  _id: tx.id,
  isRecurring: tx.is_recurring,
  recurrenceInterval: tx.recurrence_interval,
  nextOccurrence: tx.next_occurrence,
  createdAt: tx.created_at,
  updatedAt: tx.updated_at,
});

const normalizeGoal = (goal) => ({
  ...goal,
  _id: goal.id,
  targetAmount: goal.target_amount,
  currentAmount: goal.current_amount,
  deadlineDate: goal.deadline_date,
  createdAt: goal.created_at,
  updatedAt: goal.updated_at,
});

const normalizeBudget = (budget) => budget ? ({
  ...budget,
  _id: budget.id,
  totalLimit: budget.total_limit,
  categoryLimits: budget.category_limits || {},
  createdAt: budget.created_at,
  updatedAt: budget.updated_at,
}) : null;

const normalizeActivity = (activity) => ({
  ...activity,
  _id: activity.id,
  actionType: activity.action_type,
  ipAddress: activity.ip_address,
});

export const BudgetProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0, totalItems: 0 });
  const [stats, setStats] = useState({
    summary: { totalBalance: 0, totalIncome: 0, totalExpense: 0, totalSavings: 0, savingsRate: 0 },
    categoryBreakdown: [],
    monthlyTrends: [],
    activeRecurringCount: 0
  });
  const [activeBudget, setActiveBudget] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Skeletons
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);
  
  // Custom interactive toasts/notifications list
  const [notifications, setNotifications] = useState([]);

  // Toast dispatch helper
  const addNotification = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  // --- STATS ---
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/transactions/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Fetch stats failed:', err.message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // --- TRANSACTIONS ---
  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoadingTransactions(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.q) params.append('q', filters.q);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const res = await api.get(`/transactions?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.data.map(normalizeTransaction));
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch transactions failed:', err.message);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const addTransaction = async (txData) => {
    try {
      const res = await api.post('/transactions', txData);
      if (res.data.success) {
        addNotification(`Added transaction: ${txData.description} ($${parseFloat(txData.amount).toFixed(2)})`, 'success');
        // Refresh local views
        fetchStats();
        fetchAlerts();
        return normalizeTransaction(res.data.data);
      }
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to add transaction', 'danger');
      throw err;
    }
  };

  const editTransaction = async (id, txData) => {
    try {
      const res = await api.put(`/transactions/${id}`, txData);
      if (res.data.success) {
        addNotification(`Updated transaction: ${txData.description}`, 'success');
        fetchStats();
        fetchAlerts();
        return normalizeTransaction(res.data.data);
      }
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to update transaction', 'danger');
      throw err;
    }
  };

  const deleteTransaction = async (id, description) => {
    try {
      const res = await api.delete(`/transactions/${id}`);
      if (res.data.success) {
        addNotification(`Deleted transaction: ${description}`, 'warning');
        fetchStats();
        fetchAlerts();
        return true;
      }
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to delete transaction', 'danger');
      return false;
    }
  };

  // --- BUDGETS ---
  const fetchBudget = useCallback(async (month) => {
    setLoadingBudget(true);
    try {
      const res = await api.get(`/budgets/${month}`);
      if (res.data.success) {
        setActiveBudget(normalizeBudget(res.data.data));
      }
    } catch (err) {
      console.error('Fetch budget failed:', err.message);
    } finally {
      setLoadingBudget(false);
    }
  }, []);

  const updateBudget = async (month, budgetData) => {
    try {
      const res = await api.put(`/budgets/${month}`, budgetData);
      if (res.data.success) {
        setActiveBudget(normalizeBudget(res.data.data));
        addNotification('Monthly budget rules updated successfully!', 'success');
        fetchAlerts();
        return normalizeBudget(res.data.data);
      }
    } catch (err) {
      addNotification('Failed to save budget settings', 'danger');
      throw err;
    }
  };

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/budgets/alerts/status');
      if (res.data.success) {
        setAlerts(res.data.alerts);
      }
    } catch (err) {
      console.error('Fetch alerts failed:', err.message);
    }
  }, []);

  // --- GOALS ---
  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true);
    try {
      const res = await api.get('/goals');
      if (res.data.success) {
        setGoals(res.data.data.map(normalizeGoal));
      }
    } catch (err) {
      console.error('Fetch goals failed:', err.message);
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  const addGoal = async (goalData) => {
    try {
      const res = await api.post('/goals', goalData);
      if (res.data.success) {
        addNotification(`New Goal: "${goalData.name}" created successfully!`, 'success');
        fetchGoals();
        return normalizeGoal(res.data.data);
      }
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to create goal', 'danger');
      throw err;
    }
  };

  const contributeGoal = async (id, amount, goalName) => {
    try {
      const res = await api.post(`/goals/${id}/contribute`, { amount });
      if (res.data.success) {
        const { completed, message } = res.data;
        addNotification(message, completed ? 'success' : 'info');
        
        fetchGoals();
        fetchStats();
        fetchAlerts();
        
        return completed; // Passes boolean back to component so it can trigger confetti
      }
    } catch (err) {
      addNotification(err.response?.data?.error || 'Savings contribution failed', 'danger');
      throw err;
    }
  };

  const deleteGoal = async (id, name) => {
    try {
      const res = await api.delete(`/goals/${id}`);
      if (res.data.success) {
        addNotification(`Removed goal "${name}"`, 'warning');
        fetchGoals();
        return true;
      }
    } catch (err) {
      addNotification(err.response?.data?.error || 'Failed to delete goal', 'danger');
      return false;
    }
  };

  // --- AUDIT HISTORY ---
  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.get('/activities');
      if (res.data.success) {
        setActivities(res.data.data.map(normalizeActivity));
      }
    } catch (err) {
      console.error('Fetch activities failed:', err.message);
    }
  }, []);

  const clearActivities = async () => {
    try {
      const res = await api.delete('/activities');
      if (res.data.success) {
        addNotification('Activity audit trail logs wiped successfully.', 'warning');
        fetchActivities();
        return true;
      }
    } catch (err) {
      addNotification('Failed to clear logs', 'danger');
      return false;
    }
  };

  // --- SEED TRIGGER ---
  const seedDemoLedger = async (userId) => {
    setLoadingStats(true);
    setLoadingTransactions(true);
    try {
      const res = await api.post('/seed', { userId });
      if (res.data.success) {
        addNotification('Dynamic demo data seeded successfully!', 'success');
        // Mass-refresh all contexts
        await fetchStats();
        await fetchAlerts();
        await fetchGoals();
        await fetchBudget(new Date().toISOString().substring(0, 7));
        return true;
      }
    } catch (err) {
      addNotification('Database seeding encountered an error', 'danger');
      return false;
    } finally {
      setLoadingStats(false);
      setLoadingTransactions(false);
    }
  };

  return (
    <BudgetContext.Provider value={{
      transactions,
      pagination,
      stats,
      activeBudget,
      alerts,
      goals,
      activities,
      notifications,
      loadingTransactions,
      loadingStats,
      loadingGoals,
      loadingBudget,
      addNotification,
      dismissNotification: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      fetchStats,
      fetchTransactions,
      addTransaction,
      editTransaction,
      deleteTransaction,
      fetchBudget,
      updateBudget,
      fetchAlerts,
      fetchGoals,
      addGoal,
      contributeGoal,
      deleteGoal,
      fetchActivities,
      clearActivities,
      seedDemoLedger
    }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => useContext(BudgetContext);
