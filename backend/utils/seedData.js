const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const ActivityLog = require('../models/ActivityLog');

// Load environment variables if running directly
dotenv.config();

const categories = {
  income: ['Salary', 'Freelance', 'Investments', 'Refunds', 'Others'],
  expense: ['Food', 'Utilities', 'Entertainment', 'Transportation', 'Shopping', 'Savings', 'Others'],
};

const seedData = async (targetUserId = null) => {
  // Ensure DB is connected (safe to call multiple times — cached)
  await connectDB();

  console.log('[Seeding] Seeding starting. Mode: Mongoose MongoDB Atlas');

  let userId = targetUserId;
  let demoUser = null;

  // 1. Create or verify Demo User if no target specified
  if (!userId) {
    const demoEmail = 'demo@example.com';
    const demoPassword = 'password123';

    demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      console.log('[Seeding] Creating demo user...');
      const hashedPassword = await bcrypt.hash(demoPassword, 10);

      demoUser = await User.create({
        username: 'Demo User',
        email: demoEmail,
        password_hash: hashedPassword,
        is_verified: true,
        settings: {
          currency: 'INR',
          theme: 'dark',
          language: 'en',
        },
      });
    }
    userId = demoUser._id;
  }

  console.log(`[Seeding] Injecting data for user: ${userId}`);

  // 2. Clear previous data
  await Transaction.deleteMany({ user_id: userId });
  await Budget.deleteMany({ user_id: userId });
  await Goal.deleteMany({ user_id: userId });
  await ActivityLog.deleteMany({ user_id: userId });

  // 3. Setup monthly Budgets for last month, this month, and next month
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  const budgetList = [
    {
      user_id: userId,
      month: lastMonthKey,
      total_limit: 55000,
      category_limits: { Food: 12000, Utilities: 8000, Entertainment: 7000, Transportation: 6000, Shopping: 12000, Others: 10000 },
    },
    {
      user_id: userId,
      month: currentMonthKey,
      total_limit: 50000,
      category_limits: { Food: 12000, Utilities: 8000, Entertainment: 5000, Transportation: 5000, Shopping: 10000, Others: 10000 },
    },
    {
      user_id: userId,
      month: nextMonthKey,
      total_limit: 50000,
      category_limits: { Food: 12000, Utilities: 8000, Entertainment: 5000, Transportation: 5000, Shopping: 10000, Others: 10000 },
    },
  ];

  await Budget.insertMany(budgetList);

  // 4. Setup Savings Goals
  const targetGoals = [
    {
      user_id: userId,
      name: 'Emergency Fund',
      target_amount: 300000,
      current_amount: 120000,
      deadline_date: new Date(today.getFullYear(), today.getMonth() + 6, 15),
      category: 'Savings',
      notes: '6 months of living expenses tucked away in a liquid savings account.',
    },
    {
      user_id: userId,
      name: 'Goa Beach Vacation',
      target_amount: 60000,
      current_amount: 18000,
      deadline_date: new Date(today.getFullYear() + 1, 5, 20),
      category: 'Travel',
      notes: 'Flights, resort stay, food and activities for 10 days in North Goa.',
    },
    {
      user_id: userId,
      name: 'MacBook Pro M4',
      target_amount: 180000,
      current_amount: 140000,
      deadline_date: new Date(today.getFullYear(), today.getMonth() + 2, 10),
      category: 'Electronics',
      notes: 'MacBook Pro 14" M4 Pro for design and development workspace.',
    },
  ];

  await Goal.insertMany(targetGoals);

  // 5. Generate historical transactions spanning the past 90 days
  const sampleTransactions = [];

  for (let d = 90; d >= 0; d--) {
    const txDate = new Date();
    txDate.setDate(today.getDate() - d);
    const dayOfMonth = txDate.getDate();
    const dayOfWeek = txDate.getDay();

    if (dayOfMonth === 1) {
      sampleTransactions.push({ user_id: userId, type: 'income', amount: 75000, category: 'Salary', date: new Date(txDate), description: 'Monthly Salary Credited', note: 'Primary corporate employment bank deposit.', is_recurring: false, recurrence_interval: 'none' });
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: 18000, category: 'Utilities', date: new Date(txDate), description: 'Apartment Monthly Rent', note: 'Monthly rent transfer to landlord.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfMonth === 5) {
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: 999, category: 'Utilities', date: new Date(txDate), description: 'JioFiber Broadband Plan', note: 'Monthly high-speed fiber internet billing.', is_recurring: false, recurrence_interval: 'none' });
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: 1499, category: 'Entertainment', date: new Date(txDate), description: 'Cult.fit Gym Membership', note: 'Monthly fitness center subscription.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfMonth === 15) {
      sampleTransactions.push({ user_id: userId, type: 'income', amount: 22000, category: 'Freelance', date: new Date(txDate), description: 'UI/UX Design Freelance Project', note: 'Client payment for dashboard design contract.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfMonth === 25) {
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: 649, category: 'Entertainment', date: new Date(txDate), description: 'Netflix Premium Subscription', note: '4K Ultra HD family plan streaming.', is_recurring: false, recurrence_interval: 'none' });
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: 119, category: 'Entertainment', date: new Date(txDate), description: 'Spotify Premium Streaming', note: 'Music streaming monthly fee.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfWeek === 2 || dayOfWeek === 6) {
      const amt = Math.round((800 + Math.random() * 600) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Food', date: new Date(txDate), description: dayOfWeek === 2 ? 'BigBasket Grocery Order' : 'DMart Weekly Shopping', note: 'Weekly kitchen restocking.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfMonth % 3 === 0) {
      const amt = Math.round((80 + Math.random() * 220) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Food', date: new Date(txDate), description: 'Cafe Coffee Day / Chai Point', note: 'Quick morning work fuel.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfMonth % 4 === 1) {
      const amt = Math.round((400 + Math.random() * 800) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Food', date: new Date(txDate), description: 'Zomato / Swiggy Restaurant Order', note: 'Evening dining or food delivery.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfWeek === 1) {
      const amt = Math.round((2500 + Math.random() * 1000) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Transportation', date: new Date(txDate), description: 'BPCL Petrol Station', note: 'Vehicle fuel refill.', is_recurring: false, recurrence_interval: 'none' });
    }

    if ((dayOfWeek === 5 || dayOfWeek === 6) && dayOfMonth % 2 === 0) {
      const amt = Math.round((200 + Math.random() * 300) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Transportation', date: new Date(txDate), description: 'Ola / Uber Ride', note: 'Friday night cab ride.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfWeek === 0 && dayOfMonth % 6 === 0) {
      const amt = Math.round((1500 + Math.random() * 2500) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Shopping', date: new Date(txDate), description: 'Amazon / Flipkart Purchase', note: 'Household accessories and books.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfWeek === 6 && dayOfMonth % 5 === 0) {
      const amt = Math.round((500 + Math.random() * 400) * 100) / 100;
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: amt, category: 'Entertainment', date: new Date(txDate), description: 'PVR / INOX Movie Night', note: 'Tickets, popcorn and beverages.', is_recurring: false, recurrence_interval: 'none' });
    }

    if (dayOfMonth === 10 || dayOfMonth === 20) {
      sampleTransactions.push({ user_id: userId, type: 'expense', amount: 5000, category: 'Savings', date: new Date(txDate), description: 'Savings Transfer: Emergency Fund', note: 'Regular scheduled savings deposit.', is_recurring: false, recurrence_interval: 'none' });
    }
  }

  // Recurring Netflix subscription entry
  const nextNetflixDate = new Date();
  nextNetflixDate.setDate(today.getDate() + 7);
  sampleTransactions.push({
    user_id: userId,
    type: 'expense',
    amount: 649,
    category: 'Entertainment',
    date: new Date(),
    description: 'Netflix Subscription Premium',
    note: 'Parent recurring subscription tracking.',
    is_recurring: true,
    recurrence_interval: 'monthly',
    next_occurrence: nextNetflixDate,
  });

  await Transaction.insertMany(sampleTransactions);

  // 6. Log historical activity seeds
  const sampleLogs = [
    { user_id: userId, action_type: 'REGISTER', description: 'Account created and initialized successfully.', timestamp: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000) },
    { user_id: userId, action_type: 'CREATE_BUDGET', description: 'Setup budget configuration: ₹50,000 total monthly limit.', timestamp: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000) },
    { user_id: userId, action_type: 'CREATE_GOAL', description: 'Defined saving targets: "Emergency Fund", "Goa Vacation", and "MacBook Pro M4".', timestamp: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000) },
    { user_id: userId, action_type: 'SEED_DATA', description: 'Injected 3 months of dynamic testing ledger history.', timestamp: new Date() },
  ];

  await ActivityLog.insertMany(sampleLogs);

  console.log(`[Seeding] Success! Injected ${sampleTransactions.length} transactions, ${budgetList.length} monthly budgets, ${targetGoals.length} savings goals, and audit trails.`);

  return {
    success: true,
    userEmail: 'demo@example.com',
    userPassword: 'password123',
    transactionsCount: sampleTransactions.length,
  };
};

// Check if run directly via CLI (e.g. `npm run seed` or `node utils/seedData.js`)
if (require.main === module) {
  (async () => {
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
