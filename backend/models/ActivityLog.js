const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action_type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    ip_address: {
      type: String,
      default: '',
    },
    // Use a custom `timestamp` field to match old Prisma schema field name
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Do NOT use built-in timestamps to avoid created_at/updated_at confusion
    // with the existing `timestamp` field used by queries and the frontend
    timestamps: false,
  }
);

activityLogSchema.index({ user_id: 1, timestamp: -1 });

activityLogSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

activityLogSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toHexString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.ActivityLog ||
  mongoose.model('ActivityLog', activityLogSchema);
