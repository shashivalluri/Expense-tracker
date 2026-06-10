const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (!process.env.MONGODB_URI) {
    console.error('[Config] MONGODB_URI is missing. Protected API routes cannot access MongoDB Atlas.');
    return res.status(503).json({
      success: false,
      error: 'Database connection is not configured yet. Please add the MONGODB_URI in Vercel and redeploy.',
    });
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_key_that_is_long_and_random'
      );

      if (decoded.type && decoded.type !== 'access') {
        return res.status(401).json({ success: false, error: 'Your session is invalid. Please log in again.' });
      }

      req.user = await User.findById(decoded.id).select(
        'id username email settings is_verified'
      );

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Your session is invalid. Please log in again.' });
      }

      if (!req.user.is_verified) {
        return res.status(403).json({ success: false, error: 'Please verify your email address before continuing.' });
      }

      next();
    } catch (error) {
      console.warn('[Auth] Session check failed:', error.message);
      return res.status(401).json({ success: false, error: 'Your session expired. Please log in again.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Please log in to continue.' });
  }
};

module.exports = { protect };
