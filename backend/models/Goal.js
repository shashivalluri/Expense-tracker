const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a goal name'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Please add a target amount'],
      min: [0.01, 'Target amount must be greater than zero'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current savings cannot be negative'],
    },
    deadlineDate: {
      type: Date,
      required: [true, 'Please add a deadline date'],
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Goal', GoalSchema);
