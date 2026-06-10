const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, actionType, description, req) => {
  const ipAddress = req ? (req.ip || req.connection?.remoteAddress || '127.0.0.1') : '127.0.0.1';
  try {
    await ActivityLog.create({
      user_id: userId,
      action_type: actionType,
      description,
      ip_address: ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
};

// @desc    Get user budget for a specific month (YYYY-MM)
// @route   GET /api/budgets/:month
// @access  Private
exports.getBudget = async (req, res, next) => {
  try {
    const { month } = req.params;
    const userId = req.user._id;

    let budget = await Budget.findOne({ user_id: userId, month });

    if (!budget) {
      budget = await Budget.create({
        user_id: userId,
        month,
        total_limit: 2000,
        category_limits: {
          Food: 500,
          Utilities: 300,
          Entertainment: 200,
          Transportation: 200,
          Shopping: 400,
          Others: 400,
        },
      });
      await logActivity(userId, 'CREATE_BUDGET', `Auto-initialized budget limit of $2000 for month ${month}`);
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
    const userId = req.user._id;

    let budget = await Budget.findOne({ user_id: userId, month });

    if (!budget) {
      budget = await Budget.create({
        user_id: userId,
        month,
        total_limit: totalLimit !== undefined ? parseFloat(totalLimit) : 2000,
        category_limits: categoryLimits || {},
      });
    } else {
      budget = await Budget.findByIdAndUpdate(
        budget._id,
        {
          total_limit: totalLimit !== undefined ? parseFloat(totalLimit) : budget.total_limit,
          category_limits: categoryLimits || budget.category_limits,
        },
        { new: true }
      );
    }

    await logActivity(
      userId,
      'UPDATE_BUDGET',
      `Updated monthly budget limit to $${budget.total_limit.toFixed(2)} for ${month}`,
      req
    );

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
    const userId = req.user._id;
    const currentMonth = new Date().toISOString().substring(0, 7);

    const budget = await Budget.findOne({ user_id: userId, month: currentMonth });

    if (!budget) {
      return res.status(200).json({ success: true, alerts: [], totalSpent: 0, budgetLimit: 0 });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const thisMonthTransactions = await Transaction.find({
      user_id: userId,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    let totalSpent = 0;
    const categorySpends = {};

    thisMonthTransactions.forEach((t) => {
      const amt = parseFloat(t.amount);
      totalSpent += amt;
      categorySpends[t.category] = (categorySpends[t.category] || 0) + amt;
    });

    const alerts = [];

    const totalPercentage = budget.total_limit > 0 ? (totalSpent / budget.total_limit) * 100 : 0;
    if (totalPercentage >= 80) {
      alerts.push({
        category: 'All Categories',
        limit: budget.total_limit,
        spent: totalSpent,
        percentage: Math.round(totalPercentage),
        alertType: totalPercentage >= 100 ? 'danger' : 'warning',
        message:
          totalPercentage >= 100
            ? `CRITICAL: You have exceeded your total monthly budget of $${budget.total_limit}!`
            : `WARNING: You have spent ${Math.round(totalPercentage)}% of your total monthly budget of $${budget.total_limit}!`,
      });
    }

    const catLimits = budget.category_limits || {};
    Object.keys(catLimits).forEach((category) => {
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
            message:
              percentage >= 100
                ? `CRITICAL: You have exceeded your "${category}" budget limit ($${limit} spent: $${spent.toFixed(2)})!`
                : `WARNING: You have consumed ${Math.round(percentage)}% of your "${category}" budget limit ($${limit} spent: $${spent.toFixed(2)})!`,
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      alerts,
      totalSpent: Math.round(totalSpent * 100) / 100,
      budgetLimit: budget.total_limit,
      categorySpends,
    });
  } catch (error) {
    next(error);
  }
};
