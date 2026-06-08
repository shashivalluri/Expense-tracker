const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all goals routes

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/:id')
  .put(updateGoal)
  .delete(deleteGoal);

router.post('/:id/contribute', contributeToGoal);

module.exports = router;
