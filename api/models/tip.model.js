const mongoose = require('mongoose');

const TipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  isVip: { type: Boolean, default: true },
  tipDate: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true
});

const Tip = mongoose.model('Tip', TipSchema);

module.exports = Tip;
