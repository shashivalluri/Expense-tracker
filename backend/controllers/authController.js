const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Budget = require('../models/Budget');
const ActivityLog = require('../models/ActivityLog');
const mockStorage = require('../utils/mockStorage');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_that_is_long_and_random', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Helper to log user activities
const logActivity = async (userId, actionType, description, req) => {
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
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

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    // ✅ FIX: Always normalize email — lowercase + trim
    const email = req.body.email?.toLowerCase()?.trim();

    console.log(`[Auth] REGISTER attempt: ${email}`);

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide your name, email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const dbConnected = mongoose.connection.readyState === 1;
    let user;

    if (dbConnected) {
      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        console.warn(`[Auth] REGISTER failed: Email ${email} already registered`);
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      user = await User.create({ username, email, password });
      console.log(`[Auth] REGISTER success: User created with id ${user._id}`);
      
      // Create a default monthly budget for the current month
      const currentMonth = new Date().toISOString().substring(0, 7);
      await Budget.create({
        userId: user._id,
        month: currentMonth,
        totalLimit: 20000,
        categoryLimits: {
          Food: 5000,
          Utilities: 3000,
          Entertainment: 2000,
          Transportation: 2000,
          Shopping: 4000,
          Others: 4000
        }
      });

    } else {
      // Offline fallback
      const userExists = mockStorage.users.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      user = await mockStorage.users.create({ username, email, password });
      console.log(`[Auth] REGISTER success (mock): User created with id ${user._id}`);
      
      // Create default budget
      const currentMonth = new Date().toISOString().substring(0, 7);
      mockStorage.budgets.create({
        userId: user._id,
        month: currentMonth,
        totalLimit: 20000,
        categoryLimits: {
          Food: 5000,
          Utilities: 3000,
          Entertainment: 2000,
          Transportation: 2000,
          Shopping: 4000,
          Others: 4000
        }
      });
    }

    await logActivity(user._id, 'REGISTER', 'User account registered', req);
    const token = generateToken(user._id);
    console.log(`[Auth] JWT issued for user ${user._id}`);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('[Auth] REGISTER error:', error.message);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
  try {
    const { password } = req.body;
    // ✅ FIX: Always normalize email — lowercase + trim
    const email = req.body.email?.toLowerCase()?.trim();

    console.log("Login Email:", email);
    console.log("Mongo Connected:", mongoose.connection.readyState);

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide your email and password' });
    }

    const dbConnected = mongoose.connection.readyState === 1;
    let user;
    let isMatch = false;

    if (dbConnected) {
      user = await User.findOne({ email }).select('+password');
      console.log(`[Auth] DB lookup for ${email}: ${user ? 'Found' : 'Not found'}`);
      if (user) {
        isMatch = await user.matchPassword(password);
        console.log(`[Auth] Password match for ${email}: ${isMatch}`);
      }
    } else {
      user = mockStorage.users.findOne({ email });
      console.log(`[Auth] Mock lookup for ${email}: ${user ? 'Found' : 'Not found'}`);
      if (user) {
        const bcrypt = require('bcryptjs');
        isMatch = await bcrypt.compare(password, user.password);
        console.log(`[Auth] Mock password match: ${isMatch}`);
      }
    }

    console.log("User Found:", user);

    if (!user) {
      console.warn(`[Auth] LOGIN failed: No account found for ${email}`);
      return res.status(401).json({ success: false, error: 'Email not registered. Create an account first.' });
    }

    if (!isMatch) {
      console.warn(`[Auth] LOGIN failed: Wrong password for ${email}`);
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    await logActivity(user._id, 'LOGIN', 'User logged in successfully', req);
    const token = generateToken(user._id);
    console.log(`[Auth] LOGIN success: JWT issued for ${email} (id: ${user._id})`);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('[Auth] LOGIN error:', error.message);
    next(error);
  }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        settings: req.user.settings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile settings
// @route   PUT /api/auth/settings
// @access  Private
exports.updateSettings = async (req, res, next) => {
  try {
    const { currency, theme, language } = req.body;
    const dbConnected = mongoose.connection.readyState === 1;
    let updatedUser;

    const newSettings = {
      currency: currency || req.user.settings?.currency || 'USD',
      theme: theme || req.user.settings?.theme || 'dark',
      language: language || req.user.settings?.language || 'en',
    };

    if (dbConnected) {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { settings: newSettings },
        { new: true, runValidators: true }
      );
    } else {
      updatedUser = mockStorage.users.findByIdAndUpdate(req.user._id, {
        settings: newSettings
      });
    }

    await logActivity(req.user._id, 'UPDATE_SETTINGS', 'User settings updated', req);

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        settings: updatedUser.settings
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide an email' });
    }

    const dbConnected = mongoose.connection.readyState === 1;
    let user;

    if (dbConnected) {
      user = await User.findOne({ email });
    } else {
      user = mockStorage.users.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'There is no user with that email' });
    }

    // Generate a simple raw reset token (no complex hashing, keep it beginner friendly!)
    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expireTime = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    if (dbConnected) {
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpire = expireTime;
      await user.save();
    } else {
      mockStorage.users.findByIdAndUpdate(user._id, {
        resetPasswordToken: resetToken,
        resetPasswordExpire: expireTime
      });
    }

    await logActivity(user._id, 'FORGOT_PASSWORD', 'Requested password reset token', req);

    // Return the token to the user inside the response. Since we aren't configured with a live SMTP mail server by default, this ensures a flawless developer testing flow where the user sees the token immediately on screen!
    res.status(200).json({
      success: true,
      message: 'Password reset code generated.',
      resetCode: resetToken, // Hand-off code immediately to React form
      instructions: 'Enter this verification code into the password reset screen along with your new password.'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resetcode
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetcode } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Please provide a new password' });
    }

    const dbConnected = mongoose.connection.readyState === 1;
    let user;

    if (dbConnected) {
      user = await User.findOne({
        resetPasswordToken: resetcode,
        resetPasswordExpire: { $gt: Date.now() },
      });
    } else {
      const users = mockStorage.users.find();
      user = users.find(u => u.resetPasswordToken === resetcode && u.resetPasswordExpire > Date.now());
    }

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired recovery code' });
    }

    if (dbConnected) {
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
    } else {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      mockStorage.users.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpire: undefined
      });
    }

    await logActivity(user._id, 'RESET_PASSWORD', 'Password reset successfully', req);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully! You can now log in.'
    });

  } catch (error) {
    next(error);
  }
};
