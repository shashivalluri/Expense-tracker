const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const mockStorage = require('../utils/mockStorage');

const logActivity = async (userId, actionType, description, req) => {
  const ipAddress = req ? (req.ip || req.connection.remoteAddress || '127.0.0.1') : '127.0.0.1';
  const dbConnected = mongoose.connection.readyState === 1;
  try {
    if (dbConnected) {
      await ActivityLog.create({ userId, actionType, description, ipAddress });
    } else {
      mockStorage.activitylogs.create({ userId, actionType, description, ipAddress });
    }
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
};

// @desc    Get user budget for a specific month (YYYY-MM)
// @route   GET /api/budgets/:month
// @access  Private
exports.getBudget = async (req, res, next) => {
  try {
    const { month } = req.params; // e.g. "2026-06"
    const userId = req.user.id;
    const dbConnected = mongoose.connection.readyState === 1;

    let budget;

    if (dbConnected) {
      budget = await Budget.findOne({ userId, month });
      
      // If no budget exists for this month, instantiate a new default one based on general defaults
      if (!budget) {
        budget = await Budget.create({
          userId,
          month,
          totalLimit: 2000,
          categoryLimits: {
            Food: 500,
            Utilities: 300,
            Entertainment: 200,
            Transportation: 200,
            Shopping: 400,
            Others: 400
          }
        });
        await logActivity(userId, 'CREATE_BUDGET', `Auto-initialized budget limit of $2000 for month ${month}`);
      }
    } else {
      budget = mockStorage.budgets.findOne({ userId, month });
      
      if (!budget) {
        budget = mockStorage.budgets.create({
          userId,
          month,
          totalLimit: 2000,
          categoryLimits: {
            Food: 500,
            Utilities: 300,
            Entertainment: 200,
            Transportation: 200,
            Shopping: 400,
            Others: 400
          }
        });
        logActivity(userId, 'CREATE_BUDGET', `Auto-initialized budget limit of $2000 for month ${month}`);
      }
    }

    res.status(200).json({ success: true, data: budget });

  } catch (error) {
    next(error);
  }
};

// @desc    Update monthly budget
// @route   PUT /api/budgets/:month
// @access  Private
exports.updateBudget = async (req, res, next) => {
  try {
    const { month } = req.params;
    const { totalLimit, categoryLimits } = req.body;
    const userId = req.user.id;
    const dbConnected = mongoose.connection.readyState === 1;

    let budget;

    if (dbConnected) {
      budget = await Budget.findOne({ userId, month });
    } else {
      budget = mockStorage.budgets.findOne({ userId, month });
    }

    if (!budget) {
      // Create one if it didn't exist somehow
      const createData = {
        userId,
        month,
        totalLimit: totalLimit !== undefined ? parseFloat(totalLimit) : 2000,
        categoryLimits: categoryLimits || {}
      };

      if (dbConnected) {
        budget = await Budget.create(createData);
      } else {
        budget = mockStorage.budgets.create(createData);
      }
    } else {
      // Update existing
      const updateData = {
        totalLimit: totalLimit !== undefined ? parseFloat(totalLimit) : budget.totalLimit,
        categoryLimits: categoryLimits || (dbConnected ? budget.categoryLimits : budget.categoryLimits || {})
      };

      if (dbConnected) {
        budget = await Budget.findByIdAndUpdate(budget._id, updateData, { new: true, runValidators: true });
      } else {
        budget = mockStorage.budgets.findByIdAndUpdate(budget._id, updateData);
      }
    }

    await logActivity(userId, 'UPDATE_BUDGET', `Updated monthly budget limit to $${budget.totalLimit.toFixed(2)} for ${month}`, req);

    res.status(200).json({ success: true, data: budget });

  } catch (error) {
    next(error);
  }
};

// @desc    Get real-time overspending alerts for the current month
// @route   GET /api/budgets/alerts/status
// @access  Private
exports.getBudgetAlerts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const dbConnected = mongoose.connection.readyState === 1;

    // 1. Fetch current month's budget details
    let budget;
    if (dbConnected) {
      budget = await Budget.findOne({ userId, month: currentMonth });
    } else {
      budget = mockStorage.budgets.findOne({ userId, month: currentMonth });
    }

    if (!budget) {
      return res.status(200).json({ success: true, alerts: [], totalSpent: 0, budgetLimit: 0 });
    }

    // 2. Fetch all transactions for this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    let thisMonthTransactions = [];

    if (dbConnected) {
      thisMonthTransactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });
    } else {
      thisMonthTransactions = mockStorage.transactions.find({ userId })
        .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth);
    }

    // 3. Summarize spends per category and in total
    let totalSpent = 0;
    const categorySpends = {};

    thisMonthTransactions.forEach(t => {
      const amt = parseFloat(t.amount);
      totalSpent += amt;
      categorySpends[t.category] = (categorySpends[t.category] || 0) + amt;
    });

    const alerts = [];

    // Check overall total limit overspending
    const totalPercentage = budget.totalLimit > 0 ? (totalSpent / budget.totalLimit) * 100 : 0;
    if (totalPercentage >= 80) {
      alerts.push({
        category: 'All Categories',
        limit: budget.totalLimit,
        spent: totalSpent,
        percentage: Math.round(totalPercentage),
        alertType: totalPercentage >= 100 ? 'danger' : 'warning',
        message: totalPercentage >= 100 
          ? `CRITICAL: You have exceeded your total monthly budget of $${budget.totalLimit}!`
          : `WARNING: You have spent ${Math.round(totalPercentage)}% of your total monthly budget of $${budget.totalLimit}!`
      });
    }

    // Check category limits
    // Mongoose maps must be accessed via .get() or .entries() in Mongo, in mock JSON they are raw objects
    const catLimits = dbConnected ? Object.fromEntries(budget.categoryLimits || new Map()) : budget.categoryLimits || {};

    Object.keys(catLimits).forEach(category => {
      const limit = parseFloat(catLimits[category]);
      const spent = categorySpends[category] || 0;
      
      if (limit > 0) {
        const percentage = (spent / limit) * 100;
        if (percentage >= 80) {
          alerts.push({
            category,
            limit,
            spent,
            percentage: Math.round(percentage),
            alertType: percentage >= 100 ? 'danger' : 'warning',
            message: percentage >= 100
              ? `CRITICAL: You have exceeded your "${category}" budget limit ($${limit} spent: $${spent.toFixed(2)})!`
              : `WARNING: You have consumed ${Math.round(percentage)}% of your "${category}" budget limit ($${limit} spent: $${spent.toFixed(2)})!`
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      alerts,
      totalSpent: Math.round(totalSpent * 100) / 100,
      budgetLimit: budget.totalLimit,
      categorySpends
    });

  } catch (error) {
    next(error);
  }
};
