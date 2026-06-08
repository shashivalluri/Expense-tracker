const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';
    
    console.log(`[Database] Attempting connection to: ${connString.replace(/:([^@]+)@/, ':****@')}`);
    
    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });

    console.log(`[Database] Connected successfully to MongoDB: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`\n[Database WARNING] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database WARNING] The application will fall back to In-Memory JSON storage mode.`);
    console.warn(`[Database WARNING] You do not need MongoDB active to test this! All CRUD actions will work dynamically.\n`);
    return false;
  }
};

module.exports = connectDB;
