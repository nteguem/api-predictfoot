const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  functionName: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  type: {
    type: String,
    enum: ['error', 'info', 'warning'],
    default: 'info',
  },
  resolved: {
    type: Boolean,
    default: false,  
  },
});

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
