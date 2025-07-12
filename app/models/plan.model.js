const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  description: String,
  description_html: String,
  position: { type: Number, required: true },
  currency: { type: String, required: true, default: 'XAF' }
}, { timestamps: true });

planSchema.index({ name: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('Plan', planSchema);
