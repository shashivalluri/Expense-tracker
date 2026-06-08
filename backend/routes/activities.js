const express = require('express');
const router = express.Router();
const {
  getActivityLogs,
  clearActivityLogs,
} = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure logs route

router.route('/')
  .get(getActivityLogs)
  .delete(clearActivityLogs);

module.exports = router;
