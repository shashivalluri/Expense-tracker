const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config({ path: `${__dirname}/../.env` });

const verifyUser = async () => {
  try {
    const emailArg = process.argv[2];

    if (!emailArg) {
      console.error('\nPlease provide an email address.');
      console.log('Usage: node utils/verifyUser.js <email>\n');
      process.exit(1);
    }

    const email = emailArg.toLowerCase().trim();

    await connectDB();

    console.log('\n--- MongoDB Atlas User Verification ---');
    console.log(`Searching for user with email: "${email}"\n`);

    const user = await User.findOne({ email }).select(
      'username email settings is_verified created_at'
    );

    if (user) {
      console.log('User found.\n');
      console.log('--- User Data ---');
      console.log(`ID: ${user._id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Verified: ${user.is_verified}`);
      console.log('Settings:', user.settings);
      console.log(`Created At: ${user.created_at}`);
      console.log('-----------------\n');
    } else {
      console.log('User not found. Check that registration completed and the email address is correct.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nScript error:', error.message);
    process.exit(1);
  }
};

verifyUser();
