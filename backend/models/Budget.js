const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String, // Stored as "YYYY-MM" format (e.g. "2026-06")
      required: true,
    },
    totalLimit: {
      type: Number,
      required: [true, 'Please add a total budget limit'],
      min: [0, 'Limit cannot be negative'],
    },
    categoryLimits: {
      type: Map,
      of: Number,
      default: {}, // Maps categories like 'Food' to their limit numbers
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user can only have one budget schema per month
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
