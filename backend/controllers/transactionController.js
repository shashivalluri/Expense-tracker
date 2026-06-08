const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const mockStorage = require('../utils/mockStorage');

// Helper to log user activities
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

// Helper to calculate next recurring date
const calculateNextDate = (currentDate, interval) => {
  const date = new Date(currentDate);
  if (interval === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (interval === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (interval === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
};

// @desc    Process outstanding recurring transactions
// Runs transparently when user fetches dashboard or transaction list
const checkAndProcessRecurrences = async (userId) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const now = new Date();

  try {
    if (dbConnected) {
      const recurringList = await Transaction.find({
        userId,
        isRecurring: true,
        recurrenceInterval: { $ne: 'none' },
        nextOccurrenceDate: { $lte: now }
      });

      for (let item of recurringList) {
        let currentNextDate = new Date(item.nextOccurrenceDate);
        
        while (currentNextDate <= now) {
          // 1. Create a new transaction representing this recurrence cycle
          await Transaction.create({
            userId: item.userId,
            type: item.type,
            amount: item.amount,
            category: item.category,
            date: currentNextDate,
            description: `${item.description} (Recurring)`,
            note: item.note || 'Generated automatically by recurring tracker',
            isRecurring: false,
            originalRecurringId: item._id
          });

          // Log the event
          await logActivity(userId, 'RECURRING_TRIGGER', `Recurring ${item.type} "${item.description}" of $${item.amount} triggered for date ${currentNextDate.toDateString()}`);

          // Advance date
          currentNextDate = calculateNextDate(currentNextDate, item.recurrenceInterval);
        }

        // 2. Update the parent transaction's nextOccurrenceDate
        item.nextOccurrenceDate = currentNextDate;
        await item.save();
      }
    } else {
      // Mock mode
      const transactions = mockStorage.transactions.find({ userId });
      const recurringList = transactions.filter(t => 
        t.isRecurring && 
        t.recurrenceInterval !== 'none' && 
        t.nextOccurrenceDate && 
        new Date(t.nextOccurrenceDate) <= now
      );

      for (let item of recurringList) {
        let currentNextDate = new Date(item.nextOccurrenceDate);

        while (currentNextDate <= now) {
          // Create new record
          mockStorage.transactions.create({
            userId: item.userId,
            type: item.type,
            amount: item.amount,
            category: item.category,
            date: currentNextDate.toISOString(),
            description: `${item.description} (Recurring)`,
            note: item.note || 'Generated automatically by recurring tracker',
            isRecurring: false,
            originalRecurringId: item._id
          });

          logActivity(userId, 'RECURRING_TRIGGER', `Recurring ${item.type} "${item.description}" of $${item.amount} triggered for date ${currentNextDate.toDateString()}`);

          currentNextDate = calculateNextDate(currentNextDate, item.recurrenceInterval);
        }

        // Update original item
        mockStorage.transactions.findByIdAndUpdate(item._id, {
          nextOccurrenceDate: currentNextDate.toISOString()
        });
      }
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
    const userId = req.user.id;

    // Trigger recurring engine first to update data
    await checkAndProcessRecurrences(userId);

    const { type, category, startDate, endDate, q, page = 1, limit = 10 } = req.query;
    const dbConnected = mongoose.connection.readyState === 1;

    let responseData = {
      transactions: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        totalItems: 0
      }
    };

    if (dbConnected) {
      // Build query object
      let query = { userId };

      if (type) query.type = type;
      if (category) query.category = category;

      // Date range filtering
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      // Text search query
      if (q) {
        query.$or = [
          { description: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { note: { $regex: q, $options: 'i' } }
        ];
      }

      const totalItems = await Transaction.countDocuments(query);
      const totalPages = Math.ceil(totalItems / limit);
      const skip = (page - 1) * limit;

      const transactions = await Transaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      responseData.transactions = transactions;
      responseData.pagination.totalItems = totalItems;
      responseData.pagination.totalPages = totalPages;

    } else {
      // Offline fallback
      let list = mockStorage.transactions.find({ userId });

      // Apply type filter
      if (type) {
        list = list.filter(t => t.type === type);
      }

      // Apply category filter
      if (category) {
        list = list.filter(t => t.category.toLowerCase() === category.toLowerCase());
      }

      // Apply date filter
      if (startDate) {
        list = list.filter(t => new Date(t.date) >= new Date(startDate));
      }
      if (endDate) {
        list = list.filter(t => new Date(t.date) <= new Date(endDate));
      }

      // Apply text search
      if (q) {
        const queryLower = q.toLowerCase();
        list = list.filter(t => 
          t.description.toLowerCase().includes(queryLower) ||
          t.category.toLowerCase().includes(queryLower) ||
          (t.note && t.note.toLowerCase().includes(queryLower))
        );
      }

      // Sort by date descending
      list.sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalItems = list.length;
      const totalPages = Math.ceil(totalItems / limit);
      const skip = (page - 1) * limit;

      responseData.transactions = list.slice(skip, skip + parseInt(limit));
      responseData.pagination.totalItems = totalItems;
      responseData.pagination.totalPages = totalPages;
    }

    res.status(200).json({
      success: true,
      data: responseData.transactions,
      pagination: responseData.pagination
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
    const dbConnected = mongoose.connection.readyState === 1;
    let transaction;

    if (dbConnected) {
      transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    } else {
      transaction = mockStorage.transactions.findById(req.params.id);
    }

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
      userId: req.user.id,
      type,
      amount: parseFloat(amount),
      category,
      date: date ? new Date(date) : new Date(),
      description,
      note: note || '',
      isRecurring: isRecurring || false,
      recurrenceInterval: recurrenceInterval || 'none'
    };

    // If recurring, determine next execution
    if (transactionData.isRecurring && transactionData.recurrenceInterval !== 'none') {
      transactionData.nextOccurrenceDate = calculateNextDate(transactionData.date, transactionData.recurrenceInterval);
    }

    const dbConnected = mongoose.connection.readyState === 1;
    let transaction;

    if (dbConnected) {
      transaction = await Transaction.create(transactionData);
    } else {
      transaction = mockStorage.transactions.create(transactionData);
    }

    await logActivity(
      req.user.id,
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
    const dbConnected = mongoose.connection.readyState === 1;
    let transaction;

    if (dbConnected) {
      transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    } else {
      transaction = mockStorage.transactions.findById(req.params.id);
    }

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const updateData = {
      amount: amount ? parseFloat(amount) : transaction.amount,
      category: category || transaction.category,
      date: date ? new Date(date) : transaction.date,
      description: description || transaction.description,
      note: note !== undefined ? note : transaction.note,
      isRecurring: isRecurring !== undefined ? isRecurring : transaction.isRecurring,
      recurrenceInterval: recurrenceInterval || transaction.recurrenceInterval
    };

    // If recurrence was changed
    if (updateData.isRecurring && updateData.recurrenceInterval !== 'none') {
      updateData.nextOccurrenceDate = calculateNextDate(updateData.date, updateData.recurrenceInterval);
    } else if (!updateData.isRecurring) {
      updateData.nextOccurrenceDate = undefined;
      updateData.recurrenceInterval = 'none';
    }

    let updatedTransaction;
    if (dbConnected) {
      updatedTransaction = await Transaction.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    } else {
      updatedTransaction = mockStorage.transactions.findByIdAndUpdate(req.params.id, updateData);
    }

    await logActivity(
      req.user.id,
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
    const dbConnected = mongoose.connection.readyState === 1;
    let transaction;

    if (dbConnected) {
      transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    } else {
      transaction = mockStorage.transactions.findById(req.params.id);
    }

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (dbConnected) {
      await Transaction.findByIdAndDelete(req.params.id);
    } else {
      mockStorage.transactions.findByIdAndDelete(req.params.id);
    }

    await logActivity(
      req.user.id,
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
    const userId = req.user.id;
    const dbConnected = mongoose.connection.readyState === 1;

    // Trigger recurring items update
    await checkAndProcessRecurrences(userId);

    let allTransactions = [];

    if (dbConnected) {
      allTransactions = await Transaction.find({ userId });
    } else {
      allTransactions = mockStorage.transactions.find({ userId });
    }

    // Calculations
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    allTransactions.forEach(t => {
      // Only include active history, filter out parents of active recurrences if they are post-dated
      if (new Date(t.date) > new Date()) {
        return; // Ignore future transactions
      }
      
      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        totalIncome += amount;
      } else if (t.type === 'expense') {
        totalExpense += amount;
        // Group expenses by category
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
      }
    });

    const totalBalance = totalIncome - totalExpense;
    const totalSavings = totalIncome > 0 ? Math.max(0, totalIncome - totalExpense) : 0;
    const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

    // Build category chart array
    const categoryBreakdown = Object.keys(categoryTotals).map(category => ({
      name: category,
      value: Math.round(categoryTotals[category] * 100) / 100
    })).sort((a, b) => b.value - a.value);

    // Build monthly trend array (for line/bar charts in analytics)
    // Gather statistics for the last 6 months
    const monthlyTrendMap = {};
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrendMap[key] = {
        monthKey: key,
        name: `${monthsName[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`,
        income: 0,
        expense: 0,
        net: 0
      };
    }

    allTransactions.forEach(t => {
      const tDate = new Date(t.date);
      const key = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyTrendMap[key]) {
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
          monthlyTrendMap[key].income += amount;
        } else if (t.type === 'expense') {
          monthlyTrendMap[key].expense += amount;
        }
      }
    });

    const monthlyTrends = Object.values(monthlyTrendMap).map(item => {
      item.income = Math.round(item.income * 100) / 100;
      item.expense = Math.round(item.expense * 100) / 100;
      item.net = Math.round((item.income - item.expense) * 100) / 100;
      return item;
    });

    // Get active recurring bills list
    let activeRecurringBills = [];
    if (dbConnected) {
      activeRecurringBills = await Transaction.find({ userId, isRecurring: true });
    } else {
      activeRecurringBills = mockStorage.transactions.find({ userId }).filter(t => t.isRecurring);
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBalance: Math.round(totalBalance * 100) / 100,
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpense: Math.round(totalExpense * 100) / 100,
          totalSavings: Math.round(totalSavings * 100) / 100,
          savingsRate
        },
        categoryBreakdown,
        monthlyTrends,
        activeRecurringCount: activeRecurringBills.length
      }
    });

  } catch (error) {
    next(error);
  }
};
