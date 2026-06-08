const mongoose = require('mongoose');
const Goal = require('../models/Goal');
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

// @desc    Get all user goals
// @route   GET /api/goals
// @access  Private
exports.getGoals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dbConnected = mongoose.connection.readyState === 1;
    let goals = [];

    if (dbConnected) {
      goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    } else {
      goals = mockStorage.goals.find({ userId });
      goals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
exports.createGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, deadlineDate, category, notes } = req.body;

    if (!name || !targetAmount || !deadlineDate) {
      return res.status(400).json({ success: false, error: 'Please provide name, target amount and a deadline' });
    }

    const goalData = {
      userId: req.user.id,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      deadlineDate: new Date(deadlineDate),
      category: category || 'General',
      notes: notes || ''
    };

    const dbConnected = mongoose.connection.readyState === 1;
    let goal;

    if (dbConnected) {
      goal = await Goal.create(goalData);
    } else {
      goal = mockStorage.goals.create(goalData);
    }

    await logActivity(req.user.id, 'CREATE_GOAL', `Created financial goal "${name}" with target $${parseFloat(targetAmount).toFixed(2)}`, req);

    res.status(201).json({ success: true, data: goal });

  } catch (error) {
    next(error);
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, deadlineDate, category, notes } = req.body;
    const dbConnected = mongoose.connection.readyState === 1;
    let goal;

    if (dbConnected) {
      goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    } else {
      goal = mockStorage.goals.findById(req.params.id);
    }

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const updateData = {
      name: name || goal.name,
      targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : goal.targetAmount,
      currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : goal.currentAmount,
      deadlineDate: deadlineDate ? new Date(deadlineDate) : goal.deadlineDate,
      category: category || goal.category,
      notes: notes !== undefined ? notes : goal.notes
    };

    let updatedGoal;
    if (dbConnected) {
      updatedGoal = await Goal.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    } else {
      updatedGoal = mockStorage.goals.findByIdAndUpdate(req.params.id, updateData);
    }

    await logActivity(req.user.id, 'UPDATE_GOAL', `Updated details for savings goal "${updatedGoal.name}"`, req);

    res.status(200).json({ success: true, data: updatedGoal });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
exports.deleteGoal = async (req, res, next) => {
  try {
    const dbConnected = mongoose.connection.readyState === 1;
    let goal;

    if (dbConnected) {
      goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    } else {
      goal = mockStorage.goals.findById(req.params.id);
    }

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    if (dbConnected) {
      await Goal.findByIdAndDelete(req.params.id);
    } else {
      mockStorage.goals.findByIdAndDelete(req.params.id);
    }

    await logActivity(req.user.id, 'DELETE_GOAL', `Removed financial goal "${goal.name}"`, req);

    res.status(200).json({ success: true, message: 'Goal deleted successfully' });

  } catch (error) {
    next(error);
  }
};

// @desc    Contribute to goal savings
// @route   POST /api/goals/:id/contribute
// @access  Private
exports.contributeToGoal = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Please provide a valid contribution amount greater than zero' });
    }

    const contribution = parseFloat(amount);
    const dbConnected = mongoose.connection.readyState === 1;
    let goal;

    if (dbConnected) {
      goal = await Goal.findOne({ _id: req.params.id, userId });
    } else {
      goal = mockStorage.goals.findById(req.params.id);
    }

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    // 1. Calculate new savings balance
    const newSavingsAmount = parseFloat(goal.currentAmount || 0) + contribution;
    const completed = newSavingsAmount >= goal.targetAmount;

    let updatedGoal;
    if (dbConnected) {
      updatedGoal = await Goal.findByIdAndUpdate(
        req.params.id,
        { currentAmount: newSavingsAmount },
        { new: true }
      );
    } else {
      updatedGoal = mockStorage.goals.findByIdAndUpdate(req.params.id, {
        currentAmount: newSavingsAmount
      });
    }

    // 2. Automatically log an 'expense' representing money moved into dedicated savings
    // In category 'Savings' which is a standard financial category
    const transactionData = {
      userId,
      type: 'expense',
      amount: contribution,
      category: 'Savings',
      date: new Date(),
      description: `Savings Contribution: ${goal.name}`,
      note: `Added funds to financial goal: ${goal.name}. Previous savings: $${goal.currentAmount.toFixed(2)}. New savings: $${newSavingsAmount.toFixed(2)}.`
    };

    if (dbConnected) {
      await Transaction.create(transactionData);
    } else {
      mockStorage.transactions.create(transactionData);
    }

    // 3. Log user activity
    await logActivity(
      userId,
      'GOAL_CONTRIBUTION',
      `Contributed $${contribution.toFixed(2)} to savings plan "${goal.name}". Progress: $${newSavingsAmount.toFixed(2)} / $${goal.targetAmount.toFixed(2)}`,
      req
    );

    res.status(200).json({
      success: true,
      data: updatedGoal,
      completed, // Boolean passed back to user to trigger confetti animation!
      message: completed 
        ? `CONGRATULATIONS! You have fully achieved your "${goal.name}" financial target!`
        : `Successfully contributed $${contribution.toFixed(2)} to "${goal.name}"!`
    });

  } catch (error) {
    next(error);
  }
};
