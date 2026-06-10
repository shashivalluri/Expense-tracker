const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');

// Helper to log user activities
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

// Helper to calculate next recurring date
const calculateNextDate = (currentDate, interval) => {
  const date = new Date(currentDate);
  if (interval === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (interval === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (interval === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (interval === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
};

// @desc    Process outstanding recurring transactions
const checkAndProcessRecurrences = async (userId) => {
  const now = new Date();
  try {
    const recurringList = await Transaction.find({
      user_id: userId,
      is_recurring: true,
      recurrence_interval: { $ne: 'none' },
      next_occurrence: { $lte: now },
    });

    for (let item of recurringList) {
      if (!item.next_occurrence) continue;
      let currentNextDate = new Date(item.next_occurrence);

      while (currentNextDate <= now) {
        await Transaction.create({
          user_id: item.user_id,
          type: item.type,
          amount: item.amount,
          category: item.category,
          date: currentNextDate,
          description: `${item.description} (Recurring)`,
          note: item.note || 'Generated automatically by recurring tracker',
          is_recurring: false,
          recurrence_interval: 'none',
        });

        await logActivity(
          userId,
          'RECURRING_TRIGGER',
          `Recurring ${item.type} "${item.description}" of $${item.amount} triggered for date ${currentNextDate.toDateString()}`
        );

        currentNextDate = calculateNextDate(currentNextDate, item.recurrence_interval);
      }

      await Transaction.findByIdAndUpdate(item._id, { next_occurrence: currentNextDate });
    }
  } catch (error) {
    console.error('Error processing recurring items:', error.message);
  }
};

// @desc    Get user transactions with sorting, filtering, searching and pagination
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await checkAndProcessRecurrences(userId);

    const { type, category, startDate, endDate, q, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = { user_id: userId };

    if (type) filter.type = type;
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (q) {
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { note: { $regex: q, $options: 'i' } },
      ];
    }

    const totalItems = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limitNum);
    const skip = (pageNum - 1) * limitNum;

    const transactions = await Transaction.find(filter)
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, date, description, note, isRecurring, recurrenceInterval } = req.body;

    if (!type || !amount || !category || !description) {
      return res.status(400).json({ success: false, error: 'Please provide type, amount, category and description' });
    }

    const transactionData = {
      user_id: req.user._id,
      type,
      amount: parseFloat(amount),
      category,
      date: date ? new Date(date) : new Date(),
      description,
      note: note || '',
      is_recurring: isRecurring || false,
      recurrence_interval: recurrenceInterval || 'none',
    };

    if (transactionData.is_recurring && transactionData.recurrence_interval !== 'none') {
      transactionData.next_occurrence = calculateNextDate(transactionData.date, transactionData.recurrence_interval);
    }

    const transaction = await Transaction.create(transactionData);

    await logActivity(
      req.user._id,
      'CREATE_TRANSACTION',
      `Added ${type} "${description}" of $${parseFloat(amount).toFixed(2)} inside category ${category}`,
      req
    );

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res, next) => {
  try {
    const { amount, category, date, description, note, isRecurring, recurrenceInterval } = req.body;

    const existingTransaction = await Transaction.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!existingTransaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description;
    if (note !== undefined) updateData.note = note;
    if (isRecurring !== undefined) updateData.is_recurring = isRecurring;
    if (recurrenceInterval !== undefined) updateData.recurrence_interval = recurrenceInterval;

    // Recurrence logic
    const finalDate = date ? new Date(date) : existingTransaction.date;
    const finalRecurring = isRecurring !== undefined ? isRecurring : existingTransaction.is_recurring;
    const finalInterval = recurrenceInterval || existingTransaction.recurrence_interval;

    if (finalRecurring && finalInterval !== 'none') {
      updateData.next_occurrence = calculateNextDate(finalDate, finalInterval);
    } else if (!finalRecurring) {
      updateData.next_occurrence = null;
      updateData.recurrence_interval = 'none';
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    await logActivity(
      req.user._id,
      'UPDATE_TRANSACTION',
      `Modified transaction "${updatedTransaction.description}" to $${updatedTransaction.amount.toFixed(2)}`,
      req
    );

    res.status(200).json({ success: true, data: updatedTransaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    await Transaction.findByIdAndDelete(req.params.id);

    await logActivity(
      req.user._id,
      'DELETE_TRANSACTION',
      `Removed ${transaction.type} transaction "${transaction.description}" of $${transaction.amount.toFixed(2)}`,
      req
    );

    res.status(200).json({ success: true, message: 'Transaction removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
exports.getTransactionStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await checkAndProcessRecurrences(userId);

    const allTransactions = await Transaction.find({ user_id: userId });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    allTransactions.forEach((t) => {
      if (new Date(t.date) > new Date()) return;

      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        totalIncome += amount;
      } else if (t.type === 'expense') {
        totalExpense += amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
      }
    });

    const totalBalance = totalIncome - totalExpense;
    const totalSavings = totalIncome > 0 ? Math.max(0, totalIncome - totalExpense) : 0;
    const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

    const categoryBreakdown = Object.keys(categoryTotals)
      .map((category) => ({
        name: category,
        value: Math.round(categoryTotals[category] * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    const monthlyTrendMap = {};
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrendMap[key] = {
        monthKey: key,
        name: `${monthsName[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`,
        income: 0,
        expense: 0,
        net: 0,
      };
    }

    allTransactions.forEach((t) => {
      const tDate = new Date(t.date);
      const key = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendMap[key]) {
        const amount = parseFloat(t.amount);
        if (t.type === 'income') monthlyTrendMap[key].income += amount;
        else if (t.type === 'expense') monthlyTrendMap[key].expense += amount;
      }
    });

    const monthlyTrends = Object.values(monthlyTrendMap).map((item) => {
      item.income = Math.round(item.income * 100) / 100;
      item.expense = Math.round(item.expense * 100) / 100;
      item.net = Math.round((item.income - item.expense) * 100) / 100;
      return item;
    });

    const activeRecurringBills = allTransactions.filter((t) => t.is_recurring);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBalance: Math.round(totalBalance * 100) / 100,
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpense: Math.round(totalExpense * 100) / 100,
          totalSavings: Math.round(totalSavings * 100) / 100,
          savingsRate,
        },
        categoryBreakdown,
        monthlyTrends,
        activeRecurringCount: activeRecurringBills.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
