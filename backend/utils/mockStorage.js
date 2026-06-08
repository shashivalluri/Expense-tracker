const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbPath = (process.env.VERCEL || process.env.NOW_BUILDER || __dirname.includes('/var/task') || __dirname.includes('\\var\\task'))
  ? path.join('/tmp', 'mockDB.json')
  : path.join(__dirname, '..', 'data', 'mockDB.json');

// Ensure directory exists
const ensureDbExists = () => {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      const initialData = {
        users: [],
        transactions: [],
        budgets: [],
        goals: [],
        activitylogs: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn(`[mockStorage] Failed to initialize mock database at ${dbPath}: ${err.message}`);
    // Fall back to /tmp if write or mkdir failed (e.g. read-only filesystem on Vercel)
    if (dbPath !== path.join('/tmp', 'mockDB.json')) {
      console.warn(`[mockStorage] Falling back to /tmp/mockDB.json`);
      dbPath = path.join('/tmp', 'mockDB.json');
      ensureDbExists(); // Recursively retry with fallback path
    } else {
      console.error(`[mockStorage] Fatal: /tmp/mockDB.json is also not writable!`);
    }
  }
};

const readDB = () => {
  ensureDbExists();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading mock DB', err);
    return { users: [], transactions: [], budgets: [], goals: [], activitylogs: [] };
  }
};

const writeDB = (data) => {
  ensureDbExists();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing mock DB', err);
  }
};

// Unique ID helper
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const mockStorage = {
  // --- USERS ---
  users: {
    find: () => {
      const db = readDB();
      return db.users;
    },
    findById: (id) => {
      const db = readDB();
      return db.users.find(u => u._id === id);
    },
    findOne: (query) => {
      const db = readDB();
      return db.users.find(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      });
    },
    create: async (userData) => {
      const db = readDB();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const newUser = {
        _id: generateId(),
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        settings: {
          currency: 'INR',
          theme: 'dark',
          language: 'en',
          ...userData.settings
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.users.push(newUser);
      writeDB(db);
      return newUser;
    },
    findByIdAndUpdate: (id, updateData) => {
      const db = readDB();
      const userIndex = db.users.findIndex(u => u._id === id);
      if (userIndex === -1) return null;
      db.users[userIndex] = {
        ...db.users[userIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeDB(db);
      return db.users[userIndex];
    }
  },

  // --- TRANSACTIONS ---
  transactions: {
    find: (filter = {}) => {
      const db = readDB();
      let list = db.transactions;
      if (filter.userId) list = list.filter(t => t.userId === filter.userId);
      return list;
    },
    create: (transactionData) => {
      const db = readDB();
      const newTransaction = {
        _id: generateId(),
        ...transactionData,
        date: transactionData.date ? new Date(transactionData.date).toISOString() : new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.transactions.push(newTransaction);
      writeDB(db);
      return newTransaction;
    },
    findById: (id) => {
      const db = readDB();
      return db.transactions.find(t => t._id === id);
    },
    findByIdAndUpdate: (id, updateData) => {
      const db = readDB();
      const index = db.transactions.findIndex(t => t._id === id);
      if (index === -1) return null;
      db.transactions[index] = {
        ...db.transactions[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeDB(db);
      return db.transactions[index];
    },
    findByIdAndDelete: (id) => {
      const db = readDB();
      const index = db.transactions.findIndex(t => t._id === id);
      if (index === -1) return null;
      const deleted = db.transactions.splice(index, 1)[0];
      writeDB(db);
      return deleted;
    },
    deleteMany: (filter = {}) => {
      const db = readDB();
      let beforeCount = db.transactions.length;
      if (filter.userId) {
        db.transactions = db.transactions.filter(t => t.userId !== filter.userId);
      }
      writeDB(db);
      return { deletedCount: beforeCount - db.transactions.length };
    }
  },

  // --- BUDGETS ---
  budgets: {
    find: (filter = {}) => {
      const db = readDB();
      let list = db.budgets;
      if (filter.userId) list = list.filter(b => b.userId === filter.userId);
      return list;
    },
    findOne: (filter = {}) => {
      const db = readDB();
      return db.budgets.find(b => {
        for (let key in filter) {
          if (b[key] !== filter[key]) return false;
        }
        return true;
      });
    },
    create: (budgetData) => {
      const db = readDB();
      const newBudget = {
        _id: generateId(),
        categoryLimits: {},
        ...budgetData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.budgets.push(newBudget);
      writeDB(db);
      return newBudget;
    },
    findByIdAndUpdate: (id, updateData) => {
      const db = readDB();
      const index = db.budgets.findIndex(b => b._id === id);
      if (index === -1) return null;
      db.budgets[index] = {
        ...db.budgets[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeDB(db);
      return db.budgets[index];
    },
    deleteMany: (filter = {}) => {
      const db = readDB();
      let beforeCount = db.budgets.length;
      if (filter.userId) {
        db.budgets = db.budgets.filter(b => b.userId !== filter.userId);
      }
      writeDB(db);
      return { deletedCount: beforeCount - db.budgets.length };
    }
  },

  // --- GOALS ---
  goals: {
    find: (filter = {}) => {
      const db = readDB();
      let list = db.goals;
      if (filter.userId) list = list.filter(g => g.userId === filter.userId);
      return list;
    },
    create: (goalData) => {
      const db = readDB();
      const newGoal = {
        _id: generateId(),
        currentAmount: 0,
        ...goalData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.goals.push(newGoal);
      writeDB(db);
      return newGoal;
    },
    findById: (id) => {
      const db = readDB();
      return db.goals.find(g => g._id === id);
    },
    findByIdAndUpdate: (id, updateData) => {
      const db = readDB();
      const index = db.goals.findIndex(g => g._id === id);
      if (index === -1) return null;
      db.goals[index] = {
        ...db.goals[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeDB(db);
      return db.goals[index];
    },
    findByIdAndDelete: (id) => {
      const db = readDB();
      const index = db.goals.findIndex(g => g._id === id);
      if (index === -1) return null;
      const deleted = db.goals.splice(index, 1)[0];
      writeDB(db);
      return deleted;
    },
    deleteMany: (filter = {}) => {
      const db = readDB();
      let beforeCount = db.goals.length;
      if (filter.userId) {
        db.goals = db.goals.filter(g => g.userId !== filter.userId);
      }
      writeDB(db);
      return { deletedCount: beforeCount - db.goals.length };
    }
  },

  // --- ACTIVITY LOGS ---
  activitylogs: {
    find: (filter = {}) => {
      const db = readDB();
      let list = db.activitylogs;
      if (filter.userId) list = list.filter(a => a.userId === filter.userId);
      return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    create: (logData) => {
      const db = readDB();
      const newLog = {
        _id: generateId(),
        ...logData,
        timestamp: new Date().toISOString()
      };
      db.activitylogs.push(newLog);
      writeDB(db);
      return newLog;
    },
    deleteMany: (filter = {}) => {
      const db = readDB();
      let beforeCount = db.activitylogs.length;
      if (filter.userId) {
        db.activitylogs = db.activitylogs.filter(a => a.userId !== filter.userId);
      }
      writeDB(db);
      return { deletedCount: beforeCount - db.activitylogs.length };
    }
  },
  
  // Clear all mock data for seed
  clearAll: (userId) => {
    const db = readDB();
    db.transactions = db.transactions.filter(t => t.userId !== userId);
    db.budgets = db.budgets.filter(b => b.userId !== userId);
    db.goals = db.goals.filter(g => g.userId !== userId);
    db.activitylogs = db.activitylogs.filter(a => a.userId !== userId);
    writeDB(db);
  }
};

module.exports = mockStorage;
