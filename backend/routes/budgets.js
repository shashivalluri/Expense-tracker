const express = require('express');
const router = express.Router();
const {
  getBudget,
  updateBudget,
  getBudgetAlerts,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.get('/alerts/status', getBudgetAlerts);
router.route('/:month')
  .get(getBudget)
  .put(updateBudget);

module.exports = router;
