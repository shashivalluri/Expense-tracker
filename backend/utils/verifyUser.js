const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: __dirname + '/../.env' });

const verifyUser = async () => {
  try {
    const emailArg = process.argv[2];
    
    if (!emailArg) {
      console.error('\n❌ Please provide an email address.');
      console.log('Usage: node utils/verifyUser.js <email>\n');
      process.exit(1);
    }

    const email = emailArg.toLowerCase().trim();
    const connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';
    
    console.log('\n--- Database Verification Script ---');
    console.log(`Connecting to MongoDB...`);
    
    await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB Connected successfully.');
    console.log(`Searching for user with email: "${email}"\n`);

    const user = await User.findOne({ email });

    if (user) {
      console.log('✅ User Found!\n');
      console.log('--- User Data ---');
      console.log(`ID: ${user._id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Settings:`, user.settings);
      console.log(`Created At: ${user.createdAt}`);
      console.log('-----------------\n');
    } else {
      console.log('❌ User NOT Found.');
      console.log('\nWhy did this happen?');
      console.log('1. The user never successfully registered.');
      console.log('2. The registration was saved to the offline Mock Storage instead of MongoDB (check if MongoDB was running during registration).');
      console.log('3. There is a typo in the email address.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script Error:', error.message);
    process.exit(1);
  }
};

verifyUser();
