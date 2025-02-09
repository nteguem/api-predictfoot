const mongoose = require('mongoose');
const User = require('./user.model');
const Plan = require('./plan.model');
const Transaction = require('./transaction.model');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: User, required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: Plan, required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: Transaction, required: true }, 
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
