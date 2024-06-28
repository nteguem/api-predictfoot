const mongoose = require('mongoose');
const User = require('./user.model');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String,required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: User, required: true }],
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
