const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: { currency: 'USD', theme: 'dark', language: 'en' },
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    verification_token: {
      type: String,
      default: null,
    },
    verification_expiry: {
      type: Date,
      default: null,
    },
    reset_token: {
      type: String,
      default: null,
    },
    reset_token_expiry: {
      type: Date,
      default: null,
    },
    refresh_token_hash: {
      type: String,
      default: null,
    },
    refresh_token_expiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Virtual — expose `id` as a string (mirrors Prisma's uuid string id)
userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toHexString();
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    delete ret.verification_token;
    delete ret.reset_token;
    delete ret.refresh_token_hash;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
