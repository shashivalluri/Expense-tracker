const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateSettings,
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken,
  logoutUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify', verifyEmail);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.put('/settings', protect, updateSettings);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetcode', resetPassword);

module.exports = router;
