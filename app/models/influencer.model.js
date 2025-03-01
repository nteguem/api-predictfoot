const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'other'],
    required: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  referralLink: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stats: {
    clicks: {
      type: Number,
      default: 0
    },
    installs: {
      type: Number,
      default: 0
    },
    lastClickDate: Date,
    lastInstallDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Influencer', influencerSchema);