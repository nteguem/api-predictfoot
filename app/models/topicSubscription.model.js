const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TopicSubscriptionSchema = new Schema({
  topic: {
    type: String,
    required: true,
    index: true
  },
  deviceToken: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['public', 'restricted', 'premium'],
    default: 'public'
  },
  expiresAt: {
    type: Date,
    required: false
  },
  fcmUnsubscribed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

TopicSubscriptionSchema.index({ topic: 1, deviceToken: 1 }, { unique: true });
TopicSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TopicSubscription = mongoose.model('TopicSubscription', TopicSubscriptionSchema);
module.exports = TopicSubscription;