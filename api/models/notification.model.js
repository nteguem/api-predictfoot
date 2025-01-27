const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  type: {
    type: String, 
    enum: ['general', 'device', 'group'],
    required: true
  },
  target: {
    deviceToken: { type: String },
    groupTopic: { type: String }
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;