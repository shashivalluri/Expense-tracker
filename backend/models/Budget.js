const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String, // "YYYY-MM"
      required: true,
    },
    total_limit: {
      type: Number,
      required: true,
      default: 2000,
    },
    category_limits: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Unique compound index — one budget per user per month
budgetSchema.index({ user_id: 1, month: 1 }, { unique: true });

budgetSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

budgetSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toHexString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
