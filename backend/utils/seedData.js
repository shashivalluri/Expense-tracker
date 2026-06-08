const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const ActivityLog = require('../models/ActivityLog');
const mockStorage = require('../utils/mockStorage');

// Load environment variables if running directly
dotenv.config();

const categories = {
  income: ['Salary', 'Freelance', 'Investments', 'Refunds', 'Others'],
  expense: ['Food', 'Utilities', 'Entertainment', 'Transportation', 'Shopping', 'Savings', 'Others']
};

const seedData = async (targetUserId = null) => {
  const dbConnected = mongoose.connection.readyState === 1;
  console.log(`[Seeding] Seeding starting. Mode: ${dbConnected ? 'MongoDB Mongoose' : 'JSON Mock Storage'}`);

  let userId = targetUserId;
  let demoUser = null;

  // 1. Create or verify Demo User if no target specified
  if (!userId) {
    const demoEmail = 'demo@example.com';
    const demoPassword = 'password123';

    if (dbConnected) {
      // Find or create
      demoUser = await User.findOne({ email: demoEmail });
      if (!demoUser) {
        console.log('[Seeding] Creating demo user...');
        demoUser = await User.create({
          username: 'Demo User',
          email: demoEmail,
          password: demoPassword, // pre-save hook handles hashing
          settings: {
            currency: 'INR',
            theme: 'dark',
            language: 'en'
          }
        });
      }
      userId = demoUser._id.toString();
    } else {
      // Mock store
      demoUser = mockStorage.users.findOne({ email: demoEmail });
      if (!demoUser) {
        console.log('[Seeding] Creating demo user in mock storage...');
        demoUser = await mockStorage.users.create({
          username: 'Demo User',
          email: demoEmail,
          password: demoPassword,
          settings: {
            currency: 'INR',
            theme: 'dark',
            language: 'en'
          }
        });
      }
      userId = demoUser._id;
    }
  }

  console.log(`[Seeding] Injecting data for user: ${userId}`);

  // 2. Clear previous transactions, budgets, goals, and activity logs
  if (dbConnected) {
    await Transaction.deleteMany({ userId });
    await Budget.deleteMany({ userId });
    await Goal.deleteMany({ userId });
    await ActivityLog.deleteMany({ userId });
  } else {
    mockStorage.clearAll(userId);
  }

  // 3. Setup monthly Budgets for last month, this month, and next month
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  const budgetList = [
    {
      userId,
      month: lastMonthKey,
      totalLimit: 55000,
      categoryLimits: { Food: 12000, Utilities: 8000, Entertainment: 7000, Transportation: 6000, Shopping: 12000, Others: 10000 }
    },
    {
      userId,
      month: currentMonthKey,
      totalLimit: 50000,
      categoryLimits: { Food: 12000, Utilities: 8000, Entertainment: 5000, Transportation: 5000, Shopping: 10000, Others: 10000 }
    },
    {
      userId,
      month: nextMonthKey,
      totalLimit: 50000,
      categoryLimits: { Food: 12000, Utilities: 8000, Entertainment: 5000, Transportation: 5000, Shopping: 10000, Others: 10000 }
    }
  ];

  if (dbConnected) {
    await Budget.insertMany(budgetList);
  } else {
    budgetList.forEach(b => mockStorage.budgets.create(b));
  }

  // 4. Setup Savings Goals
  const targetGoals = [
    {
      userId,
      name: 'Emergency Fund',
      targetAmount: 300000,
      currentAmount: 120000,
      deadlineDate: new Date(today.getFullYear(), today.getMonth() + 6, 15),
      category: 'Savings',
      notes: '6 months of living expenses tucked away in a liquid savings account.'
    },
    {
      userId,
      name: 'Goa Beach Vacation',
      targetAmount: 60000,
      currentAmount: 18000,
      deadlineDate: new Date(today.getFullYear() + 1, 5, 20),
      category: 'Travel',
      notes: 'Flights, resort stay, food and activities for 10 days in North Goa.'
    },
    {
      userId,
      name: 'MacBook Pro M4',
      targetAmount: 180000,
      currentAmount: 140000,
      deadlineDate: new Date(today.getFullYear(), today.getMonth() + 2, 10),
      category: 'Electronics',
      notes: 'MacBook Pro 14" M4 Pro for design and development workspace.'
    }
  ];

  if (dbConnected) {
    await Goal.insertMany(targetGoals);
  } else {
    targetGoals.forEach(g => mockStorage.goals.create(g));
  }

  // 5. Generate historical transactions spanning the past 90 days
  const sampleTransactions = [];
  
  // Backdate loops
  for (let d = 90; d >= 0; d--) {
    const txDate = new Date();
    txDate.setDate(today.getDate() - d);
    const dayOfMonth = txDate.getDate();
    const dayOfWeek = txDate.getDay();

    // A. Monthly Recurring Items
    // 1st of month: Salary (₹75,000) & Rent payment (₹18,000)
    if (dayOfMonth === 1) {
      sampleTransactions.push({
        userId,
        type: 'income',
        amount: 75000,
        category: 'Salary',
        date: new Date(txDate),
        description: 'Monthly Salary Credited',
        note: 'Primary corporate employment bank deposit.'
      });

      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: 18000,
        category: 'Utilities',
        date: new Date(txDate),
        description: 'Apartment Monthly Rent',
        note: 'Monthly rent transfer to landlord.'
      });
    }

    // 5th of month: Internet Bill (₹999) & Gym Membership (₹1,499)
    if (dayOfMonth === 5) {
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: 999,
        category: 'Utilities',
        date: new Date(txDate),
        description: 'JioFiber Broadband Plan',
        note: 'Monthly high-speed fiber internet billing.'
      });

      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: 1499,
        category: 'Entertainment',
        date: new Date(txDate),
        description: 'Cult.fit Gym Membership',
        note: 'Monthly fitness center subscription.'
      });
    }

    // 15th of month: Mid-month Freelance Income (₹22,000)
    if (dayOfMonth === 15) {
      sampleTransactions.push({
        userId,
        type: 'income',
        amount: 22000,
        category: 'Freelance',
        date: new Date(txDate),
        description: 'UI/UX Design Freelance Project',
        note: 'Client payment for dashboard design contract.'
      });
    }

    // 25th of month: Streaming Subscriptions (₹649 Netflix, ₹119 Spotify)
    if (dayOfMonth === 25) {
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: 649,
        category: 'Entertainment',
        date: new Date(txDate),
        description: 'Netflix Premium Subscription',
        note: '4K Ultra HD family plan streaming.'
      });

      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: 119,
        category: 'Entertainment',
        date: new Date(txDate),
        description: 'Spotify Premium Streaming',
        note: 'Music streaming monthly fee.'
      });
    }

    // B. Daily/Weekly Transactions
    // 1. Food: Groceries twice a week (₹800–₹1,400), quick bites/cafe (₹80–₹300) every few days
    if (dayOfWeek === 2 || dayOfWeek === 6) {
      // Groceries
      const amt = Math.round((800 + Math.random() * 600) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Food',
        date: new Date(txDate),
        description: dayOfWeek === 2 ? 'BigBasket Grocery Order' : 'DMart Weekly Shopping',
        note: 'Weekly kitchen restocking.'
      });
    }

    if (dayOfMonth % 3 === 0) {
      // Cafe / quick bites
      const amt = Math.round((80 + Math.random() * 220) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Food',
        date: new Date(txDate),
        description: 'Cafe Coffee Day / Chai Point',
        note: 'Quick morning work fuel.'
      });
    }

    if (dayOfMonth % 4 === 1) {
      // Dining out
      const amt = Math.round((400 + Math.random() * 800) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Food',
        date: new Date(txDate),
        description: 'Zomato / Swiggy Restaurant Order',
        note: 'Evening dining or food delivery.'
      });
    }

    // 2. Transportation: Fuel (₹2,500–₹3,500) weekly, Ola/Uber rides (₹200–₹500) on Fri/Sat
    if (dayOfWeek === 1) {
      const amt = Math.round((2500 + Math.random() * 1000) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Transportation',
        date: new Date(txDate),
        description: 'BPCL Petrol Station',
        note: 'Vehicle fuel refill.'
      });
    }

    if ((dayOfWeek === 5 || dayOfWeek === 6) && dayOfMonth % 2 === 0) {
      const amt = Math.round((200 + Math.random() * 300) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Transportation',
        date: new Date(txDate),
        description: 'Ola / Uber Ride',
        note: 'Friday night cab ride.'
      });
    }

    // 3. Shopping & Entertainment: Online/weekend shopping (₹1,500–₹4,000) occasionally, movies (₹500–₹900)
    if (dayOfWeek === 0 && dayOfMonth % 6 === 0) {
      const amt = Math.round((1500 + Math.random() * 2500) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Shopping',
        date: new Date(txDate),
        description: 'Amazon / Flipkart Purchase',
        note: 'Household accessories and books.'
      });
    }

    if (dayOfWeek === 6 && dayOfMonth % 5 === 0) {
      const amt = Math.round((500 + Math.random() * 400) * 100) / 100;
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: amt,
        category: 'Entertainment',
        date: new Date(txDate),
        description: 'PVR / INOX Movie Night',
        note: 'Tickets, popcorn and beverages.'
      });
    }

    // 4. Savings contributions on the 10th and 20th
    if (dayOfMonth === 10 || dayOfMonth === 20) {
      sampleTransactions.push({
        userId,
        type: 'expense',
        amount: 5000,
        category: 'Savings',
        date: new Date(txDate),
        description: 'Savings Transfer: Emergency Fund',
        note: 'Regular scheduled savings deposit.'
      });
    }
  }

  // Recurring Netflix subscription entry
  const nextNetflixDate = new Date();
  nextNetflixDate.setDate(today.getDate() + 7);
  sampleTransactions.push({
    userId,
    type: 'expense',
    amount: 649,
    category: 'Entertainment',
    date: new Date(),
    description: 'Netflix Subscription Premium',
    note: 'Parent recurring subscription tracking.',
    isRecurring: true,
    recurrenceInterval: 'monthly',
    nextOccurrenceDate: nextNetflixDate
  });

  // Write transactions in batches
  if (dbConnected) {
    await Transaction.insertMany(sampleTransactions);
  } else {
    sampleTransactions.forEach(t => mockStorage.transactions.create(t));
  }

  // 6. Log historical activity seeds
  const sampleLogs = [
    { userId, actionType: 'REGISTER', description: 'Account created and initialized successfully.', timestamp: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000) },
    { userId, actionType: 'CREATE_BUDGET', description: 'Setup budget configuration: ₹50,000 total monthly limit.', timestamp: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000) },
    { userId, actionType: 'CREATE_GOAL', description: 'Defined saving targets: "Emergency Fund", "Goa Vacation", and "MacBook Pro M4".', timestamp: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000) },
    { userId, actionType: 'SEED_DATA', description: 'Injected 3 months of dynamic INR testing ledger history.', timestamp: new Date() }
  ];

  if (dbConnected) {
    await ActivityLog.insertMany(sampleLogs);
  } else {
    sampleLogs.forEach(l => mockStorage.activitylogs.create(l));
  }

  console.log(`[Seeding] Success! Injected ${sampleTransactions.length} transactions, ${budgetList.length} monthly budgets, ${targetGoals.length} savings goals, and audit trails.`);
  return {
    success: true,
    userEmail: 'demo@example.com',
    userPassword: 'password123',
    transactionsCount: sampleTransactions.length
  };
};

// Check if run directly via CLI (e.g. `npm run seed` or `node seedData.js`)
if (require.main === module) {
  const connectDB = require('../config/db');
  
  (async () => {
    // Attempt DB connection
    const connected = await connectDB();
    try {
      await seedData();
      console.log('[Seeding CLI] Database seeding completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('[Seeding CLI ERROR] Seeding aborted:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = seedData;
