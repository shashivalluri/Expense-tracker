const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Budget = require('../models/Budget');
const ActivityLog = require('../models/ActivityLog');
const { sendEmail } = require('../utils/email');

const ACCESS_TOKEN_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';
const REFRESH_TOKEN_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

const getAppUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  return 'http://localhost:5173';
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requireDatabase = (res) => {
  if (process.env.MONGODB_URI) return true;

  console.error('[Config] MONGODB_URI is missing. MongoDB Atlas is not configured for this deployment.');
  res.status(503).json({
    success: false,
    error: 'Database connection is not configured yet. Please add the MONGODB_URI in Vercel and redeploy.',
  });
  return false;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (id) => {
  return jwt.sign(
    { id, type: 'access' },
    process.env.JWT_SECRET || 'super_secret_jwt_key_that_is_long_and_random',
    { expiresIn: ACCESS_TOKEN_EXPIRE }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'super_secret_jwt_key_that_is_long_and_random',
    { expiresIn: REFRESH_TOKEN_EXPIRE }
  );
};

const getJwtExpiryDate = (token) => {
  const decoded = jwt.decode(token);
  return decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const safeUser = (user) => ({
  id: user._id.toHexString ? user._id.toHexString() : String(user._id),
  username: user.username,
  email: user.email,
  settings: user.settings,
  is_verified: user.is_verified,
});

const issueSession = async (user) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, {
    refresh_token_hash: hashToken(refreshToken),
    refresh_token_expiry: getJwtExpiryDate(refreshToken),
  });

  return { accessToken, refreshToken };
};

const logActivity = async (userId, actionType, description, req) => {
  const ipAddress = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
  try {
    await ActivityLog.create({
      user_id: userId,
      action_type: actionType,
      description,
      ip_address: ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to write activity log:', err.message);
  }
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${getAppUrl()}/register?email=${encodeURIComponent(user.email)}&verify=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your Budget Tracker Pro account',
    text: `Verify your Budget Tracker Pro account using this link: ${verifyUrl}`,
    html: `<p>Welcome to Budget Tracker Pro.</p><p><a href="${verifyUrl}">Verify your email address</a></p>`,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${getAppUrl()}/login?reset=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your Budget Tracker Pro password',
    text: `Reset your Budget Tracker Pro password using this link: ${resetUrl}`,
    html: `<p>Use this secure link to reset your Budget Tracker Pro password.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const username = req.body.username?.trim();
    const password = req.body.password;
    const email = req.body.email?.toLowerCase()?.trim();

    console.log(`[Auth] Registration attempt for ${email || 'missing email'} from ${req.ip}`);

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide your username, email and password.' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`[Auth] Registration blocked for duplicate email: ${email}`);
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateSecureToken();
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash: passwordHash,
      verification_token: hashToken(verificationToken),
      verification_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      is_verified: false,
    });

    // Create default budget for current month
    await Budget.create({
      user_id: user._id,
      month: currentMonth,
      total_limit: 20000,
      category_limits: {
        Food: 5000,
        Utilities: 3000,
        Entertainment: 2000,
        Transportation: 2000,
        Shopping: 4000,
        Others: 4000,
      },
    });

    // Log registration activity
    await ActivityLog.create({
      user_id: user._id,
      action_type: 'REGISTER',
      description: 'User account registered',
      ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      timestamp: new Date(),
    });

    await sendVerificationEmail(user, verificationToken);

    console.log(`[Auth] Registration succeeded for ${email} (${user._id})`);
    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('[Auth] Registration server error:', error.message);
    error.publicMessage = 'Unable to create account right now. Please try again.';
    next(error);
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const email = req.body.email?.toLowerCase()?.trim();
    const token = req.body.token || req.body.code;

    if (!email || !token) {
      return res.status(400).json({ success: false, error: 'Please provide your email and verification token.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.verification_token) {
      return res.status(400).json({ success: false, error: 'Invalid verification details.' });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, error: 'This account is already verified.' });
    }

    const tokenMatches = user.verification_token === hashToken(token);
    const tokenValid = !user.verification_expiry || user.verification_expiry > new Date();

    if (!tokenMatches || !tokenValid) {
      console.warn(`[Auth] Email verification failed for ${email}`);
      return res.status(400).json({ success: false, error: 'Invalid or expired verification link.' });
    }

    await User.findByIdAndUpdate(user._id, {
      is_verified: true,
      verification_token: null,
      verification_expiry: null,
    });

    await logActivity(user._id, 'VERIFY_EMAIL', 'User verified their email address', req);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('[Auth] Email verification server error:', error.message);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const password = req.body.password;
    const email = req.body.email?.toLowerCase()?.trim();

    console.log(`[Auth] Login attempt for ${email || 'missing email'} from ${req.ip}`);

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide your email and password.' });
    }

    // Use .select('+password_hash') — password_hash is normally excluded from queries
    const user = await User.findOne({ email }).select('+password_hash');
    if (!user) {
      console.warn(`[Auth] Login failed, account not found: ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials. Please try again.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      console.warn(`[Auth] Login failed, bad password: ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials. Please try again.' });
    }

    if (!user.is_verified) {
      console.warn(`[Auth] Login blocked, unverified email: ${email}`);
      return res.status(403).json({ success: false, error: 'Please verify your email address before logging in.' });
    }

    const { accessToken, refreshToken } = await issueSession(user);
    await logActivity(user._id, 'LOGIN', 'User logged in successfully', req);

    res.status(200).json({
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRE,
      user: safeUser(user),
    });
  } catch (error) {
    console.error('[Auth] Login server error:', error.message);
    error.publicMessage = 'Unable to log in right now. Please try again.';
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Please log in again.' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'super_secret_jwt_key_that_is_long_and_random'
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, error: 'Please log in again.' });
    }

    const user = await User.findById(decoded.id).select('+refresh_token_hash +refresh_token_expiry');
    const tokenMatches = user?.refresh_token_hash === hashToken(refreshToken);
    const tokenValid = user?.refresh_token_expiry && user.refresh_token_expiry > new Date();

    if (!user || !tokenMatches || !tokenValid || !user.is_verified) {
      console.warn(`[Auth] Refresh failed for user ${decoded.id}`);
      return res.status(401).json({ success: false, error: 'Please log in again.' });
    }

    const session = await issueSession(user);

    res.status(200).json({
      success: true,
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRE,
      user: safeUser(user),
    });
  } catch (error) {
    console.warn('[Auth] Refresh token failed:', error.message);
    return res.status(401).json({ success: false, error: 'Please log in again.' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        refresh_token_hash: null,
        refresh_token_expiry: null,
      });
      await logActivity(req.user._id, 'LOGOUT', 'User logged out', req);
    }

    res.status(200).json({ success: true, message: 'You have been logged out.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    res.status(200).json({
      success: true,
      user: safeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user settings
// @route   PUT /api/auth/settings
// @access  Private
exports.updateSettings = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const { currency, theme, language } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        settings: {
          currency: currency || req.user.settings?.currency || 'USD',
          theme: theme || req.user.settings?.theme || 'dark',
          language: language || req.user.settings?.language || 'en',
        },
      },
      { new: true }
    );

    await logActivity(req.user._id, 'UPDATE_SETTINGS', 'User settings updated', req);

    res.status(200).json({
      success: true,
      user: safeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const email = req.body.email?.toLowerCase()?.trim();
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const resetToken = generateSecureToken();
      await User.findByIdAndUpdate(user._id, {
        reset_token: hashToken(resetToken),
        reset_token_expiry: new Date(Date.now() + 30 * 60 * 1000),
      });

      await sendPasswordResetEmail(user, resetToken);
      await logActivity(user._id, 'FORGOT_PASSWORD', 'Requested password reset link', req);
      console.log(`[Auth] Password reset link issued for ${email}`);
    } else {
      console.warn(`[Auth] Password reset requested for unknown email: ${email}`);
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[Auth] Forgot password server error:', error.message);
    next(error);
  }
};

// @desc    Reset password using token
// @route   PUT /api/auth/resetpassword/:resetcode
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;

    const resetToken = req.params.resetcode || req.body.token;
    const { password } = req.body;

    if (!resetToken || !password) {
      return res.status(400).json({ success: false, error: 'Please provide your reset token and new password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findOne({
      reset_token: hashToken(resetToken),
      reset_token_expiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired recovery link.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(user._id, {
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expiry: null,
      refresh_token_hash: null,
      refresh_token_expiry: null,
    });

    await logActivity(user._id, 'RESET_PASSWORD', 'Password reset successfully', req);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now log in.',
    });
  } catch (error) {
    console.error('[Auth] Reset password server error:', error.message);
    next(error);
  }
};
