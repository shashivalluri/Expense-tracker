const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    target_amount: {
      type: Number,
      required: true,
    },
    current_amount: {
      type: Number,
      default: 0,
    },
    deadline_date: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      default: 'General',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

goalSchema.index({ user_id: 1, created_at: -1 });

goalSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

goalSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toHexString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
