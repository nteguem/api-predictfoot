const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // Duration in days
  description: { type: String }
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
