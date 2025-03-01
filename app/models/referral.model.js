const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  clickTimestamp: {
    type: Number,
    required: true
  },
  installTimestamp: {
    type: Number,
    required: true
  },
  referrerUrl: {
    type: String,
    required: true
  },
  utm_source: String,
  utm_medium: String,
  utm_campaign: String,
  utm_content: String,
  utm_term: String,
  deviceInfo: {
    manufacturer: String,
    model: String,
    osVersion: String,
    appVersion: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Referral', referralSchema);