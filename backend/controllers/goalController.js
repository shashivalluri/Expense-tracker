const Goal = require('../models/Goal');
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

// @desc    Get all user goals
// @route   GET /api/goals
// @access  Private
exports.getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user_id: req.user._id }).sort({ created_at: -1 });
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

    const goal = await Goal.create({
      user_id: req.user._id,
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: 0,
      deadline_date: new Date(deadlineDate),
      category: category || 'General',
      notes: notes || '',
    });

    await logActivity(
      req.user._id,
      'CREATE_GOAL',
      `Created financial goal "${name}" with target $${parseFloat(targetAmount).toFixed(2)}`,
      req
    );

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

    const existingGoal = await Goal.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!existingGoal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (targetAmount !== undefined) updateData.target_amount = parseFloat(targetAmount);
    if (currentAmount !== undefined) updateData.current_amount = parseFloat(currentAmount);
    if (deadlineDate !== undefined) updateData.deadline_date = new Date(deadlineDate);
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;

    const updatedGoal = await Goal.findByIdAndUpdate(req.params.id, updateData, { new: true });

    await logActivity(
      req.user._id,
      'UPDATE_GOAL',
      `Updated details for savings goal "${updatedGoal.name}"`,
      req
    );

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
    const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    await Goal.findByIdAndDelete(req.params.id);

    await logActivity(req.user._id, 'DELETE_GOAL', `Removed financial goal "${goal.name}"`, req);

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
    const userId = req.user._id;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Please provide a valid contribution amount greater than zero' });
    }

    const contribution = parseFloat(amount);

    const goal = await Goal.findOne({ _id: req.params.id, user_id: userId });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const newSavingsAmount = parseFloat(goal.current_amount || 0) + contribution;
    const completed = newSavingsAmount >= goal.target_amount;

    const updatedGoal = await Goal.findByIdAndUpdate(
      req.params.id,
      { current_amount: newSavingsAmount },
      { new: true }
    );

    await Transaction.create({
      user_id: userId,
      type: 'expense',
      amount: contribution,
      category: 'Savings',
      date: new Date(),
      description: `Savings Contribution: ${goal.name}`,
      note: `Added funds to financial goal: ${goal.name}. Previous savings: $${goal.current_amount.toFixed(2)}. New savings: $${newSavingsAmount.toFixed(2)}.`,
    });

    await logActivity(
      userId,
      'GOAL_CONTRIBUTION',
      `Contributed $${contribution.toFixed(2)} to savings plan "${goal.name}". Progress: $${newSavingsAmount.toFixed(2)} / $${goal.target_amount.toFixed(2)}`,
      req
    );

    res.status(200).json({
      success: true,
      data: updatedGoal,
      completed,
      message: completed
        ? `CONGRATULATIONS! You have fully achieved your "${goal.name}" financial target!`
        : `Successfully contributed $${contribution.toFixed(2)} to "${goal.name}"!`,
    });
  } catch (error) {
    next(error);
  }
};
