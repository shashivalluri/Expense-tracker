const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateSettings,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/settings', protect, updateSettings);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetcode', resetPassword);

module.exports = router;
